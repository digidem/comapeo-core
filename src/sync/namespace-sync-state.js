import { CoreSyncState } from './core-sync-state.js'
import { discoveryKey } from 'hypercore-crypto'

/**
 * @typedef {Omit<import('./core-sync-state.js').DerivedState, 'coreLength'>} SyncState
 */

/**
 * @template {import('../core-manager/index.js').Namespace} [TNamespace=import('../core-manager/index.js').Namespace]
 */
export class NamespaceSyncState {
  /** @type {Map<string, CoreSyncState>} */
  #coreStates = new Map()
  #handleUpdate
  #namespace
  /** @type {SyncState | null} */
  #cachedState = null

  /**
   * @param {object} opts
   * @param {TNamespace} opts.namespace
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {() => void} opts.onUpdate Called when a state update is available (via getState())
   */
  constructor({ namespace, coreManager, onUpdate }) {
    this.#namespace = namespace
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
      localState: { want: 0, have: 0, wanted: 0, missing: 0 },
      remoteStates: {},
    }
    for (const css of this.#coreStates.values()) {
      const coreState = css.getState()
      mutatingAddPeerState(state.localState, coreState.localState)
      for (const [peerId, peerCoreState] of Object.entries(
        coreState.remoteStates
      )) {
        if (!(peerId in state.remoteStates)) {
          state.remoteStates[peerId] = createPeerState(peerCoreState.connected)
        }
        mutatingAddPeerState(state.remoteStates[peerId], peerCoreState)
      }
    }
    this.#cachedState = state
    return state
  }

  /**
   * @param {import('hypercore')<"binary", Buffer>} core
   * @param {Buffer} coreKey
   */
  #addCore(core, coreKey) {
    const discoveryId = discoveryKey(coreKey).toString('hex')
    this.#getCoreState(discoveryId).attachCore(core)
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
      coreState = new CoreSyncState(this.#handleUpdate)
      this.#coreStates.set(discoveryId, coreState)
    }
    return coreState
  }
}

/** @returns {SyncState['remoteStates'][string]} */
function createPeerState(connected = false) {
  return { want: 0, have: 0, wanted: 0, missing: 0, connected }
}

/**
 * @overload
 * @param {SyncState['localState']} accumulator
 * @param {SyncState['localState']} currentValue
 * @returns {SyncState['localState']}
 */

/**
 * @overload
 * @param {SyncState['remoteStates'][string]} accumulator
 * @param {SyncState['remoteStates'][string]} currentValue
 * @returns {SyncState['remoteStates'][string]}
 */

/**
 * Adds peer state in `currentValue` to peer state in `accumulator`
 *
 * @param {SyncState['remoteStates'][string]} accumulator
 * @param {SyncState['remoteStates'][string]} currentValue
 */
function mutatingAddPeerState(accumulator, currentValue) {
  accumulator.have += currentValue.have
  accumulator.want += currentValue.want
  accumulator.wanted += currentValue.wanted
  accumulator.missing += currentValue.missing
  if ('connected' in accumulator) {
    accumulator.connected = accumulator.connected && currentValue.connected
  }
  return accumulator
}
