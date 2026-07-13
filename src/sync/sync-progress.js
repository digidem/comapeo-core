import { TypedEmitter } from 'tiny-typed-emitter'
import { throttle } from 'throttle-debounce'
import { discoveryKey } from 'hypercore-crypto'
import { NAMESPACES } from '../constants.js'
import { Logger } from '../logger.js'
import { CoreSyncState } from './core-sync-state.js'
/** @import { Namespace } from '../types.js' */
/** @import { SyncProgressSnapshot, NamespaceProgress, DeviceNamespaceProgress } from './sync-rules.js' */

/**
 * @typedef {object} SyncProgressEvents
 * @property {(snapshot: SyncProgressSnapshot) => void} update
 */

/**
 * Observes sync progress for every core in the project: one `CoreSyncState`
 * per core, grouped by namespace, aggregated into a single immutable
 * {@link SyncProgressSnapshot}. Updates are throttled into one `'update'`
 * event.
 *
 * This class only *observes* — decisions about what to replicate are made
 * elsewhere (see `sync-rules.js` and `PeerManager`). Peers must be registered
 * with {@link addPeer} so that every core (including cores added later)
 * tracks state for every connected peer.
 *
 * @extends {TypedEmitter<SyncProgressEvents>}
 */
export class SyncProgress extends TypedEmitter {
  /** @type {Map<Namespace, Map<string, CoreSyncState>>} */
  #coreStates = new Map()
  /** @type {Map<Namespace, NamespaceProgress | null>} */
  #cache = new Map()
  /** @type {Set<string>} */
  #registeredDeviceIds = new Set()
  #coreManager
  #blobStore
  #isPeerSyncAllowed
  #throttledEmitUpdate
  #logger
  #isClosed = false

  /**
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import('../blob-store/index.js').BlobStore} opts.blobStore
   * @param {(deviceId: string, namespace: Namespace) => boolean} opts.isPeerSyncAllowed
   * whether a peer's role allows syncing a namespace — blocked peers are
   * excluded from derived counts
   * @param {number} [opts.throttleMs]
   * @param {Logger} [opts.logger]
   */
  constructor({
    coreManager,
    blobStore,
    isPeerSyncAllowed,
    throttleMs = 200,
    logger,
  }) {
    super()
    this.#logger = logger
    this.#coreManager = coreManager
    this.#blobStore = blobStore
    this.#isPeerSyncAllowed = isPeerSyncAllowed
    this.#throttledEmitUpdate = throttle(throttleMs, () => {
      if (this.#isClosed) return
      this.emit('update', this.getSnapshot())
    })

    for (const namespace of NAMESPACES) {
      this.#coreStates.set(namespace, new Map())
      this.#cache.set(namespace, null)
    }

    for (const namespace of NAMESPACES) {
      for (const { core, key } of coreManager.getCores(namespace)) {
        this.#addCore(namespace, core, key)
      }
    }

