import { TypedEmitter } from 'tiny-typed-emitter'
import { NAMESPACES } from '../constants.js'
import { Logger } from '../logger.js'
import { keyToId, noop } from '../utils.js'
import { unreplicate } from '../lib/hypercore-helpers.js'
import { BLOCKED_ROLE_ID, NO_ROLE, NO_ROLE_ID } from '../roles.js'
import {
  computeEnabledNamespaces,
  isNamespacesCompleteWithDevice,
  isTargetCompleteWithDevice,
} from './sync-rules.js'
/** @import { CoreRecord } from '../core-manager/index.js' */
/** @import { CoreOwnership as CoreOwnershipDoc } from '@comapeo/schema' */
/** @import { Namespace } from '../types.js' */
/** @import { OpenedNoiseStream } from '../lib/noise-secret-stream-helpers.js' */
/** @import { PeerFacts, SyncCapability, SyncMode, SyncProgressSnapshot } from './sync-rules.js' */

// Only used for identity (keying connections) and passing to
// `core.replicate()`, so the stream type parameter doesn't matter
/** @typedef {import('protomux')<any>} Protomux */

/**
 * How long to hold on to discovery keys that arrive before the peer's
 * connection completes (creator core `peer-add`). If we are part of the
 * project the `peer-add` follows within a round-trip; if we are not, the keys
 * are dropped after this timeout to avoid a leak.
 */
const PENDING_DISCOVERY_KEY_TIMEOUT_MS = 500

/**
 * A connected device. One instance per *device* — not per connection: a
 * device that briefly has two connections (e.g. an overlapping reconnect) is
 * still one `SyncPeer`, and its sync state survives until the last connection
 * closes. This is the single source of truth for "who is connected", which
 * every completion and progress question is derived from.
 *
 * Owns which namespaces replicate with the device, and the device's sync
 * capability (from its role). Capability is written by exactly one code path
 * ({@link refreshCapability}), sequenced so a stale read can never overwrite
 * a newer one.
 */
export class SyncPeer {
  /** @type {Map<Protomux, Set<import('hypercore')<'binary', Buffer>>>} */
  #replicatingCoresByConnection = new Map()
  /** @type {Set<Namespace>} */
  #enabledNamespaces = new Set()
  /** @type {SyncCapability} */
  #capability = { ...NO_ROLE.sync }
  #capabilityReadId = 0
  /**
   * Latch: set once auth sync with this device has completed, the synced
   * records have been indexed, and the capability re-read (see
   * `PeerManager#openAuthGateForPeer`). Nothing beyond the auth namespace
   * replicates with this device until this is set. Reset only by device
   * disconnect (this instance is discarded).
   */
  hasSyncedAuth = false
  /** Guard so only one auth-gate sequence runs at a time for this peer */
  authGateInProgress = false
  /**
   * Latch: set once initial sync with this device completes, so that data
   * namespaces don't churn off if new initial data arrives later. Reset only
   * by device disconnect (this instance is discarded).
   */
  hasCompletedInitialSync = false
  #deviceId
  #coreManager
  #roles
  #onChange
  #log

