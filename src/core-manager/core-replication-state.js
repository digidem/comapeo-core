import { TypedEmitter } from 'tiny-typed-emitter'
import { keyToId } from '../utils.js'
import RemoteBitfield from './remote-bitfield.js'

/**
 * @typedef {RemoteBitfield} Bitfield
 */

/**
 * @typedef {Object} PeerReplicationState
 * @property {Bitfield | undefined} have Bitfield of all blocks a peer has
 * @property {Bitfield | undefined } want Bitfield of all blocks a peer wants - if undefined then we consider a peer to want all blocks from `0` to `core.length`
 * @property {boolean} connected Whether the peer is currently replicating with this core
 * @property {Date | undefined} disconnectedAt The datetime the peer disconnected - only set if the peer had previously connected and is now disconnected
 */

/**
 * @typedef {string} PeerId
 */

/**
 * @typedef {Object} CoreState
 * @property {number | undefined} length Core length, e.g. how many blocks in the core (including blocks that are not downloaded)
 * @property {PeerState} localState
 * @property {Map<PeerId, PeerState>} peerStates
 */

class PeerState {
  /** @type {Bitfield | undefined} */
  #preHaves
  /** @type {Bitfield | undefined} */
  #haves
  /** @type {Bitfield | undefined} */
  #wants
  connected = false
  /**
   * @param {Bitfield} bitfield
   */
  setPreHavesBitfield(bitfield) {
    this.#preHaves = bitfield
  }
  /**
   * @param {Bitfield} bitfield
   */
  setHavesBitfield(bitfield) {
    this.#haves = bitfield
  }
  /**
   * @param {Bitfield} bitfield
   */
  setWantsBitfield(bitfield) {
    this.#wants = bitfield
  }
  /**
   *
   * @param {{ start: number, length: number }} range
   */
  setWantRange({ start, length }) {
    if (!this.#wants) this.#wants = new RemoteBitfield()
    this.#wants.setRange(start, length, true)
  }
  /**
   * @param {number} index
   */
  have(index) {
    return this.#haves?.get(index) || this.#preHaves?.get(index) || false
  }
  /**
   * @param {number} index
   */
  want(index) {
    return this.#wants?.get(index) || true
  }
}

export class CoreReplicationState extends TypedEmitter {
  /** @type {import('hypercore')<'binary', Buffer>} */
  #core
  /** @type {CoreState['peerStates']} */
  #peerStates = new Map()
  /** @type {CoreState['localState']} */
  #localState = new PeerState()
  #discoveryId

  /**
   * @param {string} discoveryId Discovery ID for the core that this is representing
   */
  constructor(discoveryId) {
    super()
    this.#discoveryId = discoveryId
  }

  /** @type {CoreState} */
  get state() {
    return {
      length: this.#core?.length,
      localState: this.#localState,
      peerStates: this.#peerStates,
    }
  }

  /**
   * Attach a core. The replication state can be initialized without a core
   * instance, because we could receive peer want and have states via extension
   * messages before we have the core key that allows us to create a core
   * instance.
   *
   * @param {import('hypercore')<'binary', Buffer>} core
   */
  attachCore(core) {
    // @ts-ignore - we know discoveryKey exists here
    const discoveryId = keyToId(core.discoveryKey)
    if (discoveryId !== this.#discoveryId) {
      throw new Error('discoveryId does not match')
    }
    if (!this.#core) return

    this.#core = core
    // @ts-ignore - internal property
    this.#localState.setHavesBitfield(core?.core?.bitfield)

    for (const peer of this.#core.peers) {
      this.#onPeerAdd(peer)
    }

    this.#core.on('peer-add', this.#onPeerAdd)

    this.#core.on('peer-remove', this.#onPeerRemove)

    // TODO: Maybe we need to also wait on core.update() and then emit state?

    // These events happen when the local bitfield changes, so we want to emit
    // state because it will have changed
    this.#core.on('download', () => {
      this.emit('state', this.state)
    })

    this.#core.on('append', () => {
      this.emit('state', this.state)
    })
  }

  /**
   * Add a pre-emptive "have" bitfield for a peer. This is used when we receive
   * a peer "have" via extension message - it allows us to have a state for the
   * peer before the peer actually starts replicating this core
   *
   * @param {PeerId} peerId
   * @param {Bitfield} bitfield
   */
  setHavesBitfield(peerId, bitfield) {
    const peerState = this.#getPeerState(peerId)
    peerState.setPreHavesBitfield(bitfield)
    this.emit('state', this.state)
  }

  /**
   * Add a ranges of wanted blocks for a peer. By default a peer wants all
   * blocks in a core - calling this will change the peer to only want the
   * blocks/ranges that are added here
   *
   * @param {PeerId} peerId
   * @param {Array<{ start: number, length: number }>} ranges
   */
  setPeerWants(peerId, ranges) {
    const peerState = this.#getPeerState(peerId)
    for (const { start, length } of ranges) {
      peerState.setWantRange({ start, length })
    }
    this.emit('state', this.state)
  }

  /**
   * @param {PeerId} peerId
   */
  #getPeerState(peerId) {
    let peerState = this.#peerStates.get(peerId)
    if (!peerState) {
      peerState = new PeerState()
      this.#peerStates.set(peerId, peerState)
    }
    return peerState
  }

  /**
   * Handle a peer being added to the core - updates state and adds listeners to
   * emit state updates whenever the peer remote bitfield changes
   *
   * (static initialization to bind to `this`)
   * @param {any} peer
   */
  #onPeerAdd = (peer) => {
    const peerId = keyToId(peer.remotePublicId)

    // Update state to ensure this peer is in the state and set to connected
    const peerState = this.#getPeerState(peerId)
    peerState.connected = true

    // A peer can have a pre-emptive "have" bitfield received via an extension
    // message, but when the peer actually connects then we switch to the actual
    // bitfield from the peer object
    peerState.setHavesBitfield(peer.remoteBitfield)
    this.emit('state', this.state)

    // We want to emit state when a peer's bitfield changes, which can happen as
    // a result of these two internal calls.
    const originalOnBitfield = peer.onbitfield
    const originalOnRange = peer.onrange
    peer.onbitfield = (/** @type {any[]} */ ...args) => {
      originalOnBitfield.apply(peer, args)
      this.emit('state', this.state)
    }
    peer.onrange = (/** @type {any[]} */ ...args) => {
      originalOnRange.apply(peer, args)
      this.emit('state', this.state)
    }
  }

  /**
   * Handle a peer being removed - keeps it in state, but sets state.connected = false
   *
   * (static initialization to bind to `this`)
   * @param {any} peer
   */
  #onPeerRemove = (peer) => {
    const peerId = keyToId(peer.remotePublicKey)
    const peerState = this.#getPeerState(peerId)
    peerState.connected = false
    this.emit('state', this.state)
  }
}
