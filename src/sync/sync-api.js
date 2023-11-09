import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'

export const kSyncReplicate = Symbol('replicate sync')

/**
 * @typedef {object} SyncEvents
 * @property {(syncState: import('./sync-state.js').State) => void} sync-state
 */

/**
 * @extends {TypedEmitter<SyncEvents>}
 */
export class SyncApi extends TypedEmitter {
  syncState
  #coreManager
  #capabilities
  /** @type {Map<import('protomux'), PeerSyncController>} */
  #peerSyncControllers = new Map()
  /** @type {Set<'local' | 'remote'>} */
  #dataSyncEnabled = new Set()

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
    this.syncState = new SyncState({ coreManager, throttleMs })
    this.syncState.on('state', this.emit.bind(this, 'sync-state'))
  }

  getState() {
    return this.syncState.getState()
  }

  /**
   * Start syncing data cores
   */
  start() {
    if (this.#dataSyncEnabled.has('local')) return
    this.#dataSyncEnabled.add('local')
    for (const peerSyncController of this.#peerSyncControllers.values()) {
      peerSyncController.enableDataSync()
    }
  }

  /**
   * Stop syncing data cores (metadata cores will continue syncing in the background)
   */
  stop() {
    if (!this.#dataSyncEnabled.has('local')) return
    this.#dataSyncEnabled.delete('local')
    for (const peerSyncController of this.#peerSyncControllers.values()) {
      peerSyncController.disableDataSync()
    }
  }

  /**
   * @param {import('protomux')<import('@hyperswarm/secret-stream')>} protomux A protomux instance
   */
  [kSyncReplicate](protomux) {
    if (this.#peerSyncControllers.has(protomux)) return

    const peerSyncController = new PeerSyncController({
      protomux,
      coreManager: this.#coreManager,
      syncState: this.syncState,
      capabilities: this.#capabilities,
    })
    if (this.#dataSyncEnabled.has('local')) {
      peerSyncController.enableDataSync()
    }
    this.#peerSyncControllers.set(protomux, peerSyncController)
  }
}