  /**
   * @param {object} opts
   * @param {string} opts.deviceId
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import('../roles.js').Roles} opts.roles
   * @param {(changed: 'capability' | 'enabled-namespaces') => void} opts.onChange
   * called when capability or enabled namespaces change
   * @param {Logger} [opts.logger]
   */
  constructor({ deviceId, coreManager, roles, onChange, logger }) {
    this.#deviceId = deviceId
    this.#coreManager = coreManager
    this.#roles = roles
    this.#onChange = onChange
    this.#log = Logger.create('syncPeer', logger, {
      prefix: `[${deviceId.slice(0, 7)}] `,
    }).log
  }

  get deviceId() {
    return this.#deviceId
  }

  /** @returns {SyncCapability} */
  get capability() {
    return this.#capability
  }

  /** @returns {ReadonlySet<Namespace>} */
  get enabledNamespaces() {
    return this.#enabledNamespaces
  }

  get connectionCount() {
    return this.#replicatingCoresByConnection.size
  }

  /** @param {Protomux} protomux */
  hasConnection(protomux) {
    return this.#replicatingCoresByConnection.has(protomux)
  }

  /** @param {Protomux} protomux */
  addConnection(protomux) {
    if (this.#replicatingCoresByConnection.has(protomux)) return
    this.#replicatingCoresByConnection.set(protomux, new Set())
    // The creator core replicates with every connected peer — that is what
    // makes them "connected" — and is never unreplicated by us.
    this.#replicateCore(this.#coreManager.creatorCore, protomux)
    for (const namespace of this.#enabledNamespaces) {
      for (const { core } of this.#coreManager.getCores(namespace)) {
        this.#replicateCore(core, protomux)
      }
    }
  }

  /**
   * @param {Protomux} protomux
   * @returns {boolean} true if this was the device's last connection
   */
  removeConnection(protomux) {
    this.#replicatingCoresByConnection.delete(protomux)
    return this.#replicatingCoresByConnection.size === 0
  }

  /**
   * Discard replication tracking. No explicit unreplication: the connections
   * are closing (or being closed by the caller), and protomux tears down the
   * replication channels with them.
   */
  close() {
    this.#enabledNamespaces.clear()
    this.#replicatingCoresByConnection.clear()
  }

  /**
   * Re-read this device's role and update its sync capability. The only
   * writer of {@link capability}. Sequenced: if a newer read starts while an
   * older one is in flight, the older result is discarded.
   *
   * @returns {Promise<void>}
   */
  async refreshCapability() {
    const readId = ++this.#capabilityReadId
    /** @type {SyncCapability} */
    let capability
    try {
      const role = await this.#roles.getRole(this.#deviceId)
      // Copy: ROLES.*.sync is a shared object reference
      capability = { ...role.sync }
    } catch (e) {
      this.#log('Error reading role, assuming no role', e)
      capability = { ...NO_ROLE.sync }
    }
    if (readId !== this.#capabilityReadId) return
    const changed = NAMESPACES.some(
      (ns) => capability[ns] !== this.#capability[ns]
    )
    this.#capability = capability
    if (changed) {
      this.#log('capability %o', capability)
      this.#onChange('capability')
    }
  }

  /**
   * Set which namespaces replicate with this device. Replicates/unreplicates
   * cores for the difference with the currently enabled set.
   *
   * @param {Set<Namespace>} namespaces
   */
  setEnabledNamespaces(namespaces) {
    let changed = false
    for (const namespace of NAMESPACES) {
      const shouldEnable = namespaces.has(namespace)
      const isEnabled = this.#enabledNamespaces.has(namespace)
      if (shouldEnable === isEnabled) continue
      changed = true
      if (shouldEnable) {
        this.#enabledNamespaces.add(namespace)
        for (const { core } of this.#coreManager.getCores(namespace)) {
          for (const protomux of this.#replicatingCoresByConnection.keys()) {
            this.#replicateCore(core, protomux)
          }
        }
        this.#log('enabled namespace %s', namespace)
      } else {
        this.#enabledNamespaces.delete(namespace)
        this.#unreplicateNamespace(namespace)
        this.#log('disabled namespace %s', namespace)
      }
    }
    if (changed) this.#onChange('enabled-namespaces')
  }

  /**
   * Called when a core is added to the core manager: start replicating it if
   * its namespace is enabled for this device.
   *
   * @param {CoreRecord} coreRecord
   */
  handleCoreAdded({ core, namespace }) {
    if (!this.#enabledNamespaces.has(namespace)) return
    for (const protomux of this.#replicatingCoresByConnection.keys()) {
      this.#replicateCore(core, protomux)
    }
  }

  /**
   * Called when the peer sends a discovery key for a core over a connection.
   * If we know the core and its namespace is enabled, replicate it on that
   * connection.
   *
   * @param {Buffer} discoveryKey
   * @param {Protomux} protomux
   */
  handleDiscoveryKey(discoveryKey, protomux) {
    const coreRecord = this.#coreManager.getCoreByDiscoveryKey(discoveryKey)
    if (!coreRecord) {
      this.#log('Received unknown discovery key %h', discoveryKey)
      return
    }
    if (!this.#enabledNamespaces.has(coreRecord.namespace)) {
      this.#log(
        'Received discovery key %h for core %k, but namespace %s is disabled',
        discoveryKey,
        coreRecord.key,
        coreRecord.namespace
      )
      return
    }
    if (this.#replicatingCoresByConnection.has(protomux)) {
      this.#replicateCore(coreRecord.core, protomux)
    }
  }

  /**
   * @param {import('hypercore')<'binary', Buffer>} core
   * @param {Protomux} protomux
   */
  #replicateCore(core, protomux) {
    if (core.closed) return
    const replicatingCores = this.#replicatingCoresByConnection.get(protomux)
    if (!replicatingCores || replicatingCores.has(core)) return
    this.#log('replicating core %k', core.key)
    core.replicate(protomux)
    replicatingCores.add(core)
  }

  /** @param {Namespace} namespace */
  #unreplicateNamespace(namespace) {
    for (const { core } of this.#coreManager.getCores(namespace)) {
      if (core === this.#coreManager.creatorCore) continue
      for (const [protomux, replicatingCores] of this
        .#replicatingCoresByConnection) {
        if (!replicatingCores.delete(core)) continue
        this.#unreplicateCore(core, protomux).catch(noop)
      }
    }
  }

  /**
   * @param {import('hypercore')<'binary', Buffer>} core
   * @param {Protomux} protomux
   * @returns {Promise<void>}
   */
  async #unreplicateCore(core, protomux) {
    const isCoreReady = Boolean(core.discoveryKey)
    if (!isCoreReady) {
      await core.ready()
      const replicatingCores = this.#replicatingCoresByConnection.get(protomux)
      const wasReEnabledWhileWaiting = replicatingCores?.has(core)
      if (wasReEnabledWhileWaiting || !replicatingCores) return
    }
    unreplicate(core, protomux)
    this.#log('unreplicated core %k', core.key)
  }
}

