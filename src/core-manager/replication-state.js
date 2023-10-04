import { discoveryKey } from 'hypercore-crypto'
import { TypedEmitter } from 'tiny-typed-emitter'
import { CoreReplicationState } from './core-replication-state.js'
import { throttle } from 'throttle-debounce'

/**
 * @typedef {object} State
 * @property {{ have: number, want: number, wanted: number, missing: number }} localState
 */

/**
 * @extends {TypedEmitter<{ state: (state: State) => void }>}
 */
export class ReplicationState extends TypedEmitter {
  /** @type {Map<string, CoreReplicationState>} */
  #coreStates = new Map()
  #handleUpdate

  constructor({ throttleMs = 200 } = {}) {
    super()
    this.#handleUpdate = throttle(throttleMs, () => {
      this.emit('state', this.getState())
    })
  }

  /**
   * @returns {State}
   */
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
   * @param {{ wantAll: boolean }} opts Set `wantAll = false` for cores that do not want all data by default
   */
  addCore(core, { wantAll }) {
    const discoveryId = discoveryKey(core.key).toString('hex')
    this.#getCoreState(discoveryId).attachCore(core, { wantAll })
  }

  /**
   * @param {{
   *   peerId: string,
   *   start: number,
   *   discoveryId: string,
   *   bitfield: Uint32Array
   * }} opts
   */
  insertPreHaves({ peerId, start, discoveryId, bitfield }) {
    this.#getCoreState(discoveryId).insertPreHaves(peerId, start, bitfield)
  }

  /**
   * @param {string} discoveryId
   */
  #getCoreState(discoveryId) {
    let coreState = this.#coreStates.get(discoveryId)
    if (!coreState) {
      coreState = new CoreReplicationState(discoveryId)
      coreState.on('update', this.#handleUpdate)
      this.#coreStates.set(discoveryId, coreState)
    }
    return coreState
  }
}
