import { TypedEmitter } from 'tiny-typed-emitter'
import { NAMESPACES } from '../constants.js'
import { NamespaceSyncState } from './namespace-sync-state.js'
import { throttle } from 'throttle-debounce'
import mapObject from 'map-obj'
/** @import { Namespace } from '../types.js' */

/**
 * @typedef {Record<
 *  Namespace,
 *  import('./namespace-sync-state.js').SyncState
 * >} State
 */

/**
 * Emit sync state when it changes
 * @extends {TypedEmitter<{ state: (state: State) => void}>}
 */
export class SyncState extends TypedEmitter {
  #syncStates = /** @type {Record<Namespace, NamespaceSyncState> } */ ({})
  /**
   *
   * @param {object} opts
   * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
   * @param {Map<string, import('./peer-sync-controller.js').PeerSyncController>} opts.peerSyncControllers
   * @param {number} [opts.throttleMs]
   * @param {import('../logger.js').Logger} [opts.logger]
   */
  constructor({ coreManager, peerSyncControllers, throttleMs = 200, logger }) {
    super()
    const throttledHandleUpdate = throttle(throttleMs, this.#handleUpdate)
    for (const namespace of NAMESPACES) {
      this.#syncStates[namespace] = new NamespaceSyncState({
        namespace,
        coreManager,
        onUpdate: throttledHandleUpdate,
        peerSyncControllers,
        logger,
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
   * @param {string} peerId
   */
  disconnectPeer(peerId) {
    for (const nss of Object.values(this.#syncStates)) {
      nss.disconnectPeer(peerId)
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
