import { TypedEmitter } from 'tiny-typed-emitter'
import { keyToId } from '../utils.js'

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
      this.#core(coreRecord).catch(noop)
    }

    this.coreManager.on('add-core', (coreRecord) => {
      this.#core(coreRecord).catch(noop)
    })
  }

  get state () {
    /** @type {PeerState} */
    const cores = {}
    for (const [ corePublicId, state ] of this.#coreStates.entries()) {
      cores[corePublicId] = state.state
    }

    const synced = this.isSynced()

    return { cores, synced }
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
    for (const state of this.#coreStates.values()) {
      state.close()
    }
  }

  /**
   * @param {import('../core-manager/core-index.js').CoreRecord} coreRecord
   * @returns {Promise<void>}
   */
  async #core(coreRecord) {
    const { core, key } = coreRecord
    await core.ready()
    const corePublicId = keyToId(key)

    if (this.#coreStates.has(corePublicId)) {
      return this.#coreStates.get(corePublicId)
    }

    const state = new CoreReplicationState({
      core,
    })

    state.on('state', () => {
      this.emit('state', this.state)
    })

    state.on('synced', () => {
      if (this.isSynced()) {
        this.emit('synced', this.state)
      }
    })

    this.#coreStates.set(corePublicId, state)
  }
}

/**
 * @typedef {Object} PeerState
 * @property {Number} want
 * @property {Number} have
 * @property {Number} unavailable
 * @property {Number} length
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
    this.coreId = keyToId(this.#core.key)
    this.#setInitialCoreState(this.#core)

    for (const peer of this.#core.peers) {
      this.#onPeer(peer)
    }

    this.#core.on('peer-add', (peer) => {
      this.#onPeer(peer)
    })

    this.#core.on('peer-remove', (peer) => {
      const peerId = keyToId(peer.remotePublicKey)
      if (!this.#state.has(peerId)) {
        return
      }

      this.#state.delete(peerId)
    })

    this.#core.on('download', async (index, byteLength, from) => {
      const state = this.#getLocalState()
      state.length = getMaxLength(this.#core)

      if (state.have === 0 && state.want === 0) {
        state.want = state.length
      }

      const unavailableBlocks = this.#getUnavailableBlocks()

      state.want--
      state.have++
      state.unavailable = unavailableBlocks.length

      this.#setLocalState(state)
    })
  }

  #getUnavailableBlocks() {
    const length = getMaxLength(this.#core)
    const unavailable = []

    for (let i = 0; i < length; i++) {
      const available = this.#checkBlockAvailability(i)

      if (!available) {
        unavailable.push(i)
      }
    }

    return unavailable
  }

  #checkBlockAvailability(index) {
    const localBitfield = this.#core.core.bitfield

    for (const peer of this.#core.peers) {
      const peerBitfield = peer.remoteBitfield

      if (peerBitfield.get(index)) {
        return true
      }
    }

    return localBitfield.get(index)
  }

  get state() {
    const state = []

    for (const [coreId, coreState] of this.#state.entries()) {
      state.push({
        coreId,
        ...coreState,
      })
    }

    return state
  }

  get peers() {
    return [...this.#state.keys()].filter((peerId) => {
        return peerId !== this.coreId
    })
  }

  isSynced() {
    const local = this.#getLocalState()
    let synced = true

    for (const state of this.#state.values()) {
      const length = state.length

      if (length !== local.length) {
        synced = false
        break
      }

      if (state.want > 0 && state.want !== state.unavailable) {
        synced = false
        break
      }
    }

    return synced
  }

  close() {
    this.removeAllListeners()
  }

  #setInitialCoreState(core) {
    const localBitfield = core.core.bitfield
    const state = createState()
    state.length = getMaxLength(core)

    for (let i = 0; i < state.length; i++) {
      if (!localBitfield.get(i)) {
        state.want++
      } else {
        state.have++
      }
    }

    this.#setLocalState(state)
  }

  #getLocalState() {
    return Object.assign({}, this.#state.get(this.coreId) || createState())
  }

  #getPeerState(peerPublicKey) {
    return Object.assign({}, this.#state.get(keyToId(peerPublicKey)) || createState({ remote: true }))
  }

  #setLocalState(state) {
    this.#state.set(this.coreId, state)
    this.emit('state', this.state)

    if (this.isSynced()) {
      this.emit('synced', this.state)
    }
  }

  #setPeerState(peerPublicKey, state) {
    const peerId = keyToId(peerPublicKey)
    this.#state.set(peerId, state)
    this.emit('state', this.state)
    if (this.isSynced()) {
      this.emit('synced', this.state)
    }
  }

  #updatePeerState(peer) {
    const localBitfield = this.#core.core.bitfield
    const remoteBitfield = peer.remoteBitfield
    const localState = this.#getLocalState()
    const remoteState = this.#getPeerState(peer.remotePublicKey)

    const length = getMaxLength(this.#core)
    let haveLocal = 0
    let haveRemote = 0
    let unavailable = 0

    for (let i = 0; i < length; i++) {
        const local = localBitfield.get(i)
        const remote = remoteBitfield.get(i)

        if (local) {
            haveLocal++
        }

        if (remote) {
            haveRemote++
        }

        if (!remote && !local) {
          unavailable++
        }
    }

    localState.have = haveLocal
    localState.want = length - haveLocal
    localState.unavailable = unavailable
    localState.length = length

    remoteState.have = haveRemote
    remoteState.want = length - haveRemote
    remoteState.unavailable = unavailable
    remoteState.length = length

    this.#setLocalState(localState)
    this.#setPeerState(peer.remotePublicKey, remoteState)
  }

  #onPeer(peer) {
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

function createState(options = { remote: false }) {
  return {
    remote: options.remote,
    have: 0,
    want: 0,
    unavailable: 0,
    length: 0
  }
}

function diffState(oldState, newState) {
  const diff = {}

  for (const key of Object.keys(newState)) {
    if (oldState[key] !== newState[key]) {
      diff[key] = newState[key]
    }
  }

  if (Object.keys(diff).length === 0) {
    return null
  }

  return diff
}

function getMaxLength (core) {
  const max = core.peers.reduce((max, peer) => {
    return Math.max(max, peer.remoteLength)
  }, core.length)
  return max
}

function noop() {}
