// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { projectKeyToId, projectKeyToPublicId } from './utils.js'

export class InviteApi extends TypedEmitter {
  // Maps project id -> set of device ids
  /** @type {Map<string, Set<string>>} */
  #peersToRespondTo = new Map()

  // Maps project id -> invite
  /** @type {Map<string, import('./generated/rpc.js').Invite>} */
  #invites = new Map()

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

    this.rpc.on('invite', async (peerId, invite) => {
      const projectId = projectKeyToId(invite.projectKey)

      const peerIds = this.#peersToRespondTo.get(projectId) || new Set()
      peerIds.add(peerId)
      this.#peersToRespondTo.set(projectId, peerIds)

      if (await this.#isMember(projectId)) {
        this.alreadyJoined(projectId)
      } else {
        this.#invites.set(projectId, invite)

        if (peerIds.size === 1) {
          this.emit('invite-received', {
            projectId,
            peerId,
          })
        }
      }
    })
  }

  /**
   * @param {string} projectId
   */
  accept(projectId) {
    this.#respond({ projectId, decision: InviteResponse_Decision.ACCEPT })
  }

  /**
   * @param {string} projectId
   */
  reject(projectId) {
    this.#respond({ projectId, decision: InviteResponse_Decision.REJECT })
  }

  /**
   * @param {string} projectId
   */
  alreadyJoined(projectId) {
    this.#respond({ projectId, decision: InviteResponse_Decision.ALREADY })
  }

  /**
   * @param {Object} options
   * @param {string} options.projectId
   * @param {InviteResponse_Decision} options.decision
   */
  #respond({ projectId, decision }) {
    const peerIds = this.#getPeerIds(projectId)
    const projectKey = Buffer.from(projectId, 'hex')

    let connectedPeerId
    let remainingPeerIds = new Set()

    for (const peerId of peerIds) {
      if (!connectedPeerId && this.#isPeerConnected(peerId)) {
        connectedPeerId = peerId
      } else if (this.#isPeerConnected(peerId)) {
        remainingPeerIds.add(peerId)
      }
    }

    if (!connectedPeerId) {
      throw new Error('No connected peer to respond to')
    }

    this.rpc.inviteResponse(connectedPeerId, {
      projectKey,
      decision,
    })

    if (decision === InviteResponse_Decision.ACCEPT) {
      const invite = this.#invites.get(projectId)

      if (!invite) {
        throw new Error(
          `Cannot find invite for project with ID ${projectKeyToPublicId(
            projectKey
          )}`
        )
      }

      this.#addProject(invite)

      // eslint-disable-next-line no-unused-vars
      for (const _peerId of remainingPeerIds) {
        this.alreadyJoined(projectId)
      }
    } else if (decision === InviteResponse_Decision.REJECT) {
      // eslint-disable-next-line no-unused-vars
      for (const _peerId of remainingPeerIds) {
        this.reject(projectId)
      }
    } else if (decision === InviteResponse_Decision.ALREADY) {
      // eslint-disable-next-line no-unused-vars
      for (const _peerId of remainingPeerIds) {
        this.alreadyJoined(projectId)
      }
    }

    this.#peersToRespondTo.delete(projectId)
    this.#invites.delete(projectId)
  }

  /**
   * @param {string} peerId
   * @returns {boolean}
   */
  #isPeerConnected(peerId) {
    return this.rpc.peers.some((peer) => peer.id === peerId)
  }

  /**
   * @param {string} projectId
   * @returns {Set<string>} peerIds
   */
  #getPeerIds(projectId) {
    return this.#peersToRespondTo.get(projectId) || new Set()
  }
}
