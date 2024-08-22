import mapObject from 'map-obj'
import { NAMESPACES } from '../constants.js'
import { Logger } from '../logger.js'
import { ExhaustivenessError, createMap } from '../utils.js'
/** @import { CoreRecord, Namespace } from '../core-manager/index.js' */
/** @import { Role } from '../roles.js' */
/** @import { SyncEnabledState } from './sync-api.js' */

/**
 * @typedef {Role['sync'][Namespace] | 'unknown'} SyncCapability
 */

/** @type {Namespace[]} */
export const PRESYNC_NAMESPACES = ['auth', 'config', 'blobIndex']

export class PeerSyncController {
  #replicatingCores = new Set()
  /** @type {Set<Namespace>} */
  #enabledNamespaces = new Set()
  #coreManager
  #protomux
  #roles
  /** @type {Record<Namespace, SyncCapability>} */
  #syncCapability = createNamespaceMap('unknown')
  /** @type {SyncEnabledState} */
  #syncEnabledState = 'none'
  /** @type {Record<Namespace, import('./core-sync-state.js').LocalCoreState | null>} */
  #prevLocalState = createNamespaceMap(null)
  /** @type {SyncStatus} */
  #syncStatus = createNamespaceMap('unknown')
  /** @type {Map<import('hypercore')<'binary', any>, ReturnType<import('hypercore')['download']>>} */
  #downloadingRanges = new Map()
  /** @type {SyncStatus} */
  #prevSyncStatus = createNamespaceMap('unknown')
  #log

  /**
   * @param {object} opts
   * @param {import("protomux")<import('../utils.js').OpenedNoiseStream>} opts.protomux
   * @param {import("../core-manager/index.js").CoreManager} opts.coreManager
   * @param {import("./sync-state.js").SyncState} opts.syncState
   * @param {import('../roles.js').Roles} opts.roles
   * @param {Logger} [opts.logger]
   */
  constructor({ protomux, coreManager, syncState, roles, logger }) {
    /**
     * @param {string} formatter
     * @param {unknown[]} args
     * @returns {void}
     */
    this.#log = (formatter, ...args) => {
      const log = Logger.create('peer', logger).log
      return log.apply(null, [
        `[%h] ${formatter}`,
        protomux.stream.remotePublicKey,
        ...args,
      ])
    }
    this.#coreManager = coreManager
    this.#protomux = protomux
    this.#roles = roles

    // Always need to replicate the project creator core
    this.#replicateCore(coreManager.creatorCore)

    coreManager.on('add-core', this.#handleAddCore)
    syncState.on('state', this.#handleStateChange)

    this.#updateEnabledNamespaces()
  }

  get peerKey() {
    return this.#protomux.stream.remotePublicKey
  }

  get peerId() {
    return this.peerKey.toString('hex')
  }

  get syncCapability() {
    return this.#syncCapability
  }

  /** @param {SyncEnabledState} syncEnabledState */
  setSyncEnabledState(syncEnabledState) {
    if (this.#syncEnabledState === syncEnabledState) {
      return
    }
    this.#syncEnabledState = syncEnabledState
    this.#updateEnabledNamespaces()
  }

  /**
   * @param {Buffer} discoveryKey
   */
  handleDiscoveryKey(discoveryKey) {
    const coreRecord = this.#coreManager.getCoreByDiscoveryKey(discoveryKey)
    // If we already know about this core, then we will add it to the
    // replication stream when we are ready
    if (coreRecord) {
      this.#log(
        'Received discovery key %h, but already have core in namespace %s',
        discoveryKey,
        coreRecord.namespace
      )
      if (this.#enabledNamespaces.has(coreRecord.namespace)) {
        this.#replicateCore(coreRecord.core)
      }
      return
    }
    if (!this.peerKey) {
      this.#log('Unexpected null peerKey')
      return
    }
    this.#coreManager.requestCoreKey(this.peerKey, discoveryKey)
  }

  /**
   * Handler for 'core-add' event from CoreManager
   * Bound to `this` (defined as static property)
   *
   * @param {CoreRecord} coreRecord
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
    if (!this.peerId) return
    this.#syncStatus = getSyncStatus(this.peerId, state)
    const localState = mapObject(state, (ns, nsState) => {
      return [ns, nsState.localState]
    })
    this.#log('state %X', state)

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
        const cap = await this.#roles.getRole(this.peerId)
        this.#syncCapability = cap.sync
      } catch (e) {
        this.#log('Error reading role', e)
        // Any error, consider sync unknown
        this.#syncCapability = createNamespaceMap('unknown')
      }
    }
    this.#log('capability %o', this.#syncCapability)

    this.#updateEnabledNamespaces()
  }

  /**
   * Enable and disable the appropriate namespaces.
   *
   * If replicating no namespace groups, all namespaces are disabled.
   *
   * If only replicating the initial namespace groups, only the initial
   * namespaces are replicated, assuming the capability permits.
   *
   * If replicating all namespaces, everything is replicated. However, data
   * namespaces are only enabled after the initial namespaces have synced. And
   * again, capabilities are checked.
   */
  #updateEnabledNamespaces() {
    /** @type {boolean} */ let isAnySyncEnabled
    /** @type {boolean} */ let isDataSyncEnabled
    switch (this.#syncEnabledState) {
      case 'none':
        isAnySyncEnabled = isDataSyncEnabled = false
        break
      case 'presync':
        isAnySyncEnabled = true
        isDataSyncEnabled = false
        break
      case 'all':
        isAnySyncEnabled = isDataSyncEnabled = true
        break
      default:
        throw new ExhaustivenessError(this.#syncEnabledState)
    }

    for (const ns of NAMESPACES) {
      if (!isAnySyncEnabled) {
        this.#disableNamespace(ns)
        continue
      }

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
        } else if (isDataSyncEnabled) {
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
        throw new ExhaustivenessError(cap)
      }
    }
  }

  /**
   * @param {import('hypercore')<'binary', any>} core
   */
  #replicateCore(core) {
    if (core.closed) return
    if (this.#replicatingCores.has(core)) return
    this.#log('replicating core %k', core.key)
    core.replicate(this.#protomux)
    core.on('peer-remove', (peer) => {
      if (!peer.remotePublicKey.equals(this.peerKey)) return
      this.#log('peer-remove %h from core %k', peer.remotePublicKey, core.key)
    })
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
    this.#log('unreplicating core %k', core.key)
    peerToUnreplicate.channel.close()
    this.#replicatingCores.delete(core)
  }

  /**
   * @param {Namespace} namespace
   */
  #enableNamespace(namespace) {
    if (this.#enabledNamespaces.has(namespace)) return
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#replicateCore(core)
    }
    this.#enabledNamespaces.add(namespace)
    this.#log('enabled namespace %s', namespace)
  }

  /**
   * @param {Namespace} namespace
   */
  #disableNamespace(namespace) {
    if (!this.#enabledNamespaces.has(namespace)) return
    for (const { core } of this.#coreManager.getCores(namespace)) {
      this.#unreplicateCore(core)
    }
    this.#enabledNamespaces.delete(namespace)
    this.#log('disabled namespace %s', namespace)
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
 **/
function createNamespaceMap(value) {
  return createMap(NAMESPACES, value)
}
