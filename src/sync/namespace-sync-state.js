import { CoreSyncState } from './core-sync-state.js'
import { discoveryKey } from 'hypercore-crypto'
/** @import { Namespace } from '../types.js' */

/**
 * @typedef {Omit<import('./core-sync-state.js').DerivedState, 'coreLength'> & { dataToSync: boolean, coreCount: number }} SyncState
 */

/**
 * @template {Namespace} [TNamespace=Namespace]
 */
export class NamespaceSyncState {
  /** @type {Map<string, CoreSyncState>} */
  #coreStates = new Map()
  #coreCount = 0
  #handleUpdate
  #namespace
  /** @type {SyncState | null} */
  #cachedState = null
  #peerSyncControllers

  /**
   * @param {object} opts
   * @param {TNamespace} opts.namespace
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {() => void} opts.onUpdate Called when a state update is available (via getState())
   * @param {Map<string, import('./peer-sync-controller.js').PeerSyncController>} opts.peerSyncControllers
   */
  constructor({ namespace, coreManager, onUpdate, peerSyncControllers }) {
    this.#namespace = namespace
    this.#peerSyncControllers = peerSyncControllers
    // Called whenever the state changes, so we clear the cache because next
    // call to getState() will need to re-derive the state
    this.#handleUpdate = () => {
      this.#cachedState = null
      process.nextTick(onUpdate)
    }

    for (const { core, key } of coreManager.getCores(namespace)) {
      this.#addCore(core, key)
    }

    coreManager.on('add-core', ({ core, namespace, key }) => {
      if (namespace !== this.#namespace) return
      this.#addCore(core, key)
    })

    coreManager.on('peer-have', (namespace, msg) => {
      if (namespace !== this.#namespace) return
      this.#insertPreHaves(msg)
    })
  }

  get namespace() {
    return this.#namespace
  }

  /** @returns {SyncState} */
  getState() {
    if (this.#cachedState) return this.#cachedState
    /** @type {SyncState} */
    const state = {
      dataToSync: false,
      coreCount: this.#coreCount,
      localState: createState(),
      remoteStates: {},
    }
    for (const css of this.#coreStates.values()) {
      const coreState = css.getState()
      mutatingAddPeerState(state.localState, coreState.localState)
      for (const [peerId, peerCoreState] of Object.entries(
        coreState.remoteStates
      )) {
        if (!(peerId in state.remoteStates)) {
          state.remoteStates[peerId] = peerCoreState
        } else {
          mutatingAddPeerState(state.remoteStates[peerId], peerCoreState)
        }
      }
    }
    if (state.localState.want > 0 || state.localState.wanted > 0) {
      state.dataToSync = true
    }
    this.#cachedState = state
    return state
  }

  /**
   * @param {string} peerId
   */
  addPeer(peerId) {
    for (const css of this.#coreStates.values()) {
      css.addPeer(peerId)
    }
  }

  /**
   * @param {import('hypercore')<"binary", Buffer>} core
   * @param {Buffer} coreKey
   */
  #addCore(core, coreKey) {
    const discoveryId = discoveryKey(coreKey).toString('hex')
    this.#getCoreState(discoveryId).attachCore(core)
    this.#coreCount++
  }

  /**
   * @param {{
   *   peerId: string,
   *   start: number,
   *   coreDiscoveryId: string,
   *   bitfield: Uint32Array
   * }} opts
   */
  #insertPreHaves({ peerId, start, coreDiscoveryId, bitfield }) {
    this.#getCoreState(coreDiscoveryId).insertPreHaves(peerId, start, bitfield)
  }

  /**
   * @param {string} discoveryId
   */
  #getCoreState(discoveryId) {
    let coreState = this.#coreStates.get(discoveryId)
    if (!coreState) {
      coreState = new CoreSyncState({
        onUpdate: this.#handleUpdate,
        peerSyncControllers: this.#peerSyncControllers,
        namespace: this.#namespace,
      })
      this.#coreStates.set(discoveryId, coreState)
    }
    return coreState
  }
}

/**
 * @overload
 * @returns {SyncState['localState']}
 */

/**
 * @overload
 * @param {import('./core-sync-state.js').PeerNamespaceState['status']} status
 * @returns {import('./core-sync-state.js').PeerNamespaceState}
 */

/**
 * @param {import('./core-sync-state.js').PeerNamespaceState['status']} [status]
 */
export function createState(status) {
  if (status) {
    return { want: 0, have: 0, wanted: 0, status }
  } else {
    return { want: 0, have: 0, wanted: 0 }
  }
}

/**
 * @overload
 * @param {SyncState['localState']} accumulator
 * @param {SyncState['localState']} currentValue
 * @returns {SyncState['localState']}
 */

/**
 * @overload
 * @param {import('./core-sync-state.js').PeerNamespaceState} accumulator
 * @param {import('./core-sync-state.js').PeerNamespaceState} currentValue
 * @returns {import('./core-sync-state.js').PeerNamespaceState}
 */

/**
 * Adds peer state in `currentValue` to peer state in `accumulator`
 *
 * @param {import('./core-sync-state.js').PeerNamespaceState} accumulator
 * @param {import('./core-sync-state.js').PeerNamespaceState} currentValue
 */
function mutatingAddPeerState(accumulator, currentValue) {
  accumulator.have += currentValue.have
  accumulator.want += currentValue.want
  accumulator.wanted += currentValue.wanted
  if ('status' in accumulator && accumulator.status !== currentValue.status) {
    if (currentValue.status === 'disconnected') {
      accumulator.status === 'disconnected'
    } else if (
      currentValue.status === 'connecting' &&
      accumulator.status === 'connected'
    ) {
      accumulator.status = 'connecting'
    }
  }
  return accumulator
}
