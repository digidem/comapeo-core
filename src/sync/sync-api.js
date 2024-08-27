import { TypedEmitter } from 'tiny-typed-emitter'
import { SyncState } from './sync-state.js'
import { PeerSyncController } from './peer-sync-controller.js'
import { Logger } from '../logger.js'
import { NAMESPACES, PRESYNC_NAMESPACES } from '../constants.js'
import { ExhaustivenessError, assert, keyToId } from '../utils.js'

export const kHandleDiscoveryKey = Symbol('handle discovery key')
export const kSyncState = Symbol('sync state')
export const kRequestFullStop = Symbol('background')
export const kRescindFullStopRequest = Symbol('foreground')

/**
 * @typedef {'initial' | 'full'} SyncType
 */

/**
 * @typedef {'none' | 'presync' | 'all'} SyncEnabledState
 */

/**
 * @internal
 * @typedef {object} RemoteDeviceNamespaceGroupSyncState
 * @property {boolean} isSyncEnabled do we want to sync this namespace group?
 * @property {number} want number of blocks this device wants from us
 * @property {number} wanted number of blocks we want from this device
 */

/**
 * @internal
 * @typedef {object} RemoteDeviceSyncState state of sync for a remote peer
 * @property {RemoteDeviceNamespaceGroupSyncState} initial state of initial namespaces (auth, config, and blob index)
 * @property {RemoteDeviceNamespaceGroupSyncState} data state of data namespaces (data and blob)
 */

