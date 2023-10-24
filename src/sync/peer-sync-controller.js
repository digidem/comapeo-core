import mapObject from 'map-obj'
import { NAMESPACES } from '../core-manager/index.js'

/**
 * @typedef {import('../core-manager/index.js').Namespace} Namespace
 */
/**
 * @typedef {import('../capabilities.js').Capability['sync'][Namespace] | 'unknown'} SyncCapability
 */

/** @type {Namespace[]} */
const PRESYNC_NAMESPACES = ['auth', 'config', 'blobIndex']

export class PeerSyncController {
  #replicatingCores = new Set()
  /** @type {Set<Namespace>} */
  #enabledNamespaces = new Set()
  #coreManager
  #protomux
  #peerId
  #capabilities
  /** @type {Record<Namespace, SyncCapability>} */
  #syncCapability = createSyncCapabilityObject('unknown')
  #isDataSyncEnabled = false
  /** @type {Record<Namespace, import('./core-sync-state.js').CoreState> | undefined} */
  #prevLocalState
  /** @type {SyncStatus} */
  #syncStatus = createSyncStatusObject()
  /** @type {Map<import('hypercore')<'binary', any>, ReturnType<import('hypercore')['download']>>} */
  #downloadingRanges = new Map()
  /** @type {SyncStatus | undefined} */
  #prevSyncStatus

