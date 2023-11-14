import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'
import { Logger } from '../logger.js'

export const kHandleDiscoveryKey = Symbol('handle discovery key')

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
  /** @type {Map<import('protomux'), Set<Buffer>>} */
  #pendingDiscoveryKeys = new Map()
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
    this.syncState.setMaxListeners(0)
    this.syncState.on('state', this.emit.bind(this, 'sync-state'))

    this.#coreManager.creatorCore.on('peer-add', this.#handlePeerAdd)
    this.#coreManager.creatorCore.on('peer-remove', this.#handlePeerRemove)
  }

  /** @type {import('../local-peers.js').LocalPeersEvents['discovery-key']} */
  [kHandleDiscoveryKey](discoveryKey, stream) {
    const protomux = stream.noiseStream.userData
    const peerSyncController = this.#peerSyncControllers.get(protomux)
    if (peerSyncController) {
      peerSyncController.handleDiscoveryKey(discoveryKey)
      return
    }
    // We will reach here if we are not part of the project, so we can ignore
    // these keys. However it's also possible to reach here when we are part of
    // a project, but the creator core `peer-add` event has not yet fired, so we
    // queue this to be handled in `#handlePeerAdd`
    const peerQueue = this.#pendingDiscoveryKeys.get(protomux) || new Set()
    peerQueue.add(discoveryKey)
    this.#pendingDiscoveryKeys.set(protomux, peerQueue)

    // If we _are_ part of the project, the `peer-add` should happen very soon
    // after we get a discovery-key event, so we cleanup our queue to avoid
    // memory leaks for any discovery keys that have not been handled.
    setTimeout(() => {
      const peerQueue = this.#pendingDiscoveryKeys.get(protomux)
      if (!peerQueue) return
      peerQueue.delete(discoveryKey)
      if (peerQueue.size === 0) {
        this.#pendingDiscoveryKeys.delete(protomux)
      }
    }, 500)
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
   * Bound to `this`
   *
   * This will be called whenever a peer is successfully added to the creator
   * core, which means that the peer has the project key. The PeerSyncController
   * will then handle validation of role records to ensure that the peer is
   * actually still part of the project.
   *
   * @param {{ protomux: import('protomux')<import('@hyperswarm/secret-stream')> }} peer
   */
  #handlePeerAdd = (peer) => {
    const { protomux } = peer
    if (this.#peerSyncControllers.has(protomux)) {
      this.#l.log(
        'Unexpected existing peer sync controller for peer %h',
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
    this.#peerSyncControllers.set(protomux, peerSyncController)

    if (this.#dataSyncEnabled.has('local')) {
      peerSyncController.enableDataSync()
    }

    const peerQueue = this.#pendingDiscoveryKeys.get(protomux)
    if (peerQueue) {
      for (const discoveryKey of peerQueue) {
        peerSyncController.handleDiscoveryKey(discoveryKey)
      }
      this.#pendingDiscoveryKeys.delete(protomux)
    }
  }

  /**
   * Bound to `this`
   *
   * Called when a peer is removed from the creator core, e.g. when the
   * connection is terminated.
   *
   * @param {{ protomux: import('protomux')<import('@hyperswarm/secret-stream')> }} peer
   */
  #handlePeerRemove = (peer) => {
    const { protomux } = peer
    if (!this.#peerSyncControllers.has(protomux)) {
      this.#l.log(
        'Unexpected no existing peer sync controller for peer %h',
        protomux.stream.remotePublicKey
      )
      return
    }
    this.#peerSyncControllers.delete(protomux)
    this.#pendingDiscoveryKeys.delete(protomux)
  }
}
