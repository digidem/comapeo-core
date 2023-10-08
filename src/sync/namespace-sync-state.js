import { TypedEmitter } from 'tiny-typed-emitter'
import { throttle } from 'throttle-debounce'
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
 * @extends {TypedEmitter<{ state: (state: SyncState) => void }>}
 */
export class NamespaceSyncState extends TypedEmitter {
  /** @type {Map<string, CoreSyncState>} */
  #coreStates = new Map()
  #handleUpdate
  #namespace

  /**
   * @param {object} opts
   * @param {import('../core-manager/index.js').Namespace} opts.namespace
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {number} [opts.stateEventThrottleMs] Throttle state events to only emit every XX milliseconds
   */
  constructor({ namespace, coreManager, stateEventThrottleMs = 200 }) {
    super()
    this.#namespace = namespace
    this.#handleUpdate = throttle(stateEventThrottleMs, function () {
      this.emit('state', this.getState())
    }).bind(this)

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
      coreState = new CoreSyncState(discoveryId)
      coreState.on('update', this.#handleUpdate)
      this.#coreStates.set(discoveryId, coreState)
    }
    return coreState
  }
}
