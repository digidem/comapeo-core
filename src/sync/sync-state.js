import { TypedEmitter } from 'tiny-typed-emitter'
import { NAMESPACES } from '../constants.js'
import { NamespaceSyncState } from './namespace-sync-state.js'
import { throttle } from 'throttle-debounce'
import mapObject from 'map-obj'

/**
 * @typedef {Record<
 *  import('../core-manager/index.js').Namespace,
 *  import('./namespace-sync-state.js').SyncState
 * >} State
 */

/**
 * Emit sync state when it changes
 * @extends {TypedEmitter<{ state: (state: State) => void}>}
 */
export class SyncState extends TypedEmitter {
  /** @type {State | null} */
  #cachedState = null
  #syncStates =
    /** @type {Record<import('../core-manager/index.js').Namespace, NamespaceSyncState> } */ ({})
  /** @type {Set<import('../core-manager/index.js').Namespace>} */
  #updated = new Set()
  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {number} [opts.throttleMs]
   */
  constructor({ coreManager, throttleMs = 200 }) {
    super()
    const throttledHandleUpdate = throttle(throttleMs, this.#handleUpdate)
    for (const namespace of NAMESPACES) {
      this.#syncStates[namespace] = new NamespaceSyncState({
        namespace,
        coreManager,
        onUpdate: () => {
          // Track which namespaces have updated to improve performance
          this.#updated.add(namespace)
          throttledHandleUpdate()
        },
      })
    }
  }

  /**
   * @param {string} peerId
   */
  addPeer(peerId) {
    for (const nss of Object.values(this.#syncStates)) {
      nss.addPeer(peerId)
    }
  }

  /**
   * @returns {State}
   */
  getState() {
    const state = mapObject(this.#syncStates, (namespace, nss) => {
      // Only re-calculate state if state has updated for that namespace
      const namespaceState =
        this.#cachedState && !this.#updated.has(namespace)
          ? this.#cachedState[namespace]
          : nss.getState()
      return [namespace, namespaceState]
    })
    this.#updated.clear()
    return state
  }

  #handleUpdate = () => {
    this.emit('state', this.getState())
  }
}
