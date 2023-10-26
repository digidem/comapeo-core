import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'

export class SyncController extends TypedEmitter {
  #syncState
  #coreManager
  #capabilities
  /** @type {Map<import('protomux'), PeerSyncController>} */
  #peerSyncControllers = new Map()

  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {number} [opts.throttleMs]
   */
  constructor({ coreManager, throttleMs = 200, capabilities }) {
    super()
    this.#coreManager = coreManager
    this.#capabilities = capabilities
    this.#syncState = new SyncState({ coreManager, throttleMs })
  }

  getState() {
    return this.#syncState.getState()
  }

  /**
   * @param {import('protomux')<import('@hyperswarm/secret-stream')>} protomux A protomux instance
   */
  replicate(protomux) {
    if (this.#peerSyncControllers.has(protomux)) return

    const peerSyncController = new PeerSyncController({
      protomux,
      coreManager: this.#coreManager,
      syncState: this.#syncState,
      capabilities: this.#capabilities,
    })
    this.#peerSyncControllers.set(protomux, peerSyncController)
  }
}
