// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from './generated/rpc.js'
import { assert, keyToId, noop } from './utils.js'
import HashMap from './lib/hashmap.js'
import timingSafeEqual from './lib/timing-safe-equal.js'

// There are three slightly different invite types:
//
// - InviteRpcMessage comes from the protobuf.
// - InviteInternal adds a locally-generated receive timestamp.
// - Invite is the externally-facing type.

/**
 * @internal
 * @typedef {import('./generated/rpc.js').Invite} InviteRpcMessage
 */

/**
 * @internal
 * @typedef {InviteRpcMessage & { receivedAt: number }} InviteInternal
 */

/** @typedef {import('./types.js').MapBuffers<InviteInternal>} Invite */

/**
 * @typedef {(
 *  'accepted' |
 *  'rejected' |
 *  'canceled' |
 *  'accepted other' |
 *  'connection error' |
 *  'internal error'
 * )} InviteRemovalReason
 */

/**
 * @internal
 * @typedef {import('./generated/rpc.js').InviteCancel} InviteCancel
 */

/**
 * @internal
 * @typedef {import('./generated/rpc.js').ProjectJoinDetails} ProjectJoinDetails
 */

/**
 * Manage pending invite state.
 */
class PendingInvites {
  /**
   * @internal
   * @typedef {object} PendingInvite
   * @prop {string} peerId
   * @prop {InviteInternal} invite
   * @prop {boolean} isAccepting
   */

  /** @type {HashMap<Buffer, PendingInvite>} */
  #byInviteId = new HashMap(keyToId)

  /**
   * @returns {Iterable<PendingInvite>} the pending invites, in insertion order
   */
  invites() {
    return this.#byInviteId.values()
  }

  /**
   * @param {PendingInvite} pendingInvite
   * @throws if adding a duplicate invite ID
   * @returns {void}
   */
  add(pendingInvite) {
    const {
      invite: { inviteId },
    } = pendingInvite
    assert(!this.#byInviteId.has(inviteId), 'Added duplicate invite')
    this.#byInviteId.set(inviteId, pendingInvite)
  }

  /**
   * @param {Buffer} inviteId
   * @returns {void}
   */
  markAccepting(inviteId) {
    const pendingInvite = this.#byInviteId.get(inviteId)
    assert(
      !!pendingInvite,
      `Couldn't find invite for ${inviteId.toString('hex')}`
    )
    this.#byInviteId.set(inviteId, { ...pendingInvite, isAccepting: true })
  }

  /**
   * @param {Buffer} inviteId
   * @returns {boolean}
   */
  hasInviteId(inviteId) {
    return this.#byInviteId.has(inviteId)
  }

  /**
   * @param {string} projectPublicId
   * @returns {boolean}
   */
  isAcceptingForProject(projectPublicId) {
    for (const { invite, isAccepting } of this.invites()) {
      if (isAccepting && invite.projectPublicId === projectPublicId) return true
    }
    return false
  }

  /**
   * @param {Buffer} inviteId
   * @returns {undefined | PendingInvite}
   */
  getByInviteId(inviteId) {
    return this.#byInviteId.get(inviteId)
  }

  /**
   * @param {Buffer} inviteId
   * @returns {boolean} `true` if an invite existed and was deleted, `false` otherwise
   */
  deleteByInviteId(inviteId) {
    return this.#byInviteId.delete(inviteId)
  }

  /**
   * @param {string} projectPublicId
   * @returns {PendingInvite[]} the pending invites that were deleted
   */
  deleteByProjectPublicId(projectPublicId) {
    /** @type {PendingInvite[]} */
    const result = []

    for (const pendingInvite of this.invites()) {
      if (pendingInvite.invite.projectPublicId === projectPublicId) {
        result.push(pendingInvite)
      }
    }

    for (const { invite } of result) this.deleteByInviteId(invite.inviteId)

    return result
  }
}

/**
 * @typedef {Object} InviteApiEvents
 * @property {(invite: Invite) => void} invite-received
 * @property {(invite: Invite, removalReason: InviteRemovalReason) => void} invite-removed
 */

/**
 * @extends {TypedEmitter<InviteApiEvents>}
 */
export class InviteApi extends TypedEmitter {
  #isMember
  #addProject
  #pendingInvites = new PendingInvites()

