// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { projectKeyToId } from './utils.js'

/**
 * @typedef {Object} InviteApiEvents
 *
 * @property {(info: { projectId: string, projectName?: string, peerId: string }) => void} invite-received
 */

/**
 * @template K
 * @template V
 * @extends {Map<K, Set<V>>}
 */
class MapOfSets extends Map {
  /** @param {K} key */
  get(key) {
    const existing = super.get(key)
    if (existing) return existing
    const set = new Set()
    super.set(key, set)
    return set
  }
}

/**
 * @extends {TypedEmitter<InviteApiEvents>}
 */
export class InviteApi extends TypedEmitter {
  // Maps project id -> set of device ids
  /** @type {MapOfSets<string, string>} */
  #peersToRespondTo = new MapOfSets()

  // Maps project id -> { invite, fromPeerId }
  /** @type {Map<string, { fromPeerId: string, invite: import('./generated/rpc.js').Invite }>} */
  #pendingInvites = new Map()

  #isMember
  #addProject

  /**
   * @param {Object} options
   * @param {import('./rpc/index.js').MapeoRPC} options.rpc
   * @param {object} options.queries
   * @param {(projectId: string) => Promise<boolean>} options.queries.isMember
   * @param {(invite: import('./generated/rpc.js').Invite) => Promise<void>} options.queries.addProject
   */
  constructor({ rpc, queries }) {
    super()
    this.rpc = rpc
    this.#isMember = queries.isMember
    this.#addProject = queries.addProject

    this.rpc.on('invite', (peerId, invite) => {
      this.#handleInvite(peerId, invite).catch(() => {
        /* c8 ignore next */
        // TODO: Log errors, but otherwise ignore them, but can't think of a reason there would be an error here
      })
    })
  }

  /**
   * @param {string} peerId
   * @param {import('./generated/rpc.js').Invite} invite
   */
  async #handleInvite(peerId, invite) {
    const projectId = projectKeyToId(invite.projectKey)
    const isAlreadyMember = await this.#isMember(projectId)

    if (isAlreadyMember) {
      this.#sendAlreadyResponse({ peerId, projectId })
      return
    }

    const peerIds = this.#peersToRespondTo.get(projectId)
    peerIds.add(peerId)

    if (this.#pendingInvites.has(projectId)) return

    this.#pendingInvites.set(projectId, { fromPeerId: peerId, invite })
    this.emit('invite-received', {
      // TODO: Should this be the project public ID since it can be exposed to the client?
      // Probably would require changing the public methods to accept the public ID
      // and using the public ID for #invites and #peersToRespondTo keys instead
      peerId,
      projectId,
      projectName: invite.projectInfo?.name,
    })
  }

  /**
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async accept(projectId) {
    const isAlreadyMember = await this.#isMember(projectId)
    const peersToRespondTo = this.#peersToRespondTo.get(projectId)

    if (isAlreadyMember) {
      for (const peerId of peersToRespondTo) {
        this.#sendAlreadyResponse({ peerId, projectId })
      }
      return
    }

    const pendingInvite = this.#pendingInvites.get(projectId)

    if (!pendingInvite) {
      throw new Error(`Cannot find invite for project with ID ${projectId}`)
    }

    try {
      this.#sendAcceptResponse({ peerId: pendingInvite.fromPeerId, projectId })
      // TODO: Add another RPC message to confirm invitee is written into project after accepting
    } catch (e) {
      // TODO: If can't accept invite because peer it was sent from has
      // disconnected, and another still-connected peer has sent an invite, then
      // emit another invite-received event
      throw new Error('Could not accept invite: Peer disconnected')
    }

    try {
      await this.#addProject(pendingInvite.invite)
    } catch (e) {
      // TODO: Add a reason for the user
      throw new Error('Failed to join project')
    }

    // Respond to the remaining peers with ALREADY
    for (const peerId of peersToRespondTo) {
      if (peerId === pendingInvite.fromPeerId) continue
      this.#sendAlreadyResponse({ peerId, projectId })
    }
  }

  /**
   * @param {string} projectId
   * @returns {Promise<void>}
   */
  async reject(projectId) {
    if (!this.#pendingInvites.has(projectId)) {
      throw new Error(`Cannot find invite for project with ID ${projectId}`)
    }
    for (const peerId of this.#peersToRespondTo.get(projectId)) {
      this.#sendRejectResponse({ peerId, projectId })
    }
  }

  /**
   * Will throw if the response fails to be sent
   *
   * @param {{ peerId: string, projectId: string }} opts
   */
  #sendAcceptResponse({ peerId, projectId }) {
    const projectKey = Buffer.from(projectId, 'hex')
    this.rpc.inviteResponse(peerId, {
      projectKey,
      decision: InviteResponse_Decision.ACCEPT,
    })
  }

  /**
   * Will not throw, will silently fail if the response fails to send.
   *
   * @param {{ peerId: string, projectId: string }} opts
   */
  #sendAlreadyResponse({ peerId, projectId }) {
    const projectKey = Buffer.from(projectId, 'hex')
    try {
      this.rpc.inviteResponse(peerId, {
        projectKey,
        decision: InviteResponse_Decision.ALREADY,
      })
    } catch (e) {
      // Ignore errors trying to send an already response because the invitor
      // will consider the invite failed anyway
    }
  }

  /**
   * Will not throw, will silently fail if the response fails to send.
   *
   * @param {{ peerId: string, projectId: string }} opts
   */
  #sendRejectResponse({ peerId, projectId }) {
    const projectKey = Buffer.from(projectId, 'hex')
    try {
      this.rpc.inviteResponse(peerId, {
        projectKey,
        decision: InviteResponse_Decision.REJECT,
      })
    } catch (e) {
      // Ignore errors trying to send an reject response because the invitor
      // will consider the invite failed anyway
    }
  }
}
