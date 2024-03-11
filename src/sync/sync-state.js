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
  #syncStates =
    /** @type {Record<import('../core-manager/index.js').Namespace, NamespaceSyncState> } */ ({})
  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {number} [opts.throttleMs]
   * @param {string} [opts.deviceIdForDebugging]
   */
  constructor({ coreManager, throttleMs = 200, deviceIdForDebugging }) {
    super()
    const throttledHandleUpdate = throttle(throttleMs, this.#handleUpdate)
    for (const namespace of NAMESPACES) {
      this.#syncStates[namespace] = new NamespaceSyncState({
        namespace,
        coreManager,
        deviceIdForDebugging,
        onUpdate: () => {
          console.log(`@@@@ SyncState (${deviceIdForDebugging}) got onUpdate from ` + namespace)
          throttledHandleUpdate()
        }
      })
    }
  }

  /**
   * @returns {State}
   */
  getState() {
    return mapObject(this.#syncStates, (namespace, nss) => [
      namespace,
      nss.getState(),
    ])
  }

  #handleUpdate = () => {
    this.emit('state', this.getState())
  }
}
