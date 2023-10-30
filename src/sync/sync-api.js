import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'
import { Logger } from '../logger.js'

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
  #l

  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {number} [opts.throttleMs]
   * @param {Logger} [opts.logger]
   */
  constructor({ coreManager, throttleMs = 200, capabilities, logger }) {
    super()
    this.#l = Logger.create('syncApi', logger)
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
    this.#l.log('Starting data sync')
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
    this.#l.log('Stopping data sync')
    for (const peerSyncController of this.#peerSyncControllers.values()) {
      peerSyncController.disableDataSync()
    }
  }

  /**
   * @param {import('protomux')<import('@hyperswarm/secret-stream')>} protomux A protomux instance
   */
  [kSyncReplicate](protomux) {
    if (this.#peerSyncControllers.has(protomux)) {
      this.#l.log(
        'Existing sync controller for peer %h',
        protomux.stream.remotePublicKey
      )
      return
    }

    const peerSyncController = new PeerSyncController({
      protomux,
      coreManager: this.#coreManager,
      syncState: this.syncState,
      capabilities: this.#capabilities,
      logger: this.#l,
    })
    if (this.#dataSyncEnabled.has('local')) {
      peerSyncController.enableDataSync()
    }
    this.#peerSyncControllers.set(protomux, peerSyncController)
  }
}
