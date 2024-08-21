import { keyToId } from '../utils.js'
import RemoteBitfield, {
  BITS_PER_PAGE,
} from '../core-manager/remote-bitfield.js'
/** @typedef {import('../types.js').HypercoreRemoteBitfield} HypercoreRemoteBitfield */
/** @typedef {import('../types.js').HypercorePeer} HypercorePeer */

/**
 * @typedef {RemoteBitfield} Bitfield
 */
/**
 * @typedef {string} PeerId
 */
/**
 * @typedef {Object} InternalState
 * @property {number | undefined} length Core length, e.g. how many blocks in the core (including blocks that are not downloaded)
 * @property {PeerState} localState
 * @property {Map<PeerId, PeerState>} remoteStates
 * @property {Map<string, import('./peer-sync-controller.js').PeerSyncController>} peerSyncControllers
 * @property {import('../core-manager/index.js').Namespace} namespace
 */
/**
 * @typedef {object} LocalCoreState
 * @property {number} have blocks we have
 * @property {number} want unique blocks we want from any other peer
 * @property {number} wanted blocks we want from this peer
 */
/**
 * @typedef {object} PeerCoreState
 * @property {number} have blocks the peer has locally
 * @property {number} want blocks this peer wants from us
 * @property {number} wanted blocks we want from this peer
 * @property {'disconnected' | 'connecting' | 'connected'} status
 */
/**
 * @typedef {object} DerivedState
 * @property {number} coreLength known (sparse) length of the core
 * @property {LocalCoreState} localState local state
 * @property {{ [peerId in PeerId]: PeerCoreState }} remoteStates map of state of all known peers
 */

/**
 * Track sync state for a core identified by `discoveryId`. Can start tracking
 * state before the core instance exists locally, via the "preHave" messages
 * received over the project creator core.
 *
 * Because deriving the state is expensive (it iterates through the bitfields of
 * all peers), this is designed to be pull-based: the onUpdate event signals
 * that the state is updated, but does not pass the state. The consumer can
 * "pull" the state when it wants it via `coreSyncState.getState()`.
 *
 * Each peer (including the local peer) has a state of:
 *
 * 1. `have` - number of blocks the peer has locally
 *
 * 2. `want` - number of blocks this peer wants. For local state, this is the
 *    number of unique blocks we want from anyone else. For remote peers, it is
 *    the number of blocks this peer wants from us.
 *
 * 3. `wanted` - number of blocks this peer has that's wanted by others. For
 *    local state, this is the number of unique blocks any of our peers want.
 *    For remote peers, it is the number of blocks we want from them.
 */
export class CoreSyncState {
  /** @type {import('hypercore')<'binary', Buffer> | undefined} */
  #core
  /** @type {InternalState['remoteStates']} */
  #remoteStates = new Map()
  /** @type {InternalState['localState']} */
  #localState = new PeerState()
  #preHavesLength = 0
  #update
  #peerSyncControllers
  #namespace

