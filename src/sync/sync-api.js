import { TypedEmitter } from 'tiny-typed-emitter'
import WebSocket from 'ws'
import { Logger } from '../logger.js'
import { DATA_SYNC_NAMESPACES } from '../constants.js'
import { noop } from '../utils.js'
import { wsCoreReplicator } from '../lib/ws-core-replicator.js'
import { AutoStopTimeoutError } from '../errors.js'
import { PeerManager } from './peer-manager.js'
import { SyncProgress } from './sync-progress.js'
import {
  computeSyncMode,
  deriveSyncApiState,
  isSyncComplete,
  isTargetCompleteWithDevice,
} from './sync-rules.js'
/** @import * as http from 'node:http' */
/** @import { ReplicationStream } from '../types.js' */
/** @import { SyncApiState, SyncMode, SyncTarget } from './sync-rules.js' */

export const kHandleDiscoveryKey = Symbol('handle discovery key')
export const kSyncProgress = Symbol('sync progress')
export const kPeerManager = Symbol('peer manager')
export const kRequestFullStop = Symbol('request full stop')
export const kRescindFullStopRequest = Symbol('rescind full stop request')
export const kWaitForInitialSyncWithPeer = Symbol(
  'wait for initial sync with peer'
)

/** @typedef {SyncApiState} State */

/**
 * @typedef {object} SyncEvents
 * @property {(syncState: SyncApiState) => void} sync-state
 */

/**
 * Public sync API for a project, and the owner of the sync subsystem's
 * lifecycle. Holds the device-wide sync *intent* (has data sync been started?
 * is the app backgrounded?), turns it into a {@link SyncMode} via the pure
 * rules in `sync-rules.js`, and applies that mode to the connected peers
 * (owned by {@link PeerManager}). Sync progress is observed by
 * {@link SyncProgress}; everything reported or awaited here is derived from
 * its snapshots with the shared predicates.
 *
 * @extends {TypedEmitter<SyncEvents>}
 */
export class SyncApi extends TypedEmitter {
  #wantsDataSync = false
  #isBackgrounded = false
  /** @type {SyncMode} */
  #syncMode = 'initial'
  /** @type {null | number} */
  #previousDataHave = null
  /** @type {null | number} */
  #autostopDataSyncAfter = null
  /** @type {null | ReturnType<typeof setTimeout>} */
  #autostopDataSyncTimeout = null
  #wantsToConnectToServers = false
  /** @type {Map<string, WebSocket>} */
  #serverWebsockets = new Map()
  #isRecomputing = false
  #recomputeQueued = false
  #isClosed = false
  /** @type {PeerManager} */
  #peerManager
  /** @type {SyncProgress} */
  #syncProgress
  #getServerWebsocketUrls
  #getReplicationStream
  #makeWebsocket
  #l