/**
 * @typedef {object} PeerManagerEvents
 * @property {() => void} change the set of connected peers, a peer's
 * capability, or a peer's enabled namespaces changed
 * @property {(deviceId: string) => void} peer-registered a device connected
 * @property {(deviceId: string) => void} peer-unregistered a device's last
 * connection closed
 * @property {() => void} capability-change a peer's sync capability changed —
 * derived sync progress must be invalidated, because capability decides
 * whether a peer's blocks are counted
 */

/**
 * The registry of connected devices, and the machinery that keeps each
 * device's replication in line with the current sync mode, the device's role
 * capability, and initial-sync completion.
 *
 * Also owns the discovery of peer cores from core-ownership records: when a
 * role or core-ownership record is indexed for a device whose role permits
 * sync, that device's cores are added to the core manager.
 *
 * @extends {TypedEmitter<PeerManagerEvents>}
 */
export class PeerManager extends TypedEmitter {
  /** @type {Map<string, SyncPeer>} */
  #peers = new Map()
  /** @type {Map<Protomux, SyncPeer>} */
  #peersByConnection = new Map()
  /** @type {Map<Protomux, Set<Buffer>>} */
  #pendingDiscoveryKeys = new Map()
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  #pendingDiscoveryKeyTimeouts = new Set()
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  #gateRetryTimeouts = new Set()
  /** @type {SyncMode} */
  #syncMode = 'initial'
  #coreManager
  #roles
  #coreOwnership
  #getSnapshot
  #waitForAuthIndexing
  #isClosed = false
  #logger
  #l

