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
  #capabilities
  /** @type {Record<Namespace, SyncCapability>} */
  #syncCapability = createNamespaceMap('unknown')
  #isDataSyncEnabled = false
  /** @type {Record<Namespace, import('./core-sync-state.js').CoreState | null>} */
  #prevLocalState = createNamespaceMap(null)
  /** @type {SyncStatus} */
  #syncStatus = createNamespaceMap('unknown')
  /** @type {Map<import('hypercore')<'binary', any>, ReturnType<import('hypercore')['download']>>} */
  #downloadingRanges = new Map()
  /** @type {SyncStatus} */
  #prevSyncStatus = createNamespaceMap('unknown')

  /**
   * @param {object} opts
   * @param {import("protomux")<import('../types.js').NoiseStream>} opts.protomux
   * @param {import("../core-manager/index.js").CoreManager} opts.coreManager
   * @param {import("./sync-state.js").SyncState} opts.syncState
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   */
  constructor({ protomux, coreManager, syncState, capabilities }) {
    this.#coreManager = coreManager
    this.#protomux = protomux
    this.#capabilities = capabilities

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
    // The remotePublicKey is only available after the noise stream has
    // connected. We shouldn't get a state change before the noise stream has
    // connected, but if we do we can ignore it because we won't have any useful
    // information until it connects.
    if (!this.#protomux.stream.remotePublicKey) return
    const peerId = this.#protomux.stream.remotePublicKey.toString('hex')
    this.#syncStatus = getSyncStatus(peerId, state)
    const localState = mapObject(state, (ns, nsState) => {
      return [ns, nsState.localState]
    })

    // Map of which namespaces have received new data since last sync change
    const didUpdate = mapObject(state, (ns) => {
      const nsDidSync =
        this.#prevSyncStatus[ns] !== 'synced' &&
        this.#syncStatus[ns] === 'synced'
      const prevNsState = this.#prevLocalState[ns]
      const nsDidUpdate =
        nsDidSync &&
        (prevNsState === null || prevNsState.have !== localState[ns].have)
      if (nsDidUpdate) {
        this.#prevLocalState[ns] = localState[ns]
      }
      return [ns, nsDidUpdate]
    })
    this.#prevSyncStatus = this.#syncStatus

    if (didUpdate.auth) {
      try {
        const cap = await this.#capabilities.getCapabilities(peerId)
        this.#syncCapability = cap.sync
      } catch (e) {
        // Any error, consider sync blocked
        this.#syncCapability = createNamespaceMap('blocked')
      }
    }
    // console.log(peerId.slice(0, 7), this.#syncCapability)
    // console.log(peerId.slice(0, 7), didUpdate)
    // console.dir(state, { depth: null, colors: true })

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
    if (this.#enabledNamespaces.has(namespace)) return
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
    if (!this.#enabledNamespaces.has(namespace)) return
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
 * @template T
 * @param {T} value
 * @returns {Record<Namespace, T>} */
function createNamespaceMap(value) {
  const map = /** @type {Record<Namespace, T>} */ ({})
  for (const ns of NAMESPACES) {
    map[ns] = value
  }
  return map
}