  /**
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {import('../core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {import('../roles.js').Roles} opts.roles
   * @param {import('../blob-store/index.js').BlobStore} opts.blobStore
   * @param {(url: string) => WebSocket} [opts.makeWebsocket]
   * @param {() => Promise<Iterable<string>>} opts.getServerWebsocketUrls
   * @param {() => ReplicationStream} opts.getReplicationStream
   * @param {number} [opts.throttleMs]
   * @param {Logger} [opts.logger]
   */
  constructor({
    coreManager,
    coreOwnership,
    roles,
    blobStore,
    makeWebsocket = (url) => new WebSocket(url),
    getServerWebsocketUrls,
    getReplicationStream,
    throttleMs = 200,
    logger,
  }) {
    super()
    this.#l = Logger.create('syncApi', logger)
    this.#makeWebsocket = makeWebsocket
    this.#getServerWebsocketUrls = getServerWebsocketUrls
    this.#getReplicationStream = getReplicationStream

    this.#syncProgress = new SyncProgress({
      coreManager,
      blobStore,
      isPeerSyncAllowed: (deviceId, namespace) =>
        this.#peerManager.isPeerSyncAllowed(deviceId, namespace),
      throttleMs,
      logger,
    })
    this.#syncProgress.setMaxListeners(0)

    this.#peerManager = new PeerManager({
      coreManager,
      roles,
      coreOwnership,
      getSnapshot: () => this.#syncProgress.getSnapshot(),
      logger,
    })

    this.#peerManager.on('peer-registered', (deviceId) => {
      this.#syncProgress.addPeer(deviceId)
    })
    this.#peerManager.on('peer-unregistered', (deviceId) => {
      this.#syncProgress.removePeer(deviceId)
    })
    this.#peerManager.on('capability-change', () => {
      // Capability decides whether a peer's blocks are counted at all, so
      // cached derived state is stale as soon as it changes
      this.#syncProgress.invalidate()
    })
    this.#peerManager.on('change', () => {
      this.#recomputeAndEmit()
    })
    this.#syncProgress.on('update', () => {
      this.#peerManager.onSnapshotUpdate()
      this.#recomputeAndEmit()
    })
  }

  /** Used by tests */
  get [kSyncProgress]() {
    return this.#syncProgress
  }

  /** Used by tests */
  get [kPeerManager]() {
    return this.#peerManager
  }

  /** @type {import('../local-peers.js').LocalPeersEvents['discovery-key']} */
  [kHandleDiscoveryKey](discoveryKey, protomux) {
    if (this.#isClosed) return
    this.#peerManager.handleDiscoveryKey(discoveryKey, protomux)
  }

  /**
   * Get the current sync state. Also emitted via the 'sync-state' event
   * whenever it changes.
   *
   * @returns {SyncApiState}
   */
  getState() {
    return deriveSyncApiState({
      snapshot: this.#syncProgress.getSnapshot(),
      connectedPeers: this.#peerManager.peers,
      syncMode: this.#syncMode,
    })
  }

  /**
   * Start syncing data namespaces (in addition to the initial namespaces,
   * which sync whenever a peer is connected).
   *
   * If the app is backgrounded and sync has already completed, this will do
   * nothing until the app is foregrounded.
   *
   * @param {object} [options]
   * @param {null | number} [options.autostopDataSyncAfter] If no data sync
   * happens after this duration in milliseconds, sync will be automatically
   * stopped as if {@link stop} was called.
   */
  start({ autostopDataSyncAfter } = {}) {
    this.#wantsDataSync = true
    if (autostopDataSyncAfter === undefined) {
      this.#recomputeAndEmit()
    } else {
      this.setAutostopDataSyncTimeout(autostopDataSyncAfter)
    }
  }

  /**
   * Stop syncing data namespaces.
   *
   * Initial namespaces will continue syncing unless the app is backgrounded.
   */
  stop() {
    this.#wantsDataSync = false
    this.#recomputeAndEmit()
  }

  /**
   * Request a graceful stop of all sync: sync continues until nothing is left
   * to transfer, then stops entirely until the request is rescinded. Called
   * when the app is backgrounded.
   */
  [kRequestFullStop]() {
    this.#isBackgrounded = true
    this.#recomputeAndEmit()
  }

  /**
   * Rescind any requests for a full stop. Called when the app is foregrounded.
   */
  [kRescindFullStopRequest]() {
    this.#isBackgrounded = false
    this.#recomputeAndEmit()
  }

  /**
   * @param {null | number} autostopDataSyncAfter
   * @returns {void}
   */
  setAutostopDataSyncTimeout(autostopDataSyncAfter) {
    assertAutostopDataSyncAfterIsValid(autostopDataSyncAfter)
    this.#clearAutostopDataSyncTimeoutIfExists()
    this.#autostopDataSyncAfter = autostopDataSyncAfter
    this.#recomputeAndEmit()
  }

  /**
   * @returns {void}
   */
  connectServers() {
    this.#wantsToConnectToServers = true

    this.#getServerWebsocketUrls()
      .then((urls) => {
        const hasDisconnectedSinceWebsocketUrlsRequestFinished =
          !this.#wantsToConnectToServers
        if (hasDisconnectedSinceWebsocketUrlsRequestFinished) return

        for (const url of urls) {
          const existingWebsocket = this.#serverWebsockets.get(url)
          if (
            existingWebsocket &&
            (existingWebsocket.readyState === WebSocket.OPEN ||
              existingWebsocket.readyState === WebSocket.CONNECTING)
          ) {
            continue
          }

          const websocket = this.#makeWebsocket(url)

          /** @param {Error} err */
          const onWebsocketError = (err) => {
            this.#l.log('Ignoring WebSocket error to %s: %o', url, err)
          }
          websocket.on('error', onWebsocketError)

          /**
           * @param {unknown} _req
           * @param {http.IncomingMessage} res
           */
          const onWebsocketUnexpectedResponse = (_req, res) => {
            this.#l.log(
              'Ignoring unexpected %d WebSocket response to %s',
              res.statusCode,
              url
            )
          }
          websocket.on('unexpected-response', onWebsocketUnexpectedResponse)

          const replicationStream = this.#getReplicationStream()
          wsCoreReplicator(websocket, replicationStream).catch(noop)

          this.#serverWebsockets.set(url, websocket)
          websocket.once('close', () => {
            websocket.off('error', onWebsocketError)
            websocket.off('unexpected-response', onWebsocketUnexpectedResponse)
            this.#serverWebsockets.delete(url)
          })
        }
      })
      .catch(noop)
  }

  /**
   * @returns {void}
   */
  disconnectServers() {
    for (const websocket of this.#serverWebsockets.values()) {
      websocket.close()
    }
    this.#serverWebsockets.clear()
    this.#wantsToConnectToServers = false
  }

  /**
   * Resolves when sync is complete for the given target: nothing left to send
   * to or receive from any connected device (`'initial'` considers only the
   * initial namespaces; `'all'` considers everything).
   *
   * @param {SyncTarget} target
   * @param {object} [options]
   * @param {number} [options.timeoutMs] Timeout in milliseconds for max time
   * to wait between sync state updates before giving up. As long as syncing
   * is happening, this will never timeout, but if more than timeoutMs passes
   * without any sync activity, then this will reject.
   * @returns {Promise<void>}
   */
  async waitForSync(target, { timeoutMs } = {}) {
    return new Promise((resolve, reject) => {
      /** @type {NodeJS.Timeout | undefined} */
      let timeoutId
      const check = () => {
        clearTimeout(timeoutId)
        if (this.#isSyncComplete(target)) {
          this.off('sync-state', check)
          resolve()
          return
        }
        if (typeof timeoutMs === 'number') {
          timeoutId = setTimeout(onTimeout, timeoutMs)
        }
      }
      const onTimeout = () => {
        this.off('sync-state', check)
        reject(new Error('Sync timeout'))
      }
      this.on('sync-state', check)
      check()
    })
  }

  /**
   * Resolves when initial sync with the given device is complete: we have
   * received everything they have (and they, everything we have) in the
   * auth, config and blobIndex namespaces. Used during the invite flow, so a
   * newly-joined peer has the project membership and config before the invite
   * is considered complete.
   *
   * @param {string} deviceId
   * @param {AbortSignal} abortSignal
   * @returns {Promise<void>}
   */
  async [kWaitForInitialSyncWithPeer](deviceId, abortSignal) {
    abortSignal.throwIfAborted()

    const isComplete = () => {
      const peer = this.#peerManager.getPeer(deviceId)
      if (!peer) return false
      return isTargetCompleteWithDevice(
        this.#syncProgress.getSnapshot(),
        peer,
        'initial'
      )
    }

    if (isComplete()) return

    return new Promise((resolve, reject) => {
      const check = () => {
        if (isComplete()) {
          cleanup()
          resolve()
        }
      }
      const onAbort = () => {
        cleanup()
        reject(abortSignal.reason)
      }
      const cleanup = () => {
        this.off('sync-state', check)
        abortSignal.removeEventListener('abort', onAbort)
      }
      this.on('sync-state', check)
      abortSignal.addEventListener('abort', onAbort)
    })
  }

  /**
   * Stop all syncing and tear down everything owned by the sync subsystem:
   * timers, websockets, event listeners, and per-peer replication state.
   * Idempotent. Must be called before closing the core manager.
   */
  close() {
    if (this.#isClosed) return
    this.#isClosed = true
    this.#clearAutostopDataSyncTimeoutIfExists()
    this.disconnectServers()
    this.#peerManager.close()
    this.#syncProgress.close()
  }

  /**
   * @param {SyncTarget} target
   * @returns {boolean}
   */
  #isSyncComplete(target) {
    return isSyncComplete(
      this.#syncProgress.getSnapshot(),
      this.#peerManager.peers,
      target
    )
  }

  /**
   * Recompute the sync mode from the current intent and progress, apply it to
   * the peers, manage the autostop timer, and emit the public state. Safe
   * against re-entrancy (applying a mode can change peer state, which calls
   * this again): inner calls queue another pass, and the public event is
   * emitted once, after the state has stabilized.
   */
  #recomputeAndEmit() {
    if (this.#isClosed) return
    if (this.#isRecomputing) {
      this.#recomputeQueued = true
      return
    }
    this.#isRecomputing = true
    do {
      this.#recomputeQueued = false
      this.#recompute()
    } while (this.#recomputeQueued)
    this.#isRecomputing = false
    this.emit('sync-state', this.getState())
  }

  #recompute() {
    const snapshot = this.#syncProgress.getSnapshot()

    const dataHave = DATA_SYNC_NAMESPACES.reduce(
      (total, namespace) => total + snapshot[namespace].local.have,
      0
    )
    const hasReceivedNewData = dataHave !== this.#previousDataHave
    if (hasReceivedNewData) {
      this.#clearAutostopDataSyncTimeoutIfExists()
    }
    this.#previousDataHave = dataHave

    const isComplete = isSyncComplete(
      snapshot,
      this.#peerManager.peers,
      this.#wantsDataSync ? 'all' : 'initial'
    )

    const syncMode = computeSyncMode({
      wantsDataSync: this.#wantsDataSync,
      isBackgrounded: this.#isBackgrounded,
      isComplete,
      previousMode: this.#syncMode,
    })

    if (this.#isBackgrounded) {
      this.#clearAutostopDataSyncTimeoutIfExists()
    } else if (this.#wantsDataSync && isComplete) {
      if (typeof this.#autostopDataSyncAfter === 'number') {
        this.#autostopDataSyncTimeout ??= setTimeout(() => {
          this.#autostopDataSyncTimeout = null
          this.#wantsDataSync = false
          this.#recomputeAndEmit()
        }, this.#autostopDataSyncAfter)
      }
    } else {
      this.#clearAutostopDataSyncTimeoutIfExists()
    }

    if (syncMode !== this.#syncMode) {
      this.#l.log(`Setting sync mode to "${syncMode}"`)
      this.#syncMode = syncMode
      this.#peerManager.setSyncMode(syncMode)
    }
  }

  #clearAutostopDataSyncTimeoutIfExists() {
    if (this.#autostopDataSyncTimeout) {
      clearTimeout(this.#autostopDataSyncTimeout)
      this.#autostopDataSyncTimeout = null
    }
  }
}

/**
 * @param {null | number} ms
 * @returns {void}
 */
function assertAutostopDataSyncAfterIsValid(ms) {
  if (ms === null) return
  if (!(ms > 0 && ms <= 2 ** 31 - 1 && Number.isSafeInteger(ms))) {
    throw new AutoStopTimeoutError()
  }
}