  /**
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import('../roles.js').Roles} opts.roles
   * @param {import('../core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {() => SyncProgressSnapshot} opts.getSnapshot
   * @param {() => Promise<void>} opts.waitForAuthIndexing resolves when the
   * auth namespace indexer is idle, i.e. downloaded role and core-ownership
   * records have taken effect
   * @param {Logger} [opts.logger]
   */
  constructor({
    coreManager,
    roles,
    coreOwnership,
    getSnapshot,
    waitForAuthIndexing,
    logger,
  }) {
    super()
    this.#l = Logger.create('peerManager', logger)
    this.#logger = logger
    this.#coreManager = coreManager
    this.#roles = roles
    this.#coreOwnership = coreOwnership
    this.#getSnapshot = getSnapshot
    this.#waitForAuthIndexing = waitForAuthIndexing

    coreManager.creatorCore.on('peer-add', this.#onPeerAdd)
    coreManager.creatorCore.on('peer-remove', this.#onPeerRemove)
    coreManager.on('add-core', this.#onCoreAdded)
    roles.on('update', this.#onRoleRecordsIndexed)
    coreOwnership.on('update', this.#onCoreOwnershipRecordsIndexed)

    // Add cores for all members we already know about
    this.#coreOwnership
      .getAll()
      .then((coreOwnerships) =>
        Promise.allSettled(
          coreOwnerships.map(async (coreOwnership) => {
            if (this.#isClosed) return
            if (coreOwnership.docId === coreManager.deviceId) return
            await this.#addCoresForPeer(coreOwnership)
          })
        )
      )
      .catch(noop)
  }

  /** @returns {Iterable<SyncPeer>} connected peers */
  get peers() {
    return this.#peers.values()
  }

  /** @param {string} deviceId */
  getPeer(deviceId) {
    return this.#peers.get(deviceId)
  }

  /**
   * Whether a peer's role allows syncing a namespace. Used to exclude blocked
   * peers from sync progress counts. Devices we know nothing about are not
   * excluded.
   *
   * @param {string} deviceId
   * @param {Namespace} namespace
   * @returns {boolean}
   */
  isPeerSyncAllowed(deviceId, namespace) {
    const peer = this.#peers.get(deviceId)
    if (!peer) return true
    return peer.capability[namespace] === 'allowed'
  }

  /**
   * Set the device-wide sync mode and apply it to every connected peer.
   *
   * @param {SyncMode} syncMode
   */
  setSyncMode(syncMode) {
    if (this.#syncMode === syncMode) return
    this.#syncMode = syncMode
    this.#applyRulesToPeers()
  }

  /**
   * Re-evaluate which namespaces should replicate with each peer. Called by
   * the sync API whenever a new sync progress snapshot is available (this is
   * how data namespaces get enabled once initial sync with a peer completes).
   */
  onSnapshotUpdate() {
    this.#applyRulesToPeers()
  }

  /**
   * Handle a discovery key received over a connection. If the connection
   * doesn't have a peer yet (the creator core `peer-add` hasn't fired), the
   * key is queued briefly.
   *
   * @param {Buffer} discoveryKey
   * @param {Protomux} protomux
   */
  handleDiscoveryKey(discoveryKey, protomux) {
    const peer = this.#peersByConnection.get(protomux)
    if (peer) {
      peer.handleDiscoveryKey(discoveryKey, protomux)
      return
    }
    // We will reach here if we are not part of the project, so we can ignore
    // these keys. However it's also possible to reach here when we are part of
    // a project, but the creator core `peer-add` event has not yet fired, so
    // we queue this to be handled in `#onPeerAdd`
    const queue = this.#pendingDiscoveryKeys.get(protomux) || new Set()
    queue.add(discoveryKey)
    this.#pendingDiscoveryKeys.set(protomux, queue)

    const timeout = setTimeout(() => {
      this.#pendingDiscoveryKeyTimeouts.delete(timeout)
      const queue = this.#pendingDiscoveryKeys.get(protomux)
      if (!queue) return
      queue.delete(discoveryKey)
      if (queue.size === 0) {
        this.#pendingDiscoveryKeys.delete(protomux)
      }
    }, PENDING_DISCOVERY_KEY_TIMEOUT_MS)
    this.#pendingDiscoveryKeyTimeouts.add(timeout)
  }

  /**
   * Disconnect and discard all peers, stop listening. Idempotent.
   */
  close() {
    if (this.#isClosed) return
    this.#isClosed = true
    this.#coreManager.creatorCore.off('peer-add', this.#onPeerAdd)
    this.#coreManager.creatorCore.off('peer-remove', this.#onPeerRemove)
    this.#coreManager.off('add-core', this.#onCoreAdded)
    this.#roles.off('update', this.#onRoleRecordsIndexed)
    this.#coreOwnership.off('update', this.#onCoreOwnershipRecordsIndexed)
    for (const timeout of this.#pendingDiscoveryKeyTimeouts) {
      clearTimeout(timeout)
    }
    this.#pendingDiscoveryKeyTimeouts.clear()
    for (const timeout of this.#gateRetryTimeouts) {
      clearTimeout(timeout)
    }
    this.#gateRetryTimeouts.clear()
    this.#pendingDiscoveryKeys.clear()
    for (const peer of this.#peers.values()) {
      peer.close()
    }
    this.#peers.clear()
    this.#peersByConnection.clear()
    this.emit('change')
  }

  /**
   * Called whenever a peer is successfully added to the creator core, which
   * means that the peer has the project key. Bound to `this`.
   *
   * @param {import('../types.js').HypercorePeer & { protomux: Protomux }} peer
   */
  #onPeerAdd = (peer) => {
    const { protomux } = peer
    const deviceId = keyToId(peer.remotePublicKey)

    let syncPeer = this.#peers.get(deviceId)
    const isNewDevice = !syncPeer
    if (!syncPeer) {
      syncPeer = new SyncPeer({
        deviceId,
        coreManager: this.#coreManager,
        roles: this.#roles,
        onChange: (changedFacet) => {
          if (this.#isClosed) return
          if (changedFacet === 'capability') this.emit('capability-change')
          this.emit('change')
        },
        logger: this.#logger,
      })
      this.#peers.set(deviceId, syncPeer)
      this.#l.log('Connected to device %S', deviceId)
    } else if (syncPeer.hasConnection(protomux)) {
      this.#l.log('Unexpected duplicate connection for device %S', deviceId)
      return
    } else {
      this.#l.log('Additional connection for device %S', deviceId)
    }

    this.#peersByConnection.set(protomux, syncPeer)
    syncPeer.addConnection(protomux)

    if (isNewDevice) {
      // Register with sync progress first so state is seeded before any
      // completion questions are asked about this device
      this.emit('peer-registered', deviceId)
      this.#applyRulesToPeer(syncPeer)
      this.#refreshPeerCapability(deviceId)
      this.emit('change')
    }

    const queue = this.#pendingDiscoveryKeys.get(protomux)
    if (queue) {
      for (const discoveryKey of queue) {
        syncPeer.handleDiscoveryKey(discoveryKey, protomux)
      }
      this.#pendingDiscoveryKeys.delete(protomux)
    }
  }

  /**
   * Called when a connection to a peer closes. Only when the *last*
   * connection to a device closes is the device disconnected — a stale
   * connection's teardown can never remove a live connection's state. Bound
   * to `this`.
   *
   * @param {{ protomux: Protomux, remotePublicKey: Buffer }} peer
   */
  #onPeerRemove = (peer) => {
    const { protomux } = peer
    const syncPeer = this.#peersByConnection.get(protomux)
    this.#peersByConnection.delete(protomux)
    this.#pendingDiscoveryKeys.delete(protomux)
    if (!syncPeer) {
      this.#l.log('Connection closed for unknown peer %h', peer.remotePublicKey)
      return
    }
    const wasLastConnection = syncPeer.removeConnection(protomux)
    if (!wasLastConnection) {
      this.#l.log(
        'Connection closed for device %S (still connected)',
        syncPeer.deviceId
      )
      return
    }
    this.#l.log('Disconnected from device %S', syncPeer.deviceId)
    syncPeer.close()
    this.#peers.delete(syncPeer.deviceId)
    this.emit('peer-unregistered', syncPeer.deviceId)
    this.emit('change')
  }

  /** @param {CoreRecord} coreRecord Bound to `this` */
  #onCoreAdded = (coreRecord) => {
    for (const peer of this.#peers.values()) {
      peer.handleCoreAdded(coreRecord)
    }
  }

  /**
   * Apply the sync rules to every connected peer.
   */
  #applyRulesToPeers() {
    for (const peer of this.#peers.values()) {
      this.#applyRulesToPeer(peer)
    }
  }

  /** @param {SyncPeer} peer */
  #applyRulesToPeer(peer) {
    const snapshot = this.#getSnapshot()
    if (
      !peer.hasSyncedAuth &&
      isNamespacesCompleteWithDevice(snapshot, peer, ['auth'])
    ) {
      this.#openAuthGateForPeer(peer)
    }
    if (!peer.hasCompletedInitialSync && peer.hasSyncedAuth) {
      // Latch, so data sync doesn't churn off if new initial data arrives
      peer.hasCompletedInitialSync = isTargetCompleteWithDevice(
        snapshot,
        peer,
        'initial'
      )
    }
    peer.setEnabledNamespaces(
      computeEnabledNamespaces({
        syncMode: this.#syncMode,
        capability: peer.capability,
        hasSyncedAuth: peer.hasSyncedAuth,
        isInitialSyncComplete: peer.hasCompletedInitialSync,
      })
    )
  }

  /**
   * Open the "auth gate" for a peer: auth blocks are fully synced with this
   * device, but before anything beyond auth may replicate we must (1) wait
   * for those blocks to be *indexed* — role and core-ownership records take
   * effect at index time, not download time — and (2) re-read the peer's
   * capability from them. This closes the window where a stale role record
   * (e.g. for a device removed from the project while we were offline) would
   * let other namespaces start replicating before we learn of the removal.
   *
   * Guarded so only one gate-opening sequence runs per peer; if auth becomes
   * incomplete again while waiting (new records arrived), the gate stays
   * closed and the next snapshot update retries.
   *
   * @param {SyncPeer} peer
   */
  #openAuthGateForPeer(peer) {
    if (peer.hasSyncedAuth || peer.authGateInProgress) return
    peer.authGateInProgress = true
    ;(async () => {
      // Loop until a full pass sees no new auth blocks arriving between the
      // indexing wait and the capability read — a record that downloads
      // while we are reading the role must also take effect before the gate
      // opens. Bounded; if auth churns continuously the next snapshot
      // update retries.
      for (let attempt = 0; attempt < 5; attempt++) {
        const authHaveBefore = this.#getSnapshot().auth.local.have
        await this.#waitForAuthIndexing()
        await peer.refreshCapability()
        // Records that finished downloading during the capability read have
        // not been read — take another pass
        await this.#waitForAuthIndexing()
        if (this.#isClosed) return
        if (this.#peers.get(peer.deviceId) !== peer) return
        if (this.#getSnapshot().auth.local.have !== authHaveBefore) continue
        // Re-check with a fresh snapshot: if auth is no longer complete,
        // leave the gate closed — the snapshot update for the new records
        // will retry
        if (
          !isNamespacesCompleteWithDevice(this.#getSnapshot(), peer, ['auth'])
        ) {
          return
        }
        peer.hasSyncedAuth = true
        this.#l.log('Auth gate open for device %S', peer.deviceId)
        this.#applyRulesToPeer(peer)
        this.emit('change')
        return
      }
    })()
      .catch((e) => {
        // e.g. the indexer rejecting; retry after a beat so an otherwise
        // idle connection doesn't stall with the gate closed
        if (this.#isClosed) return
        this.#l.log('Auth gate error for %S, retrying: %o', peer.deviceId, e)
        const timeout = setTimeout(() => {
          this.#gateRetryTimeouts.delete(timeout)
          if (this.#isClosed || this.#peers.get(peer.deviceId) !== peer) return
          this.#applyRulesToPeer(peer)
        }, 1000)
        this.#gateRetryTimeouts.add(timeout)
      })
      .finally(() => {
        peer.authGateInProgress = false
      })
  }

  /**
   * When role records are indexed: refresh the capability of any connected
   * peer the records are about, and add cores for the peer if their role
   * permits sync. Bound to `this`.
   *
   * @param {Set<string>} roleDocIds
   */
  #onRoleRecordsIndexed = (roleDocIds) => {
    for (const roleDocId of roleDocIds) {
      // Ignore docs about ourselves
      if (roleDocId === this.#coreManager.deviceId) continue
      this.#refreshPeerCapability(roleDocId)
      this.#coreOwnership
        .get(roleDocId)
        .then((coreOwnershipDoc) => {
          if (this.#isClosed) return
          return this.#addCoresForPeer(coreOwnershipDoc)
        })
        .catch(noop)
    }
  }

  /**
   * When core ownership records are indexed: add cores for the owning peer
   * (if their role permits sync), and refresh capability of any connected
   * peer the records are about — a core ownership record can newly identify a
   * device as the project creator. Bound to `this`.
   *
   * @param {Set<string>} coreOwnershipDocIds
   */
  #onCoreOwnershipRecordsIndexed = (coreOwnershipDocIds) => {
    for (const docId of coreOwnershipDocIds) {
      // Ignore our own ownership doc - we don't need to add cores for ourselves
      if (docId === this.#coreManager.deviceId) continue
      this.#refreshPeerCapability(docId)
      this.#coreOwnership
        .get(docId)
        .then((coreOwnershipDoc) => {
          if (this.#isClosed) return
          return this.#addCoresForPeer(coreOwnershipDoc)
        })
        .catch(noop) // Ignore, we'll add these when the role is added
    }
  }

  /** @param {string} deviceId */
  #refreshPeerCapability(deviceId) {
    const peer = this.#peers.get(deviceId)
    if (!peer) return
    peer
      .refreshCapability()
      .then(() => {
        if (this.#isClosed) return
        this.#applyRulesToPeer(peer)
      })
      .catch(noop)
  }

  /**
   * Add the device's non-auth cores to the core manager, so they replicate
   * and are indexed. (Auth cores are added from the project extension
   * messages instead.)
   *
   * @param {CoreOwnershipDoc} coreOwnership
   * @returns {Promise<void>}
   */
  async #addCoresForPeer(coreOwnership) {
    const peerDeviceId = coreOwnership.docId
    const role = await this.#roles.getRole(peerDeviceId)
    if (this.#isClosed) return
    // Only NO_ROLE (never a member) is skipped. BLOCKED and LEFT devices'
    // cores are deliberately still added: blocking revokes a device's
    // ability to *receive* project data, but the data it contributed before
    // being blocked remains project data and must keep propagating.
    if (role.roleId === NO_ROLE_ID) return
    for (const ns of NAMESPACES) {
      if (ns === 'auth') continue
      const coreKey = Buffer.from(coreOwnership[`${ns}CoreId`], 'hex')
      this.#coreManager.addCore(coreKey, ns)
    }
    this.#l.log('Added non-auth cores for peer %S', peerDeviceId)
  }
}
