import { TypedEmitter } from 'tiny-typed-emitter'
import { idToKey, keyToId, truncateId } from '../utils.js'

export class ReplicationState extends TypedEmitter {
  #coreStates = new Map()

  /**
   * @param {Object} options
   * @param {import('../core-manager/index.js').Namespace} options.namespace
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   */
  constructor(options) {
    super()
    this.coreManager = options.coreManager
    this.namespace = options.namespace

    const coreRecords = this.coreManager.getCores(this.namespace)
    for (const coreRecord of coreRecords) {
      this.#core(coreRecord)
    }

    this.coreManager.on('add-core', (coreRecord) => {
      this.#core(coreRecord)
    })
  }

  get state () {
    return [...this.#coreStates.entries()]
    .reduce((obj, [ corePublicId, state ]) => {
      obj[corePublicId] = state.state
      return obj
    }, {})
  }

  get peers () {
    const peers = new Set()

    for (const state of this.#coreStates.values()) {
        for (const peer of state.peers) {
            peers.add(peer)
        }
    }

    return [...peers]
  }

  isSynced () {
    for (const state of this.#coreStates.values()) {
        if (!state.isSynced()) {
            return false
        }
    }

    return true
  }

  close() {
    this.removeAllListeners()
    for (const state of this.#coreStates.values()) {
      state.close()
    }
  }

  /**
   *
   * @param {import('../core-manager/core-index.js').CoreRecord} coreRecord
   */
    #core(coreRecord) {
      const core = coreRecord.core
      const corePublicId = keyToId(coreRecord.key)
  
      if (this.#coreStates.has(corePublicId)) {
          return this.#coreStates.get(corePublicId)
      }
  
      const state = new CoreReplicationState({
          core
      })
  
      state.on('state', () => {
          this.emit('state', this.state)
      })
  
      state.on('synced', () => {
          if (this.isSynced()) {
              this.emit('synced')
          }
      })
  
      this.#coreStates.set(corePublicId, state)
    }
  
}

/**
 * @typedef {Object} PeerState
 * @property {Number} want
 * @private
 */


export class CoreReplicationState extends TypedEmitter {
  /** @type {import('hypercore')} */
  #core

  /** @type {Map<PeerPublicId, PeerState>} */
  #state = new Map()

  /**
   * @param {Object} options
   * @param {import('hypercore')} options.core
   */
  constructor(options) {
    super()

    this.#core = options.core
    this.#setInitialCoreState(this.#core)

    for (const peer of this.#core.peers) {
      this.#onPeer(peer)
    }

    this.#core.on('peer-add', (peer) => {
      this.#onPeer(peer)
    })
  }

  get state() {
    return [...this.#state.entries()].reduce((obj, [peerId, state]) => {
      obj[peerId] = state
      return obj
    }, {})
  }

  get peers() {
    return [...this.#state.keys()].filter((peerId) => {
        return peerId !== keyToId(this.#core.key)
    })
  }

  isSynced() {
    for (const [id, state] of this.#state.entries()) {
        if (state.want > 0) {
            return false
        }
    }

    return true
  }

  close() {
    this.removeAllListeners()
  }

  #createState() {
    return {
      want: 0,
    }
  }

  #setInitialCoreState(core) {
    const localBitfield = core.bitfield
    const state = this.#createState()

    for (let i = 0; i < core.length; i++) {
      if (!localBitfield.get(i)) {
        state.want++
      }
    }

    this.#setPeerState(core.key, state)
  }

  #setPeerState(peerPublicKey, state) {
    const peerId = keyToId(peerPublicKey)
    const existingState = this.#state.get(peerId)
    // if (existingState && existingState.want === newState.want
    //   && existingState.length === newState.length) {
    //   return
    // }
    this.#state.set(peerId, state)
    this.emit('state', state)
    if (this.isSynced()) {
      this.emit('synced', state)
    }
  }

  #updatePeerState(peer) {
    const localBitfield = this.#core.core.bitfield
    const remoteBitfield = peer.remoteBitfield
    const localState = this.#createState()
    const remoteState = this.#createState()

    const length = Math.max(this.#core.length, peer.remoteLength)
    let haveLocal = 0
    let haveRemote = 0

    for (let i = 0; i < length; i++) {
        const local = localBitfield.get(i)
        const remote = remoteBitfield.get(i)
  
        if (local) {
            haveLocal++
        }

        if (remote) {
            haveRemote++
        }
    }

    localState.want = length - haveLocal
    localState.length = length
    remoteState.want = length - haveRemote
    remoteState.length = length

    this.#setPeerState(this.#core.key, localState)
    this.#setPeerState(peer.remotePublicKey, remoteState)
  }

  async #onPeer(peer) {
    await this.#core.update()

    this.#core.on('download', (index, byteLength, from) => {
        const state = this.getPeerState(this.#core.key)
        state.want--
        this.#setPeerState(this.#core.key, state)
    })

    const peerOnBitfield = peer.onbitfield
    const peerOnRange = peer.onrange

    peer.onbitfield = (bitfield) => {
      peerOnBitfield.call(peer, bitfield)
      this.#updatePeerState(peer)
    }

    peer.onrange = ({ drop, start, length }) => {
      peerOnRange.call(peer, { drop, start, length })
      this.#updatePeerState(peer)
    }
  }
}
