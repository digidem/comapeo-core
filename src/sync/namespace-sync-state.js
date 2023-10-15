import { CoreSyncState } from './core-sync-state.js'
import { discoveryKey } from 'hypercore-crypto'

/**
 * @typedef {object} PeerSyncState
 * @property {number} have
 * @property {number} want
 * @property {number} wanted
 * @property {number} missing
 */

/**
 * @typedef {object} SyncState
 * @property {PeerSyncState} localState
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
    const state = {
      localState: { have: 0, want: 0, wanted: 0, missing: 0 },
    }
    for (const crs of this.#coreStates.values()) {
      const { localState } = crs.getState()
      state.localState.have += localState.have
      state.localState.want += localState.want
      state.localState.wanted += localState.wanted
      state.localState.missing += localState.missing
    }
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