  /**
   * @param {object} opts
   * @param {() => void} opts.onUpdate Called when a state update is available (via getState())
   * @param {Map<string, import('./peer-sync-controller.js').PeerSyncController>} opts.peerSyncControllers
   * @param {import('../core-manager/index.js').Namespace} opts.namespace
   */
  constructor({ onUpdate, peerSyncControllers, namespace }) {
    this.#peerSyncControllers = peerSyncControllers
    this.#namespace = namespace
    // Called whenever the state changes, so we clear the cache because next
    // call to getState() will need to re-derive the state
    this.#update = () => {
      process.nextTick(onUpdate)
    }
  }

  /** @type {() => DerivedState} */
  getState() {
    const localCoreLength = this.#core?.length || 0
    return deriveState({
      length: Math.max(localCoreLength, this.#preHavesLength),
      localState: this.#localState,
      remoteStates: this.#remoteStates,
      peerSyncControllers: this.#peerSyncControllers,
      namespace: this.#namespace,
    })
  }

  /**
   * Attach a core. The sync state can be initialized without a core instance,
   * because we could receive peer want and have states via extension messages
   * before we have the core key that allows us to create a core instance.
   *
   * @param {import('hypercore')<'binary', Buffer>} core
   */
  attachCore(core) {
    if (this.#core) return

    this.#core = core

    this.#core.ready().then(() => {
      this.#localState.setHavesBitfield(
        // @ts-ignore - internal property
        core?.core?.bitfield
      )
    })

    for (const peer of this.#core.peers) {
      this.#onPeerAdd(peer)
    }

    this.#core.on('peer-add', this.#onPeerAdd)

    this.#core.on('peer-remove', this.#onPeerRemove)

    // TODO: Maybe we need to also wait on core.update() and then emit state?

    // These events happen when the local bitfield changes, so we want to emit
    // state because it will have changed
    this.#core.on('download', () => {
      this.#update()
    })

    this.#core.on('append', () => {
      this.#update()
    })
  }

  /**
   * Add a pre-emptive "have" bitfield for a peer. This is used when we receive
   * a peer "have" via extension message - it allows us to have a state for the
   * peer before the peer actually starts syncing this core
   *
   * @param {PeerId} peerId
   * @param {number} start
   * @param {Uint32Array} bitfield
   */
  insertPreHaves(peerId, start, bitfield) {
    const peerState = this.#getPeerState(peerId)
    peerState.insertPreHaves(start, bitfield)
    this.#preHavesLength = Math.max(
      this.#preHavesLength,
      peerState.preHavesBitfield.lastSet(start + bitfield.length * 32) + 1
    )
    this.#update()
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
    this.#update()
  }

  /**
   * @param {PeerId} peerId
   */
  addPeer(peerId) {
    if (this.#remoteStates.has(peerId)) return
    this.#remoteStates.set(peerId, new PeerState())
    this.#update()
  }

  /**
   * @param {PeerId} peerId
   */
  #getPeerState(peerId) {
    let peerState = this.#remoteStates.get(peerId)
    if (!peerState) {
      peerState = new PeerState()
      this.#remoteStates.set(peerId, peerState)
    }
    return peerState
  }

  /**
   * Handle a peer being added to the core - updates state and adds listeners to
   * emit state updates whenever the peer remote bitfield changes
   *
   * (defined as class field to bind to `this`)
   * @param {HypercorePeer} peer
   */
  #onPeerAdd = (peer) => {
    const peerId = keyToId(peer.remotePublicKey)

    // Update state to ensure this peer is in the state and set to connected
    const peerState = this.#getPeerState(peerId)
    peerState.status = 'connecting'

    this.#core?.update({ wait: true }).then(() => {
      // A peer should become connected
      peerState.status = 'connected'
      this.#update()
    })

    // A peer can have a pre-emptive "have" bitfield received via an extension
    // message, but when the peer actually connects then we switch to the actual
    // bitfield from the peer object
    peerState.setHavesBitfield(peer.remoteBitfield)
    this.#update()

    // We want to emit state when a peer's bitfield changes, which can happen as
    // a result of these two internal calls.
    const originalOnBitfield = peer.onbitfield
    const originalOnRange = peer.onrange
    peer.onbitfield = (...args) => {
      originalOnBitfield.apply(peer, args)
      this.#update()
    }
    peer.onrange = (...args) => {
      originalOnRange.apply(peer, args)
      this.#update()
    }
  }

  /**
   * Handle a peer being removed - keeps it in state, but sets state.connected = false
   *
   * (defined as class field to bind to `this`)
   * @param {HypercorePeer} peer
   */
  #onPeerRemove = (peer) => {
    const peerId = keyToId(peer.remotePublicKey)
    const peerState = this.#getPeerState(peerId)
    peerState.status = 'disconnected'
    this.#update()
  }
}

/**
 * Sync state for a core for a peer. Uses an internal bitfield from Hypercore to
 * track which blocks the peer has. Default is that a peer wants all blocks, but
 * can set ranges of "wants". Setting a want range changes all other blocks to
 * "not wanted"
 *
 * @private
 * Only exported for testing
 */
