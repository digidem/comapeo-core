import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { idToKey, keyToId } from './utils.js'

/** @typedef {import('./rpc/index.js').MapeoRPC} MapeoRPC */

export class InviteApi extends TypedEmitter {
  // TODO: are invites persisted beyond this api?
  #invites = new Map()

  /**
   * @param {Object} options
   * @param {MapeoRPC} options.rpc
   */
  constructor({ rpc }) {
    super()
    this.rpc = rpc

    // TODO: I'm not seeing encryption keys used in the inviteResponse in the rpc api
    // what is the purpose of the encryption keys at this stage of the process or afterward?
    this.rpc.on('invite', (peerId, invite) => {
      const projectId = keyToId(invite.projectKey)
      const peerIds = this.#invites.get(projectId) || new Set()
      peerIds.add(peerId)
      this.#invites.set(projectId, peerIds)

      if (peerIds.size === 1) {
        this.emit('invite-received', {
          projectId,
          peerId,
        })
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
   * @param {Object} options
   * @param {string} options.projectId
   * @param {InviteResponse_Decision} options.decision
   */
  #respond({ projectId, decision }) {
    const peerIds = this.#getPeerIds(projectId)
    const projectKey = idToKey(projectId)

    // TODO: should this reply to  one peer with `ACCEPT` and the rest with `ALREADY`?
    // How is the `ALREADY` decision determined? It looks like that isn't used yet.
    // Does anything bad happen if we respond to multiple peers with `ACCEPT`?
    for (const peerId of peerIds.values()) {
      this.rpc.inviteResponse(peerId, { projectKey, decision })
    }

    this.#invites.delete(projectId)
  }

  /**
   * @param {string} projectId
   * @returns {Set<string>} peerIds
   */
  #getPeerIds(projectId) {
    return this.#invites.get(projectId) || new Set()
  }
}
