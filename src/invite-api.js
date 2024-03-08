// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { assert, keyToId } from './utils.js'
import HashMap from './lib/hashmap.js'
import timingSafeEqual from './lib/timing-safe-equal.js'
import { promiseWithResolvers } from './ponyfills.js'

/**
 * Internally, we typically use the `Invite` type from the protobuf. We also use
 * an external type for public consumers.
 *
 * @internal
 * @typedef {import('./generated/rpc.js').Invite} InviteInternal
 */

/**
 * @internal
 * @typedef {import('./generated/rpc.js').ProjectJoinDetails} ProjectJoinDetails
 */

/**
 * @typedef {object} Invite
 * @prop {string} inviteId
 * @prop {string} projectName
 * @prop {string} [roleName]
 * @prop {string} [roleDescription]
 * @prop {string} [invitorName]
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
 * @property {(invite: Invite) => void} invite-removed
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
        this.#handleInvite(...args)
      } catch (err) {
        console.error('Error handling invite', err)
      }
    })
  }

  /**
   * @param {string} peerId
   * @param {InviteInternal} invite
   */
  #handleInvite(peerId, invite) {
    const isAlreadyMember = this.#isMember(invite.projectPublicId)
    if (isAlreadyMember) {
      this.#sendAlreadyResponse({ peerId, inviteId: invite.inviteId })
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
   * @returns {Promise<void>}
   */
  async accept({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const pendingInvite = this.#pendingInvites.getByInviteId(inviteId)
    if (!pendingInvite) {
      throw new Error(`Cannot find invite ID ${inviteIdString}`)
    }

    const { peerId, invite } = pendingInvite
    const { projectName, projectPublicId } = invite

    const removePendingInvite = () => {
      const didDelete = this.#pendingInvites.deleteByInviteId(inviteId)
      if (didDelete) this.emit('invite-removed', internalToExternal(invite))
    }

    // This is probably impossible in the UI, but it's theoretically possible
    // to join a project while an invite is pending, so we need to check this.
    const isAlreadyMember = this.#isMember(projectPublicId)
    if (isAlreadyMember) {
      const pendingInvitesDeleted =
        this.#pendingInvites.deleteByProjectPublicId(projectPublicId)
      for (const pendingInvite of pendingInvitesDeleted) {
        this.#sendAlreadyResponse({
          peerId: pendingInvite.peerId,
          inviteId: pendingInvite.invite.inviteId,
        })
        this.emit('invite-removed', internalToExternal(pendingInvite.invite))
      }
      return
    }

    const { promise: projectDetailsPromise, resolve: gotProjectDetails } =
      /** @type {typeof promiseWithResolvers<ProjectJoinDetails>} */
      (promiseWithResolvers)()
    /**
     * @param {string} projectDetailsPeerId
     * @param {ProjectJoinDetails} details
     */
    const onProjectDetails = (projectDetailsPeerId, details) => {
      const isDetailsForThisInvite =
        // This peer ID check is probably superfluous because the invite ID
        // should be impossible to guess, but is easy to add for correctness.
        timingSafeEqual(projectDetailsPeerId, peerId) &&
        timingSafeEqual(inviteId, details.inviteId)
      if (!isDetailsForThisInvite) return

      gotProjectDetails(details)
      this.rpc.off('got-project-details', onProjectDetails)
    }
    this.rpc.on('got-project-details', onProjectDetails)

    assert(
      !this.#pendingInvites.isAcceptingForProject(projectPublicId),
      `Cannot double-accept invite for project ${projectPublicId}`
    )
    this.#pendingInvites.markAccepting(inviteId)

    try {
      await this.#sendAcceptResponse({ peerId, inviteId })
    } catch (e) {
      this.rpc.off('got-project-details', onProjectDetails)
      removePendingInvite()
      throw new Error('Could not accept invite: Peer disconnected')
    }

    const details = await projectDetailsPromise

    try {
      await this.#addProject({ ...details, projectName })
    } catch (e) {
      removePendingInvite()
      // TODO: Add a reason for the user
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

      this.#sendAlreadyResponse({
        peerId: pendingInvite.peerId,
        inviteId: pendingInvite.invite.inviteId,
      })
      this.emit('invite-removed', internalToExternal(pendingInvite.invite))
    }

    this.emit('invite-removed', internalToExternal(invite))
  }

  /**
   * @param {Pick<Invite, 'inviteId'>} invite
   * @returns {void}
   */
  reject({ inviteId: inviteIdString }) {
    const inviteId = Buffer.from(inviteIdString, 'hex')

    const pendingInvite = this.#pendingInvites.getByInviteId(inviteId)
    assert(!!pendingInvite, `Cannot find invite ${inviteId}`)

    const { peerId, invite } = pendingInvite

    this.#sendRejectResponse({ peerId, inviteId: invite.inviteId })

    this.#pendingInvites.deleteByInviteId(inviteId)
    this.emit('invite-removed', internalToExternal(invite))
  }

  /**
   * Will reject if the response fails to be sent
   *
   * @param {{ peerId: string, inviteId: Buffer }} opts
   */
  async #sendAcceptResponse({ peerId, inviteId }) {
    await this.rpc.sendInviteResponse(peerId, {
      inviteId,
      decision: InviteResponse_Decision.ACCEPT,
    })
  }

  /**
   * Will not reject, will silently fail if the response fails to send.
   *
   * @param {{ peerId: string, inviteId: Buffer }} opts
   */
  async #sendAlreadyResponse({ peerId, inviteId }) {
    try {
      await this.rpc.sendInviteResponse(peerId, {
        inviteId,
        decision: InviteResponse_Decision.ALREADY,
      })
    } catch (e) {
      // Ignore errors trying to send an reject response because the invitor
      // will consider the invite failed anyway
    }
  }

  /**
   * Will not reject, will silently fail if the response fails to send.
   *
   * @param {{ peerId: string, inviteId: Buffer }} opts
   */
  async #sendRejectResponse({ peerId, inviteId }) {
    try {
      await this.rpc.sendInviteResponse(peerId, {
        inviteId,
        decision: InviteResponse_Decision.REJECT,
      })
    } catch (e) {
      // Ignore errors trying to send an reject response because the invitor
      // will consider the invite failed anyway
    }
  }
}

/**
 * @param {InviteInternal} internal
 * @returns {Invite}
 */
function internalToExternal(internal) {
  /** @type {Invite} */
  const result = {
    inviteId: internal.inviteId.toString('hex'),
    projectName: internal.projectName,
  }
  if (internal.roleName) {
    result.roleName = internal.roleName
  }
  if (internal.roleDescription) {
    result.roleDescription = internal.roleDescription
  }
  if (internal.invitorName) {
    result.invitorName = internal.invitorName
  }
  return result
}
