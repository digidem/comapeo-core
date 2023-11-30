import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import {
  PeerSyncController,
  PRESYNC_NAMESPACES,
} from './peer-sync-controller.js'
import { Logger } from '../logger.js'
import { NAMESPACES } from '../core-manager/index.js'

export const kHandleDiscoveryKey = Symbol('handle discovery key')

/**
 * @typedef {{
 *   protomux: import('protomux')<import('@hyperswarm/secret-stream')>,
 *   remotePublicKey: Buffer
 * }} Peer
 */

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
  #PSCIndex = new PSCIndex()
  /** @type {Set<'local' | 'remote'>} */
  #dataSyncEnabled = new Set()
  /** @type {Map<import('protomux'), Set<Buffer>>} */
  #pendingDiscoveryKeys = new Map()
  #l
  #coreOwnership

  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {import('../core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {number} [opts.throttleMs]
   * @param {Logger} [opts.logger]
   */
  constructor({
    coreManager,
    capabilities,
    coreOwnership,
    throttleMs = 200,
    logger,
  }) {
    super()
    this.#l = Logger.create('syncApi', logger)
    this.#coreManager = coreManager
    this.#capabilities = capabilities
    this.#coreOwnership = coreOwnership
    this.syncState = new SyncState({ coreManager, throttleMs })
    this.syncState.setMaxListeners(0)
    this.syncState.on('state', this.emit.bind(this, 'sync-state'))

    this.#coreManager.creatorCore.on('peer-add', this.#handlePeerAdd)
    this.#coreManager.creatorCore.on('peer-remove', this.#handlePeerRemove)
    capabilities.on('update', this.#handleRoleUdpate.bind(this))
    coreOwnership.on('update', this.#handleCoreOwnershipUpdate.bind(this))
  }

  /** @type {import('../local-peers.js').LocalPeersEvents['discovery-key']} */
  [kHandleDiscoveryKey](discoveryKey, protomux) {
    const peerSyncController = this.#PSCIndex.getByProtomux(protomux)
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
    for (const peerSyncController of this.#PSCIndex.values()) {
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
    for (const peerSyncController of this.#PSCIndex.values()) {
      peerSyncController.disableDataSync()
    }
  }

  /**
   * @param {'initial' | 'full'} type
   */
  async waitForSync(type) {
    const state = this.getState()
    const namespaces = type === 'initial' ? PRESYNC_NAMESPACES : NAMESPACES
    if (isSynced(state, namespaces, this.#PSCIndex.values())) return
    return new Promise((res) => {
      this.on('sync-state', function onState(state) {
        if (!isSynced(state, namespaces, this.#PSCIndex.values())) return
        this.off('sync-state', onState)
        res(null)
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
   * @param {Peer} peer
   */
  #handlePeerAdd = (peer) => {
    const { protomux } = peer
    if (this.#PSCIndex.hasProtomux(protomux)) {
      this.#l.log(
        'Unexpected existing peer sync controller for peer %h',
        peer.remotePublicKey
      )
      return
    }
    const peerSyncController = new PeerSyncController({
      creatorCorePeer: peer,
      coreManager: this.#coreManager,
      syncState: this.syncState,
      capabilities: this.#capabilities,
      logger: this.#l,
    })
    this.#PSCIndex.add(peerSyncController)

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
   * @param {Peer} peer
   */
  #handlePeerRemove = (peer) => {
    const { protomux } = peer
    const psc = this.#PSCIndex.getByProtomux(protomux)
    if (!psc) {
      this.#l.log(
        'Unexpected no existing peer sync controller for peer %h',
        protomux.stream.remotePublicKey
      )
      return
    }
    psc.destroy()
    this.#PSCIndex.delete(psc)
    this.#pendingDiscoveryKeys.delete(protomux)
  }

  /**
   * @param {import('@mapeo/schema').Role[]} roleDocs
   */
  async #handleRoleUdpate(roleDocs) {
    /** @type {Set<string>} */
    const updatedDeviceIds = new Set()
    for (const doc of roleDocs) {
      // Ignore docs about ourselves
      if (doc.docId === this.#coreManager.deviceId) continue
      updatedDeviceIds.add(doc.docId)
    }
    const coreOwnershipPromises = []
    for (const deviceId of updatedDeviceIds) {
      coreOwnershipPromises.push(this.#coreOwnership.get(deviceId))
    }
    const ownershipResults = await Promise.allSettled(coreOwnershipPromises)
    for (const result of ownershipResults) {
      if (result.status === 'rejected') continue
      this.#addCores(result.value)
      this.#l.log('Added cores for device %S', result.value.docId)
    }
  }

  /**
   * @param {import('@mapeo/schema').CoreOwnership[]} coreOwnershipDocs
   */
  async #handleCoreOwnershipUpdate(coreOwnershipDocs) {
    for (const coreOwnershipDoc of coreOwnershipDocs) {
      // Ignore our own ownership doc - we don't need to add cores for ourselves
      if (coreOwnershipDoc.docId === this.#coreManager.deviceId) continue
      try {
        // We don't actually need the role, we just need to check if it exists
        await this.#capabilities.getCapabilities(coreOwnershipDoc.docId)
        this.#addCores(coreOwnershipDoc)
        this.#l.log('Added cores for device %S', coreOwnershipDoc.docId)
      } catch (e) {
        // Ignore, we'll add these when the role is added
        this.#l.log('No role for device %S', coreOwnershipDoc.docId)
      }
    }
  }

  /**
   * @param {import('@mapeo/schema').CoreOwnership} coreOwnership
   */
  #addCores(coreOwnership) {
    for (const ns of NAMESPACES) {
      if (ns === 'auth') continue
      const coreKey = Buffer.from(coreOwnership[`${ns}CoreId`], 'hex')
      this.#coreManager.addCore(coreKey, ns)
    }
  }
}

/**
 * Is the sync state "synced", e.g. is there nothing left to sync
 *
 * @param {import('./sync-state.js').State} state
 * @param {readonly import('../core-manager/index.js').Namespace[]} namespaces
 * @param {Iterable<PeerSyncController>} peerSyncControllers
 */
function isSynced(state, namespaces, peerSyncControllers) {
  for (const ns of namespaces) {
    if (state[ns].dataToSync) return false
    for (const psc of peerSyncControllers) {
      const { peerId } = psc
      if (psc.syncCapability[ns] === 'blocked') continue
      if (!(peerId in state[ns].remoteStates)) return false
      if (state[ns].remoteStates[peerId].status === 'connecting') return false
    }
  }
  return true
}

class PSCIndex {
  /** @type {Map<import('protomux'), PeerSyncController>} */
  #byProtomux = new Map()
  /** @type {Map<string, Set<PeerSyncController>>} */
  #byPeerId = new Map()
  /**
   * @param {PeerSyncController} psc
   */
  add(psc) {
    this.#byProtomux.set(psc.protomux, psc)
    const peerSet = this.#byPeerId.get(psc.peerId) || new Set()
    peerSet.add(psc)
    this.#byPeerId.set(psc.peerId, peerSet)
  }
  values() {
    return this.#byProtomux.values()
  }
  /**
   * @param {import('protomux')} protomux
   */
  hasProtomux(protomux) {
    return this.#byProtomux.has(protomux)
  }
  /**
   * @param {import('protomux')} protomux
   */
  getByProtomux(protomux) {
    return this.#byProtomux.get(protomux)
  }
  /**
   * @param {string} peerId
   */
  getByPeerId(peerId) {
    return this.#byPeerId.get(peerId)
  }
  /**
   * @param {PeerSyncController} psc
   */
  delete(psc) {
    this.#byProtomux.delete(psc.protomux)
    const peerSet = this.#byPeerId.get(psc.peerId)
    if (!peerSet) return
    peerSet.delete(psc)
    if (peerSet.size === 0) {
      this.#byPeerId.delete(psc.peerId)
    }
  }
}