    coreManager.on('add-core', this.#onAddCore)
    coreManager.on('peer-have', this.#onPeerHave)
    blobStore.on('blob-filter', this.#onBlobFilter)
    blobStore.on('want-blob-range', this.#onWantBlobRange)
  }

  /**
   * Stop listening and emitting updates. Idempotent.
   */
  close() {
    if (this.#isClosed) return
    this.#isClosed = true
    this.#coreManager.off('add-core', this.#onAddCore)
    this.#coreManager.off('peer-have', this.#onPeerHave)
    this.#blobStore.off('blob-filter', this.#onBlobFilter)
    this.#blobStore.off('want-blob-range', this.#onWantBlobRange)
    this.#throttledEmitUpdate.cancel()
    for (const coreStates of this.#coreStates.values()) {
      for (const coreState of coreStates.values()) {
        coreState.close()
      }
    }
  }

  /**
   * Discard cached derived state and (throttled) emit a fresh update. Must be
   * called when an input to state derivation *outside* the cores changes —
   * specifically a peer's sync capability, which decides whether the peer's
   * blocks are counted at all. Without this, capability changes would leave
   * stale counts in the snapshot until the next block-level event.
   */
  invalidate() {
    if (this.#isClosed) return
    for (const namespace of NAMESPACES) {
      this.#cache.set(namespace, null)
    }
    this.#throttledEmitUpdate()
  }

  /**
   * Start tracking state for a connected peer on every core, including cores
   * added while the peer is connected.
   *
   * @param {string} deviceId
   */
  addPeer(deviceId) {
    if (this.#registeredDeviceIds.has(deviceId)) return
    this.#registeredDeviceIds.add(deviceId)
    for (const coreStates of this.#coreStates.values()) {
      for (const coreState of coreStates.values()) {
        coreState.addPeer(deviceId)
      }
    }
  }

  /**
   * Remove all state for a disconnected peer.
   *
   * @param {string} deviceId
   */
  removePeer(deviceId) {
    if (!this.#registeredDeviceIds.delete(deviceId)) return
    for (const coreStates of this.#coreStates.values()) {
      for (const coreState of coreStates.values()) {
        coreState.removePeer(deviceId)
      }
    }
  }

  /** @returns {SyncProgressSnapshot} */
  getSnapshot() {
    const snapshot = /** @type {SyncProgressSnapshot} */ ({})
    for (const namespace of NAMESPACES) {
      snapshot[namespace] = this.#getNamespaceProgress(namespace)
    }
    return snapshot
  }

  /**
   * @param {Namespace} namespace
   * @returns {NamespaceProgress}
   */
  #getNamespaceProgress(namespace) {
    const cached = this.#cache.get(namespace)
    if (cached) return cached

    const coreStates = this.#getCoreStates(namespace)
    /** @type {NamespaceProgress} */
    const progress = {
      coreCount: coreStates.size,
      local: { have: 0, toReceive: 0, toSend: 0 },
      devices: {},
    }
    for (const coreState of coreStates.values()) {
      const { local, devices } = coreState.getState()
      progress.local.have += local.have
      progress.local.toReceive += local.toReceive
      progress.local.toSend += local.toSend
      for (const [deviceId, peerCoreState] of Object.entries(devices)) {
        let deviceProgress = progress.devices[deviceId]
        if (!deviceProgress) {
          deviceProgress = progress.devices[deviceId] = {
            have: 0,
            toReceive: 0,
            toSend: 0,
            openingChannels: 0,
            openChannels: 0,
          }
        }
        deviceProgress.have += peerCoreState.have
        deviceProgress.toReceive += peerCoreState.toReceive
        deviceProgress.toSend += peerCoreState.toSend
        if (peerCoreState.channel === 'opening') {
          deviceProgress.openingChannels++
        } else if (peerCoreState.channel === 'open') {
          deviceProgress.openChannels++
        }
      }
    }
    this.#cache.set(namespace, progress)
    return progress
  }

  /** @param {import('../core-manager/index.js').CoreRecord} coreRecord */
  #onAddCore = ({ core, namespace, key }) => {
    this.#addCore(namespace, core, key)
  }

  /**
   * @param {Namespace} namespace
   * @param {import('hypercore')<'binary', Buffer>} core
   * @param {Buffer} coreKey
   */
  #addCore(namespace, core, coreKey) {
    const discoveryId = discoveryKey(coreKey).toString('hex')
    this.#getOrCreateCoreState(namespace, discoveryId).attachCore(core)
  }

  /**
   * @type {import('../core-manager/index.js').Events['peer-have']}
   */
  #onPeerHave = (namespace, { coreDiscoveryId, peerId, start, bitfield }) => {
    this.#getOrCreateCoreState(namespace, coreDiscoveryId).insertPreHaves(
      peerId,
      start,
      bitfield
    )
  }

  /** @type {import('../blob-store/index.js').BlobStoreEvents['blob-filter']} */
  #onBlobFilter = (peerId, filter) => {
    const wantsEverything = !filter
    for (const coreState of this.#getCoreStates('blob').values()) {
      coreState.setWantsEverything(peerId, wantsEverything)
    }
  }

  /** @type {import('../blob-store/index.js').BlobStoreEvents['want-blob-range']} */
  #onWantBlobRange = ({ blobCoreId, peerId, start, length }) => {
    this.#getOrCreateCoreState('blob', blobCoreId).addWantRange(
      peerId,
      start,
      length
    )
  }

  /**
   * @param {Namespace} namespace
   * @returns {Map<string, CoreSyncState>}
   */
  #getCoreStates(namespace) {
    const coreStates = this.#coreStates.get(namespace)
    // Set up for all namespaces in the constructor
    if (!coreStates) throw new Error(`Unknown namespace ${namespace}`)
    return coreStates
  }

  /**
   * @param {Namespace} namespace
   * @param {string} discoveryId
   * @returns {CoreSyncState}
   */
  #getOrCreateCoreState(namespace, discoveryId) {
    const coreStates = this.#getCoreStates(namespace)
    let coreState = coreStates.get(discoveryId)
    if (!coreState) {
      coreState = new CoreSyncState({
        onUpdate: () => this.#handleUpdate(namespace),
        isPeerSyncAllowed: (deviceId) =>
          this.#isPeerSyncAllowed(deviceId, namespace),
        deviceId: this.#coreManager.deviceId,
        hasDownloadFilter: (deviceId) =>
          namespace === 'blob' && !!this.#blobStore.getBlobFilter(deviceId),
        logger: Logger.create('coreSyncState:' + namespace, this.#logger, {
          prefix: `[${discoveryId.slice(0, 7)}] `,
        }),
      })
      // Track state for already-connected peers on late-discovered cores.
      // The peer may have no way of knowing this core exists (we may have
      // learned of it from a device they have never synced with), so don't
      // assume they want its blocks until there is evidence they know it —
      // otherwise completion would block on them forever.
      for (const deviceId of this.#registeredDeviceIds) {
        coreState.addPeer(deviceId, { assumeCoreKnown: false })
      }
      coreStates.set(discoveryId, coreState)
    }
    return coreState
  }

  /** @param {Namespace} namespace */
  #handleUpdate(namespace) {
    if (this.#isClosed) return
    this.#cache.set(namespace, null)
    this.#throttledEmitUpdate()
  }
}
