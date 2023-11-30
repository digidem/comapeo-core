import { NAMESPACES } from '../core-manager/index.js'
import { Logger } from '../logger.js'

/**
 * @typedef {import('../core-manager/index.js').Namespace} Namespace
 */
/**
 * @typedef {import('../capabilities.js').Capability['sync'][Namespace] | 'unknown'} SyncCapability
 */

/** @type {Namespace[]} */
export const PRESYNC_NAMESPACES = ['auth', 'config', 'blobIndex']

export class PeerSyncController {
  /** @type {Set<import('hypercore')<any, any>>} */
  #replicatingCores = new Set()
  /** @type {Set<Namespace>} */
  #enabledNamespaces = new Set()
  #coreManager
  #creatorCorePeer
  #capabilities
  /** @type {Record<Namespace, SyncCapability>} */
  #syncCapability = createNamespaceMap('unknown')
  #isDataSyncEnabled = false
  #hasSentHaves = createNamespaceMap(false)
  #log
  #syncState
  #presyncDone = false

  /**
   * @param {object} opts
   * @param {import('./sync-api.js').Peer} opts.creatorCorePeer
   * @param {import("../core-manager/index.js").CoreManager} opts.coreManager
   * @param {import("./sync-state.js").SyncState} opts.syncState
   * @param {import("../capabilities.js").Capabilities} opts.capabilities
   * @param {Logger} [opts.logger]
   */
  constructor({
    creatorCorePeer,
    coreManager,
    syncState,
    capabilities,
    logger,
  }) {
    // @ts-ignore
    this.#log = (formatter, ...args) => {
      const log = Logger.create('peer', logger).log
      return log.apply(null, [
        `[%h] ${formatter}`,
        creatorCorePeer.remotePublicKey,
        ...args,
      ])
    }
    this.#coreManager = coreManager
    this.#creatorCorePeer = creatorCorePeer
    this.#capabilities = capabilities
    this.#syncState = syncState

    // The creator core is replicating before this instance is created
    this.#replicatingCores = new Set([coreManager.creatorCore])

    // A PeerSyncController instance is only created once the creator cores are
    // replicating, which imeans that the peer has the project key, so now we
    // can send all the auth core keys.
    //
    // We could reduce network traffic by delaying sending this until we see
    // which keys the peer already has, so that we only send the keys they are
    // missing. However the network traffic cost of sending keys is low (it's 8
    // bytes * number of devices in a project) vs. the delay in sync e.g. if the
    // delay is more than the time it takes to share the keys, it's not worth
    // it.
    coreManager.sendAuthCoreKeys(creatorCorePeer)

    coreManager.on('add-core', this.#handleAddCore)
    syncState.on('state', this.#handleStateChange)
    capabilities.on('update', this.#handleCapabilitiesUpdate)

    this.#updateEnabledNamespaces()
  }

  get protomux() {
    return this.#creatorCorePeer.protomux
  }

  get peerKey() {
    return this.#creatorCorePeer.remotePublicKey
  }

  get peerId() {
    return this.peerKey.toString('hex')
  }

  get syncCapability() {
    return this.#syncCapability
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
   * @param {Buffer} discoveryKey
   */
  handleDiscoveryKey(discoveryKey) {
    const coreRecord = this.#coreManager.getCoreByDiscoveryKey(discoveryKey)
    // If we don't have the core record, we'll add and replicate it when we
    // receive the core key via an extension or from a core ownership record.
    if (!coreRecord) return

    this.#log(
      'Received discovery key %h, but already have core in namespace %s',
      discoveryKey,
      coreRecord.namespace
    )
    if (this.#enabledNamespaces.has(coreRecord.namespace)) {
      this.#replicateCore(coreRecord.core)
    }
  }

  destroy() {
    this.#coreManager.off('add-core', this.#handleAddCore)
    this.#syncState.off('state', this.#handleStateChange)
    this.#capabilities.off('update', this.#handleCapabilitiesUpdate)
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
    if (this.#presyncDone) return
    const syncStatus = getSyncStatus(this.peerId, state)
    this.#presyncDone = PRESYNC_NAMESPACES.every((ns) => {
      return syncStatus[ns] === 'synced'
    })
    if (!this.#presyncDone) return
    this.#log('Pre-sync done')
    // Once pre-sync is done, if data sync is enabled and the peer has the
    // correct capabilities, then we will enable sync of data namespaces
    this.#updateEnabledNamespaces()
  }

  /**
   * Handler for capabilities being updated. If they have changed for this peer
   * then we update enabled namespaces and send pre-haves for any namespaces
   * authorized for sync
   *
   * @param {import('@mapeo/schema').Role[]} docs
   */
  #handleCapabilitiesUpdate = async (docs) => {
    const peerRoleUpdated = docs.some((doc) => doc.docId === this.peerId)
    if (!peerRoleUpdated) return
    const prevSyncCapability = this.#syncCapability
    try {
      const cap = await this.#capabilities.getCapabilities(this.peerId)
      this.#syncCapability = cap.sync
    } catch (e) {
      this.#log('Error reading capability', e)
      // Any error, consider sync unknown
      this.#syncCapability = createNamespaceMap('unknown')
    }
    const syncCapabilityChanged = !shallowEqual(
      prevSyncCapability,
      this.#syncCapability
    )
    if (!syncCapabilityChanged) return

    this.#log('Sync capability changed %o', this.#syncCapability)
    this.#updateEnabledNamespaces()

    // Send pre-haves for any namespaces that the peer is allowed to sync
    for (const ns of NAMESPACES) {
      if (ns === 'auth') continue
      if (this.#hasSentHaves[ns]) continue
      if (this.#syncCapability[ns] !== 'allowed') continue
      this.#coreManager.sendHaves(this.#creatorCorePeer, ns)
      this.#log('Sent pre-haves for %s', ns)
      this.#hasSentHaves[ns] = true
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
        } else if (this.#isDataSyncEnabled && this.#presyncDone) {
          // Only enable data namespaces once the pre-sync namespaces have synced
          this.#enableNamespace(ns)
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
    this.#log('replicating core %k', core.key)
    core.replicate(this.#creatorCorePeer.protomux)
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
      (peer) => peer.protomux === this.#creatorCorePeer.protomux
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
 * @returns {Record<Namespace, T>} */
function createNamespaceMap(value) {
  const map = /** @type {Record<Namespace, T>} */ ({})
  for (const ns of NAMESPACES) {
    map[ns] = value
  }
  return map
}

/**
 * Very naive shallow equal, but all we need for comparing sync capabilities
 *
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @returns
 */
function shallowEqual(a, b) {
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) return false
  }
  return true
}
