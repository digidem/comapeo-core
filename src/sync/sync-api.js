import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import {
  PeerSyncController,
  PRESYNC_NAMESPACES,
  DATA_NAMESPACES,
} from './peer-sync-controller.js'
import { Logger } from '../logger.js'
import { NAMESPACES } from '../constants.js'
import { keyToId } from '../utils.js'

export const kHandleDiscoveryKey = Symbol('handle discovery key')
export const kSyncState = Symbol('sync state')

/**
 * @typedef {'initial' | 'full'} SyncType
 */

/**
 * @typedef {object} SyncTypeState
 * @property {number} have Number of blocks we have locally
 * @property {number} want Number of blocks we want from connected peers
 * @property {number} wanted Number of blocks that connected peers want from us
 * @property {number} missing Number of blocks missing (we don't have them, but connected peers don't have them either)
 * @property {boolean} dataToSync Is there data available to sync? (want > 0 || wanted > 0)
 * @property {boolean} syncing Are we currently syncing?
 */

/**
 * @typedef {object} State
 * @property {SyncTypeState} initial State of initial sync (sync of auth, metadata and project config)
 * @property {SyncTypeState} data State of data sync (observations, map data, photos, audio, video etc.)
 * @property {number} connectedPeers Number of connected peers
 */

/**
 * @typedef {object} SyncEvents
 * @property {(syncState: State) => void} sync-state
 */

/**
 * @extends {TypedEmitter<SyncEvents>}
 */
export class SyncApi extends TypedEmitter {
  #coreManager
  #roles
  /** @type {Map<import('protomux'), PeerSyncController>} */
  #peerSyncControllers = new Map()
  /** @type {Set<string>} */
  #peerIds = new Set()
  /** @type {Set<'local' | 'remote'>} */
  #dataSyncEnabled = new Set()
  /** @type {Map<import('protomux'), Set<Buffer>>} */
  #pendingDiscoveryKeys = new Map()
  #l

  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import('../roles.js').Roles} opts.roles
   * @param {number} [opts.throttleMs]
   * @param {Logger} [opts.logger]
   */
  constructor({ coreManager, throttleMs = 200, roles, logger }) {
    super()
    this.#l = Logger.create('syncApi', logger)
    this.#coreManager = coreManager
    this.#roles = roles
    this[kSyncState] = new SyncState({ coreManager, throttleMs })
    this[kSyncState].setMaxListeners(0)
    this[kSyncState].on('state', (namespaceSyncState) => {
      const state = this.#getState(namespaceSyncState)
      this.emit('sync-state', state)
    })

    this.#coreManager.creatorCore.on('peer-add', this.#handlePeerAdd)
    this.#coreManager.creatorCore.on('peer-remove', this.#handlePeerRemove)
  }

  /** @type {import('../local-peers.js').LocalPeersEvents['discovery-key']} */
  [kHandleDiscoveryKey](discoveryKey, protomux) {
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

  /**
   * Get the current sync state (initial and full). Also emitted via the 'sync-state' event
   * @returns {State}
   */
  getState() {
    return this.#getState(this[kSyncState].getState())
  }

  /**
   * @param {import('./sync-state.js').State} namespaceSyncState
   * @returns {State}
   */
  #getState(namespaceSyncState) {
    const state = reduceSyncState(namespaceSyncState)
    state.data.syncing = this.#dataSyncEnabled.has('local')
    return state
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
    this.emit('sync-state', this.getState())
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
    this.emit('sync-state', this.getState())
  }

  /**
   * @param {SyncType} type
   * @returns {Promise<void>}
   */
  async waitForSync(type) {
    const state = this[kSyncState].getState()
    const namespaces = type === 'initial' ? PRESYNC_NAMESPACES : NAMESPACES
    if (isSynced(state, namespaces, this.#peerSyncControllers)) return
    return new Promise((res) => {
      const _this = this
      this[kSyncState].on('state', function onState(state) {
        if (!isSynced(state, namespaces, _this.#peerSyncControllers)) return
        _this[kSyncState].off('state', onState)
        res()
      })
    })
  }

  /**
   * Bound to `this`
   *
   * This will be called whenever a peer is successfully added to the creator
   * core, which means that the peer has the project key. The PeerSyncController
   * will then handle validation of role records to ensure that the peer is
   * actually still part of the project.
   *
   * @param {{ protomux: import('protomux')<import('../utils.js').OpenedNoiseStream> }} peer
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
      syncState: this[kSyncState],
      roles: this.#roles,
      logger: this.#l,
    })
    this.#peerSyncControllers.set(protomux, peerSyncController)
    if (peerSyncController.peerId) this.#peerIds.add(peerSyncController.peerId)

    // Add peer to all core states (via namespace sync states)
    this[kSyncState].addPeer(peerSyncController.peerId)

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
   * @param {{ protomux: import('protomux')<import('@hyperswarm/secret-stream')>, remotePublicKey: Buffer }} peer
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
    this.#peerIds.delete(keyToId(peer.remotePublicKey))
    this.#pendingDiscoveryKeys.delete(protomux)
  }
}

/**
 * Is the sync state "synced", e.g. is there nothing left to sync
 *
 * @param {import('./sync-state.js').State} state
 * @param {readonly import('../core-manager/index.js').Namespace[]} namespaces
 * @param {Map<import('protomux'), PeerSyncController>} peerSyncControllers
 */
function isSynced(state, namespaces, peerSyncControllers) {
  for (const ns of namespaces) {
    if (state[ns].dataToSync) return false
    for (const psc of peerSyncControllers.values()) {
      const { peerId } = psc
      if (psc.syncCapability[ns] === 'blocked') continue
      if (!(peerId in state[ns].remoteStates)) return false
      if (state[ns].remoteStates[peerId].status === 'connecting') return false
    }
  }
  return true
}

/**
 * Reduce the more detailed sync state we use internally to the public sync
 * state that sums namespaces into an 'initial' and 'full' sync state
 * @param {import('./sync-state.js').State} namespaceSyncState
 * @returns {State}
 */
function reduceSyncState(namespaceSyncState) {
  const connectedPeers = Object.values(
    namespaceSyncState.auth.remoteStates
  ).filter((remoteState) => remoteState.status === 'connected').length
  const state = {
    initial: createInitialSyncTypeState(),
    data: createInitialSyncTypeState(),
    connectedPeers,
  }
  for (const ns of PRESYNC_NAMESPACES) {
    const nsState = namespaceSyncState[ns]
    mutatingAddNamespaceState(state.initial, nsState)
  }
  for (const ns of DATA_NAMESPACES) {
    const nsState = namespaceSyncState[ns]
    mutatingAddNamespaceState(state.data, nsState)
  }
  return state
}

/**
 * @param {SyncTypeState} accumulator
 * @param {import('./namespace-sync-state.js').SyncState} currentValue
 */
function mutatingAddNamespaceState(accumulator, currentValue) {
  accumulator.have += currentValue.localState.have
  accumulator.want += currentValue.localState.want
  accumulator.wanted += currentValue.localState.wanted
  accumulator.missing += currentValue.localState.missing
  accumulator.dataToSync ||= currentValue.dataToSync
}

/**
 * @returns {SyncTypeState}
 */
function createInitialSyncTypeState() {
  return {
    have: 0,
    want: 0,
    wanted: 0,
    missing: 0,
    dataToSync: false,
    syncing: true,
  }
}
