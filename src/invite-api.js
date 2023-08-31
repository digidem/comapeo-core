import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { idToKey, keyToId } from './utils.js'

/** @typedef {import('./rpc/index.js').MapeoRPC} MapeoRPC */

export class InviteApi extends TypedEmitter {
  #invites = new Map()
  #keys = new Map()

  #isMember
  #addProject

  /**
   * @param {Object} options
   * @param {MapeoRPC} options.rpc
   * @param {object} options.queries
   * @param {(projectId: string) => Promise<boolean>} options.queries.isMember
   * @param {(projectId: string, encryptionKeys: import('./types.js').KeyPair) => Promise<void>} options.queries.addProject
   */
  constructor({ rpc, queries }) {
    super()
    this.rpc = rpc
    this.#isMember = queries.isMember
    this.#addProject = queries.addProject

    this.rpc.on('invite', async (peerId, invite) => {
      const projectId = keyToId(invite.projectKey)

      if (await this.#isMember(projectId)) {
        this.alreadyJoined(projectId)
      } else {
        const peerIds = this.#invites.get(projectId) || new Set()
        peerIds.add(peerId)
        this.#invites.set(projectId, peerIds)
        this.#keys.set(projectId, invite.encryptionKeys)
  
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
    const peerIds = Array.from(this.#getPeerIds(projectId))
    const encryptionKeys = this.#keys.get(projectId)
    const projectKey = idToKey(projectId)

    let connectedPeerId
    let remainingPeerIds = []

    for (const peerId of peerIds) {
      if (!connectedPeerId && this.#isPeerConnected(peerId)) {
        connectedPeerId = peerId
      } else if (this.#isPeerConnected(peerId)) {
        remainingPeerIds.push(peerId)
      }
    }

    if (!connectedPeerId) {
      throw new Error('No connected peer to respond to')
    }

    this.rpc.inviteResponse(connectedPeerId, { projectKey, decision })

    if (decision === InviteResponse_Decision.ACCEPT) {
      this.#addProject(projectId, encryptionKeys)

      for (const peerId of remainingPeerIds) {
        this.alreadyJoined(projectId)
      }
    } else if (decision === InviteResponse_Decision.REJECT) {
      for (const peerId of remainingPeerIds) {
        this.reject(projectId)
      }
    } else if (decision === InviteResponse_Decision.ALREADY) {
      for (const peerId of remainingPeerIds) {
        this.alreadyJoined(projectId)
      }
    }

    this.#invites.delete(projectId)
    this.#keys.delete(projectId)
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
    return this.#invites.get(projectId) || new Set()
  }
}
