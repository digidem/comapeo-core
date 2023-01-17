import { TypedEmitter } from 'tiny-typed-emitter'
import { keyToId } from '../utils.js'

export class ReplicationState extends TypedEmitter {
  #cores = new Map()
  #synced = new Set()

  get state() {
    return [...this.#cores.entries()].map(([corePublicId, state]) => {
      return {
        corePublicId,
        state: state.state,
      }
    })
  }

  /**
   *
   * @param {Object} options
   * @param {import('hypercore')[]} options.cores
   */
  constructor(options) {
    super()
    for (const core of options.cores) {
      this.core(core)
    }
  }

  /**
   * Track replication between a core and its peers
   * @param {import('hypercore')} core
   * @returns
   */
  core(core) {
    const corePublicId = keyToId(core.key)

    if (this.#cores.has(corePublicId)) {
      return this.#cores.get(corePublicId)
    }

    const state = new CoreReplicationState({
      core,
    })

    state.on('state', (state) => {
      this.emit('state', this.state)
    })

    state.on('synced', () => {
      this.#synced.add(corePublicId)
      if (this.#synced.size === this.#cores.size) {
        this.emit('synced')
      }
    })

    this.#cores.set(corePublicId, state)
    return state
  }

  close() {
    this.removeAllListeners()
  }
}

/**
 * @typedef {Object} State
 * @property {String} remotePublicId
 * @property {Number} missingLocal
 * @property {Number[]} missingLocalIndexes
 * @property {Number} missingRemote
 * @property {Number[]} missingRemoteIndexes
 * @property {Number} shared
 * @property {Number} total
 */

/**
 * @typedef {Object} InternalState
 * @property {Set<Number>} missingLocal
 * @property {Set<Number>} missingRemote
 * @property {Number} shared
 * @private
 */

export class CoreReplicationState extends TypedEmitter {
  /** @type {import('hypercore')} */
  #core

  /** @type {Map<PublicKeyId, InternalState>} */
  #state = new Map()

  /**
   * @returns {State[]}
   */
  get state() {
    return [...this.#state.entries()].map(([remotePublicId, state]) => {
      return {
        remotePublicId,
        missingLocal: state.missingLocal.size,
        missingLocalIndexes: Array.from(state.missingLocal),
        missingRemote: state.missingRemote.size,
        missingRemoteIndexes: Array.from(state.missingRemote),
        shared: state.shared,
		total: this.#core.length
      }
    })
  }

  /**
   * @param {Object} options
   * @param {import('hypercore')} options.core
   */
  constructor(options) {
    super()

    this.#core = options.core

    for (const peer of this.#core.peers) {
      this.#onPeer(peer)
    }

    this.#core.on('peer-add', (peer) => {
      this.#onPeer(peer)
    })
  }

  /**
   * @param {import('hypercore').HypercorePeer} peer
   */
  async #onPeer(peer) {
    const localBitfield = this.#core.core.bitfield
    const remoteBitfield = peer.remoteBitfield
    const remotePeerId = keyToId(peer.remotePublicKey)

    const state = {
      missingLocal: new Set(),
      missingRemote: new Set(),
      shared: 0,
    }

    await this.#core.update()

	for (let i = 0; i < this.#core.length; i++) {
      const local = localBitfield.get(i)
      const remote = remoteBitfield.get(i)

      if (local && remote) {
        state.shared++
      } else if (local) {
        state.missingRemote.add(i)
      } else if (remote) {
        state.missingLocal.add(i)
      }
  }

	this.#state.set(remotePeerId, state)
	this.emit('state', this.state)

    this.#core.on('download', (index, byteLength, from) => {
      if (!from.remotePublicKey.equals(peer.remotePublicKey)) {
        return
      }

      state.missingLocal.delete(index)
      state.shared++
    })

    const peerOnRange = peer.onrange

    // TODO: replace onrange wrapper with public api when available in hypercore https://github.com/holepunchto/hypercore/issues/310
    /**
     * @param {Object} options
     * @param {Boolean} options.drop
     * @param {Number} options.start
     * @param {Number} options.length
     */
    peer.onrange = ({ drop, start, length }) => {
      for (let i = start; i < start + length; i++) {
        if (!state.missingRemote.has(i) && !state.missingLocal.has(i)) {
          return peerOnRange.call(peer, { drop, start, length })
        }

        if (drop) {
          state.missingRemote.add(i)
        } else {
          state.missingRemote.delete(i)
        }

        if (localBitfield.get(i)) {
          state.missingLocal.delete(i)
          state.missingRemote.delete(i)
          state.shared++
        }

        if (this.isSynced()) {
          this.emit('synced', this.state)
        }

        peerOnRange.call(peer, { drop, start, length })
        this.emit('state', this.state)
      }
    }
  }

  isSynced() {
    return this.state.every((peerState) => {
      return peerState.missingLocal === 0 && peerState.missingRemote === 0
    })
  }
}