  /**
   * @param {object} opts
   * @param {import("protomux")<import('../types.js').NoiseStream>} opts.protomux
   * @param {import("../core-manager/index.js").CoreManager} opts.coreManager
   * @param {import("./sync-state.js").SyncState} opts.syncState
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {string} opts.peerId device id for the peer: the device public key as a hex-encoded string
   */
  constructor({ protomux, coreManager, syncState, capabilities, peerId }) {
    this.#coreManager = coreManager
    this.#protomux = protomux
    this.#capabilities = capabilities
    this.#peerId = peerId

    // Always need to replicate the project creator core
    coreManager.creatorCore.replicate(protomux)
    this.#replicatingCores.add(coreManager.creatorCore)

    coreManager.on('add-core', this.#handleAddCore)
    syncState.on('state', this.#handleStateChange)

    this.#updateEnabledNamespaces()
  }

  /**
   * Enable syncing of data (in the data and blob namespaces)
   */
  enableDataSync() {
    this.#isDataSyncEnabled = true
    this.#updateEnabledNamespaces()
  }

  /**
   * Disable syncing of data (in the data and blob namespaces).
   *
   * Syncing of metadata (auth, config and blobIndex namespaces) will continue
   * in the background without user interaction.
   */
  disableDataSync() {
    this.#isDataSyncEnabled = false
    this.#updateEnabledNamespaces()
  }

  /**
   * Handler for 'core-add' event from CoreManager
   * Bound to `this` (defined as static property)
   *
   * @param {import("../core-manager/core-index.js").CoreRecord} coreRecord
   */
  #handleAddCore = ({ core, namespace }) => {
    if (!this.#enabledNamespaces.has(namespace)) return
    this.#replicateCore(core)
  }

  /**
   * Handler for 'state' event from SyncState
   * Bound to `this` (defined as static property)
   *
   * @param {import("./sync-state.js").State} state
   */
  #handleStateChange = async (state) => {
    this.#syncStatus = getSyncStatus(this.#peerId, state)
    const localState = mapObject(state, (ns, nsState) => {
      return [ns, nsState.localState]
    })

    // Map of which namespaces have received new data since last state change
    const didUpdate = mapObject(state, (ns) => {
      if (!this.#prevLocalState) return [ns, true]
      return [ns, this.#prevLocalState[ns].have !== localState[ns].have]
    })
    this.#prevLocalState = localState
    this.#prevSyncStatus = this.#syncStatus

    if (didUpdate.auth && this.#syncStatus.auth === 'synced') {
      try {
        const cap = await this.#capabilities.getCapabilities(this.#peerId)
        this.#syncCapability = cap.sync
      } catch (e) {
        // Any error, consider sync blocked
        this.#syncCapability = createSyncCapabilityObject('blocked')
      }
    }
    console.log('sync status', this.#peerId, this.#syncStatus)
    console.log('cap', this.#syncCapability)
    console.log('state', state.auth)

    // If any namespace has new data, update what is enabled
    if (Object.values(didUpdate).indexOf(true) > -1) {
      this.#updateEnabledNamespaces()
    }
  }

  #updateEnabledNamespaces() {
    // - If the sync capability is unknown, then the namespace is disabled,
    //   apart from the auth namespace.
    // - If sync capability is allowed, the "pre-sync" namespaces are enabled,
    //   and if data sync is enabled, then all namespaces are enabled
    for (const ns of NAMESPACES) {
      const cap = this.#syncCapability[ns]
      if (cap === 'blocked') {
        this.#disableNamespace(ns)
      } else if (cap === 'unknown') {
        if (ns === 'auth') {
          this.#enableNamespace(ns)
        } else {
          this.#disableNamespace(ns)
        }
      } else if (cap === 'allowed') {
        if (PRESYNC_NAMESPACES.includes(ns)) {
          this.#enableNamespace(ns)
        } else if (this.#isDataSyncEnabled) {
          const arePresyncNamespacesSynced = PRESYNC_NAMESPACES.every(
            (ns) => this.#syncStatus[ns] === 'synced'
          )
          // Only enable data namespaces once the pre-sync namespaces have synced
          if (arePresyncNamespacesSynced) {
            this.#enableNamespace(ns)
          }
        } else {
          this.#disableNamespace(ns)
        }
      } else {
        /** @type {never} */
        const _exhastiveCheck = cap
        return _exhastiveCheck
      }
    }
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #replicateCore(core) {
    if (this.#replicatingCores.has(core)) return
    core.replicate(this.#protomux)
    this.#replicatingCores.add(core)
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #unreplicateCore(core) {
    if (core === this.#coreManager.creatorCore) return
    const peerToUnreplicate = core.peers.find(
      (peer) => peer.protomux === this.#protomux
    )
    if (!peerToUnreplicate) return
    peerToUnreplicate.channel.close()
    this.#replicatingCores.delete(core)
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #downloadCore(core) {
    if (this.#downloadingRanges.has(core)) return
    const range = core.download({ start: 0, end: -1 })
    this.#downloadingRanges.set(core, range)
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #undownloadCore(core) {
    const range = this.#downloadingRanges.get(core)
    if (!range) return
    range.destroy()
    this.#downloadingRanges.delete(core)
  }

  /**
   * @param {Namespace} namespace
   */
  #enableNamespace(namespace) {
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#replicateCore(core)
      this.#downloadCore(core)
    }
    this.#enabledNamespaces.add(namespace)
  }

  /**
   * @param {Namespace} namespace
   */
  #disableNamespace(namespace) {
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#unreplicateCore(core)
      this.#undownloadCore(core)
    }
    this.#enabledNamespaces.delete(namespace)
  }
}

/**
 * @typedef {{ [namespace in Namespace]?: import("./core-sync-state.js").PeerCoreState }} PeerState
 */

/** @typedef {Record<Namespace, 'unknown' | 'syncing' | 'synced'>} SyncStatus */

/**
 * @param {string} peerId
 * @param {import('./sync-state.js').State} state
 * @returns {SyncStatus}
 */
function getSyncStatus(peerId, state) {
  const syncStatus = /** @type {SyncStatus} */ ({})
  for (const namespace of NAMESPACES) {
    const peerState = state[namespace].remoteStates[peerId]
    if (!peerState) {
      syncStatus[namespace] = 'unknown'
    } else if (
      peerState.status === 'connected' &&
      state[namespace].localState.want === 0
    ) {
      syncStatus[namespace] = 'synced'
    } else {
      syncStatus[namespace] = 'syncing'
    }
  }
  return syncStatus
}

/**
 * @param {SyncCapability} capability
 * @returns {Record<Namespace, SyncCapability>} */
function createSyncCapabilityObject(capability) {
  const cap = /** @type {Record<Namespace, SyncCapability>} */ ({})
  for (const ns of NAMESPACES) {
    cap[ns] = capability
  }
  return cap
}

/**
 * @returns {SyncStatus}
 */
function createSyncStatusObject() {
  const status = /** @type {SyncStatus} */ ({})
  for (const ns of NAMESPACES) {
    status[ns] = 'unknown'
  }
  return status
}