  /**
   * @param {Object} options
   * @param {import('./local-peers.js').LocalPeers} options.rpc
   * @param {object} options.queries
   * @param {(projectId: string) => boolean} options.queries.isMember
   * @param {(projectDetails: Pick<ProjectJoinDetails, 'projectKey' | 'encryptionKeys'> & { projectName: string }) => Promise<unknown>} options.queries.addProject
   */
  constructor({ rpc, queries }) {
    super()
    this.rpc = rpc
    this.#isMember = queries.isMember
    this.#addProject = queries.addProject

    this.rpc.on('invite', (...args) => {
      try {
        this.#handleInviteRpcMessage(...args)
      } catch (err) {
        console.error('Error handling invite', err)
      }
    })

    this.rpc.on('invite-cancel', (_peerId, inviteCancel) => {
      try {
        this.#handleInviteCancel(inviteCancel)
      } catch (err) {
        console.error('Error handling invite cancel', err)
      }
    })
  }

  /**
   * @param {string} peerId
   * @param {InviteRpcMessage} inviteRpcMessage
   */
  #handleInviteRpcMessage(peerId, inviteRpcMessage) {
    const invite = { ...inviteRpcMessage, receivedAt: Date.now() }

    const isAlreadyMember = this.#isMember(invite.projectPublicId)
    if (isAlreadyMember) {
      this.rpc
        .sendInviteResponse(peerId, {
          decision: InviteResponse_Decision.ALREADY,
          inviteId: invite.inviteId,
        })
        .catch(noop)
      return
    }

    const hasAlreadyReceivedThisInvite = this.#pendingInvites.hasInviteId(
      invite.inviteId
    )
    if (hasAlreadyReceivedThisInvite) {
      return
    }