export class PeerState {
  /** @type {Bitfield} */
  #preHaves = new RemoteBitfield()
  /** @type {HypercoreRemoteBitfield | undefined} */
  #haves
  /** @type {Bitfield} */
  #wants = new RemoteBitfield()
  /** @type {PeerCoreState['status']} */
  status = 'disconnected'
  #wantAll
  constructor({ wantAll = true } = {}) {
    this.#wantAll = wantAll
  }
  get preHavesBitfield() {
    return this.#preHaves
  }
  /**
   * @param {number} start
   * @param {Uint32Array} bitfield
   */
  insertPreHaves(start, bitfield) {
    return this.#preHaves.insert(start, bitfield)
  }
  /**
   * @param {HypercoreRemoteBitfield} bitfield
   */
  setHavesBitfield(bitfield) {
    this.#haves = bitfield
  }
  /**
   * Set a range of blocks that a peer wants. This is not part of the Hypercore
   * protocol, so we need our own extension messages that a peer can use to
   * inform us which blocks they are interested in. For most cores peers always
   * want all blocks, but for blob cores often peers only want preview or
   * thumbnail versions of media
   *
   * @param {{ start: number, length: number }} range
   */
  setWantRange({ start, length }) {
    this.#wantAll = false
    this.#wants.setRange(start, length, true)
  }
  /**
   * Returns whether the peer has the block at `index`. If a pre-have bitfield
   * has been passed, this is used if no connected peer bitfield is available.
   * If neither bitfield is available then this defaults to `false`
   * @param {number} index
   */
  have(index) {
    return this.#haves?.get(index) || this.#preHaves.get(index)
  }
  /**
   * Return the "haves" for the 32 blocks from `index`, as a 32-bit integer
   *
   * @param {number} index
   * @returns {number} 32-bit number representing whether the peer has or not
   * the 32 blocks from `index`
   */
  haveWord(index) {
    const preHaveWord = getBitfieldWord(this.#preHaves, index)
    if (!this.#haves) return preHaveWord
    return preHaveWord | getBitfieldWord(this.#haves, index)
  }
  /**
   * Returns whether this peer wants block at `index`. Defaults to `true` for
   * all blocks
   * @param {number} index
   */
  want(index) {
    if (this.#wantAll) return true
    return this.#wants.get(index)
  }
  /**
   * Return the "wants" for the 32 blocks from `index`, as a 32-bit integer
   *
   * @param {number} index
   * @returns {number} 32-bit number representing whether the peer wants or not
   * the 32 blocks from `index`
   */
  wantWord(index) {
    if (this.#wantAll) {
      // This is a 32-bit number with all bits set
      return 2 ** 32 - 1
    }
    return getBitfieldWord(this.#wants, index)
  }
}

/**
 * Derive count for each peer: "want"; "have"; "wanted".
 *
 * @param {InternalState} coreState
 *
 * @private
 * Only exporteed for testing
 */
export function deriveState(coreState) {
  const length = coreState.length || 0
  /** @type {LocalCoreState} */
  const localState = { have: 0, want: 0, wanted: 0 }
  /** @type {Record<PeerId, PeerCoreState>} */
  const remoteStates = {}

  /** @type {Map<PeerId, PeerState>} */
  const peers = new Map()
  for (const [peerId, peerState] of coreState.remoteStates.entries()) {
    const psc = coreState.peerSyncControllers.get(peerId)
    const isBlocked = psc?.syncCapability[coreState.namespace] === 'blocked'
    // Currently we do not include blocked peers in sync state - it's unclear
    // how to expose this state in a meaningful way for considering sync
    // completion, because blocked peers do not sync.
    if (isBlocked) continue
    peers.set(peerId, peerState)
    remoteStates[peerId] = {
      have: 0,
      want: 0,
      wanted: 0,
      status: peerState.status,
    }
  }

  for (let i = 0; i < length; i += 32) {
    const truncate = 2 ** Math.min(32, length - i) - 1

    const localHaves = coreState.localState.haveWord(i) & truncate
    localState.have += bitCount32(localHaves)

    let someoneElseWantsFromMe = 0
    let iWantFromSomeoneElse = 0

    for (const [peerId, peer] of peers.entries()) {
      const peerHaves = peer.haveWord(i) & truncate
      remoteStates[peerId].have += bitCount32(peerHaves)

      const theyWantFromMe = peer.wantWord(i) & ~peerHaves & localHaves
      remoteStates[peerId].want += bitCount32(theyWantFromMe)
      someoneElseWantsFromMe |= theyWantFromMe

      const iWantFromThem = peerHaves & ~localHaves
      remoteStates[peerId].wanted += bitCount32(iWantFromThem)
      iWantFromSomeoneElse |= iWantFromThem
    }

    localState.wanted += bitCount32(someoneElseWantsFromMe)
    localState.want += bitCount32(iWantFromSomeoneElse)
  }

  return {
    coreLength: length,
    localState,
    remoteStates,
  }
}

/**
 * Apologies for the obscure code. From
 * https://stackoverflow.com/a/109025/903300
 * @param {number} n
 */
export function bitCount32(n) {
  n = n - ((n >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24
}

/**
 * Get a 32-bit "chunk" (word) of the bitfield.
 *
 * @param {Bitfield | HypercoreRemoteBitfield} bitfield
 * @param {number} index
 */
function getBitfieldWord(bitfield, index) {
  if (index % 32 !== 0) throw new Error('Index must be multiple of 32')
  const j = index & (BITS_PER_PAGE - 1)
  const i = (index - j) / BITS_PER_PAGE

  const p = bitfield._pages.get(i)

  return p ? p.bitfield[j / 32] : 0
}