/**
 * @typedef {object} State
 * @property {{ isSyncEnabled: boolean }} initial state of initial namespace syncing (auth, config, and blob index) for local device
 * @property {{ isSyncEnabled: boolean }} data state of data namespace syncing (data and blob) for local device
 * @property {Record<string, RemoteDeviceSyncState>} remoteDeviceSyncState sync states for remote peers
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
  /** @type {Map<string, PeerSyncController>} */
  #pscByPeerId = new Map()
  /** @type {Set<string>} */
  #peerIds = new Set()
  #wantsToSyncData = false
  #hasRequestedFullStop = false
  /** @type {SyncEnabledState} */
  #previousSyncEnabledState = 'none'
  /** @type {null | number} */
  #previousDataHave = null
  /** @type {null | number} */
  #autostopDataSyncAfter = null
  /** @type {null | ReturnType<typeof setTimeout>} */
  #autostopDataSyncTimeout = null
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
    this[kSyncState] = new SyncState({
      coreManager,
      throttleMs,
      peerSyncControllers: this.#pscByPeerId,
    })
    this[kSyncState].setMaxListeners(0)
    this[kSyncState].on('state', (namespaceSyncState) => {
      this.#updateState(namespaceSyncState)
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
    const remoteDeviceSyncState = getRemoteDevicesSyncState(
      namespaceSyncState,
      this.#peerSyncControllers.values()
    )

    switch (this.#previousSyncEnabledState) {
      case 'none':
        return {
          initial: { isSyncEnabled: false },
          data: { isSyncEnabled: false },
          remoteDeviceSyncState,
        }
      case 'presync':
        return {
          initial: { isSyncEnabled: true },
          data: { isSyncEnabled: false },
          remoteDeviceSyncState,
        }
      case 'all':
        return {
          initial: { isSyncEnabled: true },
          data: { isSyncEnabled: true },
          remoteDeviceSyncState,
        }
      default:
        throw new ExhaustivenessError(this.#previousSyncEnabledState)
    }
  }

  /**
   * Update which namespaces are synced and the autostop timeout.
   *
   * The following table describes the expected behavior based on inputs.
   *
   * | Want to sync data? | Full stop requested? | Synced? | Enabled | Timeout |
   * |--------------------|----------------------|---------|---------|---------|
   * | no                 | no                   | no      | presync | off     |
   * | no                 | no                   | yes     | presync | off     |
   * | no                 | yes                  | no      | presync | off     |
   * | no                 | yes                  | yes     | none    | off     |
   * | yes                | no                   | no      | all     | off     |
   * | yes                | no                   | yes     | all     | on      |
   * | yes                | yes                  | no      | all     | off     |
   * | yes                | yes                  | yes     | none    | off     |
   */
  #updateState(namespaceSyncState = this[kSyncState].getState()) {
    const dataHave = namespaceSyncState.data.localState.have
    const hasReceivedNewData = dataHave !== this.#previousDataHave
    if (hasReceivedNewData) {
      this.#clearAutostopDataSyncTimeoutIfExists()
    }
    this.#previousDataHave = dataHave

    /** @type {SyncEnabledState} */ let syncEnabledState
    if (this.#hasRequestedFullStop) {
      this.#clearAutostopDataSyncTimeoutIfExists()
      if (this.#previousSyncEnabledState === 'none') {
        syncEnabledState = 'none'
      } else if (
        isSynced(
          namespaceSyncState,
          this.#wantsToSyncData ? 'full' : 'initial',
          this.#peerSyncControllers
        )
      ) {
        syncEnabledState = 'none'
      } else if (this.#wantsToSyncData) {
        syncEnabledState = 'all'
      } else {
        syncEnabledState = 'presync'
      }
    } else if (this.#wantsToSyncData) {
      if (
        isSynced(
          namespaceSyncState,
          this.#wantsToSyncData ? 'full' : 'initial',
          this.#peerSyncControllers
        )
      ) {
        if (typeof this.#autostopDataSyncAfter === 'number') {
          this.#autostopDataSyncTimeout ??= setTimeout(() => {
            this.#wantsToSyncData = false
            this.#updateState()
          }, this.#autostopDataSyncAfter)
        }
      } else {
        this.#clearAutostopDataSyncTimeoutIfExists()
      }
      syncEnabledState = 'all'
    } else {
      this.#clearAutostopDataSyncTimeoutIfExists()
      syncEnabledState = 'presync'
    }

    this.#l.log(`Setting sync enabled state to "${syncEnabledState}"`)
    for (const peerSyncController of this.#peerSyncControllers.values()) {
      peerSyncController.setSyncEnabledState(syncEnabledState)
    }

    this.#previousSyncEnabledState = syncEnabledState

    this.emit('sync-state', this.#getState(namespaceSyncState))
  }

  /**
   * Start syncing data cores.
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
    this.#wantsToSyncData = true
    if (autostopDataSyncAfter === undefined) {
      this.#updateState()
    } else {
      this.setAutostopDataSyncTimeout(autostopDataSyncAfter)
    }
  }

  /**
   * Stop syncing data cores.
   *
   * Pre-sync cores will continue syncing unless the app is backgrounded.
   */
  stop() {
    this.#wantsToSyncData = false
    this.#updateState()
  }

  /**
   * Request a graceful stop to all sync.
   */
  [kRequestFullStop]() {
    this.#hasRequestedFullStop = true
    this.#updateState()
  }

  /**
   * Rescind any requests for a full stop.
   */
  [kRescindFullStopRequest]() {
    this.#hasRequestedFullStop = false
    this.#updateState()
  }

  /**
   * @param {null | number} autostopDataSyncAfter
   * @returns {void}
   */
  setAutostopDataSyncTimeout(autostopDataSyncAfter) {
    assertAutostopDataSyncAfterIsValid(autostopDataSyncAfter)
    this.#clearAutostopDataSyncTimeoutIfExists()
    this.#autostopDataSyncAfter = autostopDataSyncAfter
    this.#updateState()
  }

  /**
   * @param {SyncType} type
   * @returns {Promise<void>}
   */
  async waitForSync(type) {
    const state = this[kSyncState].getState()
    if (isSynced(state, type, this.#peerSyncControllers)) return
    return new Promise((res) => {
      const _this = this
      this[kSyncState].on('state', function onState(state) {
        if (!isSynced(state, type, _this.#peerSyncControllers)) return
        _this[kSyncState].off('state', onState)
        res()
      })
    })
  }

  #clearAutostopDataSyncTimeoutIfExists() {
    if (this.#autostopDataSyncTimeout) {
      clearTimeout(this.#autostopDataSyncTimeout)
      this.#autostopDataSyncTimeout = null
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
    this.#pscByPeerId.set(peerSyncController.peerId, peerSyncController)
    this.#peerIds.add(peerSyncController.peerId)

    // Add peer to all core states (via namespace sync states)
    this[kSyncState].addPeer(peerSyncController.peerId)

    this.#updateState()

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
    const peerId = keyToId(peer.remotePublicKey)
    this.#pscByPeerId.delete(peerId)
    this.#peerIds.delete(peerId)
    this.#pendingDiscoveryKeys.delete(protomux)
  }
}

/**
 * @param {null | number} ms
 * @returns {void}
 */
function assertAutostopDataSyncAfterIsValid(ms) {
  if (ms === null) return
  assert(
    ms > 0 && ms <= 2 ** 31 - 1 && Number.isSafeInteger(ms),
    'auto-stop timeout must be Infinity or a positive integer between 0 and the largest 32-bit signed integer'
  )
}

/**
 * Is the sync state "synced", e.g. is there nothing left to sync
 *
 * @param {import('./sync-state.js').State} state
 * @param {SyncType} type
 * @param {Map<import('protomux'), PeerSyncController>} peerSyncControllers
 */
function isSynced(state, type, peerSyncControllers) {
  const namespaces = type === 'initial' ? PRESYNC_NAMESPACES : NAMESPACES
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
 * @param {import('./sync-state.js').State} namespaceSyncState
 * @param {Iterable<PeerSyncController>} peerSyncControllers
 * @returns {State['remoteDeviceSyncState']}
 */
function getRemoteDevicesSyncState(namespaceSyncState, peerSyncControllers) {
  /** @type {State['remoteDeviceSyncState']} */ const result = {}

  for (const psc of peerSyncControllers) {
    const { peerId } = psc

    /** @type {undefined | boolean} */ let isInitialEnabled
    /** @type {undefined | boolean} */ let isDataEnabled

    for (const namespace of NAMESPACES) {
      const isBlocked = psc.syncCapability[namespace] === 'blocked'
      if (isBlocked) continue

      const peerNamespaceState =
        namespaceSyncState[namespace].remoteStates[peerId]
      if (!peerNamespaceState) continue

      /** @type {boolean} */
      let isSyncEnabled
      switch (peerNamespaceState.status) {
        case 'disconnected':
        case 'connecting':
          isSyncEnabled = false
          break
        case 'connected':
          isSyncEnabled = true
          break
        default:
          throw new ExhaustivenessError(peerNamespaceState.status)
      }

      if (!Object.hasOwn(result, peerId)) {
        result[peerId] = {
          initial: { isSyncEnabled: false, want: 0, wanted: 0 },
          data: { isSyncEnabled: false, want: 0, wanted: 0 },
        }
      }

      /** @type {'initial' | 'data'} */ let namespaceGroup
      const isPresyncNamespace = PRESYNC_NAMESPACES.includes(namespace)
      if (isPresyncNamespace) {
        namespaceGroup = 'initial'
        isInitialEnabled = (isInitialEnabled ?? true) && isSyncEnabled
      } else {
        namespaceGroup = 'data'
        isDataEnabled = (isDataEnabled ?? true) && isSyncEnabled
      }

      result[peerId][namespaceGroup].want += peerNamespaceState.want
      result[peerId][namespaceGroup].wanted += peerNamespaceState.wanted
    }

    if (Object.hasOwn(result, peerId)) {
      result[peerId].initial.isSyncEnabled = Boolean(isInitialEnabled)
      result[peerId].data.isSyncEnabled = Boolean(isDataEnabled)
    }
  }

  return result
}