    this.#pendingInvites.add({ peerId, invite, isAccepting: false })
    this.emit('invite-received', internalToExternal(invite))
  }

  /**
   * @param {InviteCancel} inviteCancel
   */
  #handleInviteCancel(inviteCancel) {
    const { inviteId } = inviteCancel

    const pendingInvite = this.#pendingInvites.getByInviteId(inviteId)
    if (!pendingInvite) {
      return
    }
    const { invite, isAccepting } = pendingInvite

    if (isAccepting) {
      return
    }

    this.#pendingInvites.deleteByInviteId(inviteId)
    this.emit('invite-removed', internalToExternal(invite), 'canceled')
  }

  /**
   * @returns {Array<Invite>}
   */
  getPending() {
    return [...this.#pendingInvites.invites()].map(({ invite }) =>
      internalToExternal(invite)
    )
  }

  /**
   * Attempt to accept the invite.
   *
   * This can fail if the invitor has canceled the invite or if you cannot
   * connect to the invitor's device.
   *
   * If the invite is accepted and you had other invites to the same project,
   * those invites are removed, and the invitors are told that you're already
   * part of this project.
   *
   * @param {Pick<Invite, 'inviteId'>} invite
   * @returns {Promise<string>}
   */
  async accept({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const pendingInvite = this.#pendingInvites.getByInviteId(inviteId)
    if (!pendingInvite) {
      throw new Error(`Cannot find invite ID ${inviteIdString}`)
    }

    const { peerId, invite } = pendingInvite
    const { projectName, projectPublicId } = invite

    /** @param {InviteRemovalReason} removalReason */
    const removePendingInvite = (removalReason) => {
      const didDelete = this.#pendingInvites.deleteByInviteId(inviteId)
      if (didDelete) {
        this.emit('invite-removed', internalToExternal(invite), removalReason)
      }
    }

    // This is probably impossible in the UI, but it's theoretically possible
    // to join a project while an invite is pending, so we need to check this.
    const isAlreadyMember = this.#isMember(projectPublicId)
    if (isAlreadyMember) {
      const pendingInvitesDeleted =
        this.#pendingInvites.deleteByProjectPublicId(projectPublicId)
      for (const pendingInvite of pendingInvitesDeleted) {
        this.rpc
          .sendInviteResponse(pendingInvite.peerId, {
            decision: InviteResponse_Decision.ALREADY,
            inviteId: pendingInvite.invite.inviteId,
          })
          .catch(noop)
        this.emit(
          'invite-removed',
          internalToExternal(pendingInvite.invite),
          'accepted'
        )
      }
      return projectPublicId
    }

    assert(
      !this.#pendingInvites.isAcceptingForProject(projectPublicId),
      `Cannot double-accept invite for project ${projectPublicId}`
    )
    this.#pendingInvites.markAccepting(inviteId)

    const projectDetailsAbortController = new AbortController()

    const projectDetailsPromise =
      /** @type {typeof pEvent<'got-project-details', [string, ProjectJoinDetails]>} */ (
        pEvent
      )(this.rpc, 'got-project-details', {
        multiArgs: true,
        filter: ([projectDetailsPeerId, details]) =>
          // This peer ID check is probably superfluous because the invite ID
          // should be unguessable, but might be useful if someone forwards an
          // invite message (or if there's an unforeseen bug).
          timingSafeEqual(projectDetailsPeerId, peerId) &&
          timingSafeEqual(inviteId, details.inviteId),
        signal: projectDetailsAbortController.signal,
      })
        .then((args) => args?.[1])
        .catch(noop)

    try {
      await this.rpc.sendInviteResponse(peerId, {
        decision: InviteResponse_Decision.ACCEPT,
        inviteId,
      })
    } catch (e) {
      projectDetailsAbortController.abort()
      removePendingInvite('connection error')
      throw new Error('Could not accept invite: Peer disconnected')
    }

    try {
      const details = await projectDetailsPromise
      assert(details, 'Expected project details')
      await this.#addProject({ ...details, projectName })
    } catch (e) {
      removePendingInvite('internal error')
      throw new Error('Failed to join project')
    }

    const pendingInvitesDeleted =
      this.#pendingInvites.deleteByProjectPublicId(projectPublicId)

    for (const pendingInvite of pendingInvitesDeleted) {
      const isPendingInviteWeJustAccepted =
        // Unlike the above, these don't need to be timing-safe, because
        // it's unlikely this method is vulnerable to timing attacks.
        peerId === pendingInvite.peerId &&
        inviteId.equals(pendingInvite.invite.inviteId)
      if (isPendingInviteWeJustAccepted) continue

      this.rpc
        .sendInviteResponse(pendingInvite.peerId, {
          decision: InviteResponse_Decision.ALREADY,
          inviteId: pendingInvite.invite.inviteId,
        })
        .catch(noop)
      this.emit(
        'invite-removed',
        internalToExternal(pendingInvite.invite),
        'accepted other'
      )
    }

    this.emit('invite-removed', internalToExternal(invite), 'accepted')

    return projectPublicId
  }

  /**
   * @param {Pick<Invite, 'inviteId'>} invite
   * @returns {void}
   */
  reject({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const pendingInvite = this.#pendingInvites.getByInviteId(inviteId)
    assert(!!pendingInvite, `Cannot find invite ${inviteId}`)

    const { peerId, invite, isAccepting } = pendingInvite

    assert(!isAccepting, `Cannot reject ${inviteIdString}`)

    this.rpc
      .sendInviteResponse(peerId, {
        decision: InviteResponse_Decision.REJECT,
        inviteId: invite.inviteId,
      })
      .catch(noop)

    this.#pendingInvites.deleteByInviteId(inviteId)
    this.emit('invite-removed', internalToExternal(invite), 'rejected')
  }
}

/**
 * @param {InviteInternal} internal
 * @returns {Invite}
 */
function internalToExternal(internal) {
  const { inviteId, ...rest } = internal
  return {
    inviteId: inviteId.toString('hex'),
    ...rest,
  }
}
