import { keyToId } from '../utils.js'
import RemoteBitfield, {
  BITS_PER_PAGE,
} from '../core-manager/remote-bitfield.js'
import { Logger } from '../logger.js'
import { InvalidBitfieldIndexError } from '../errors.js'
/** @import { HypercorePeer, HypercoreRemoteBitfield } from '../types.js' */

/**
 * @typedef {RemoteBitfield} Bitfield
 */
/**
 * @typedef {string} DeviceId
 */
/**
 * State of the replication channel between us and a peer, for one core:
 * - `'closed'`: no live replication session (default, and after disconnect)
 * - `'opening'`: session opened, waiting for the first length/bitfield
 *   exchange — we don't yet know what the peer has
 * - `'open'`: active session, remote length known
 * @typedef {'closed' | 'opening' | 'open'} ChannelState
 */
/**
 * Block counts for one core, always from the local device's point of view.
 * @typedef {object} LocalCoreState
 * @property {number} have blocks we have
 * @property {number} toReceive unique blocks we still need from any peer
 * @property {number} toSend unique blocks any peer still needs from us
 */
/**
 * @typedef {object} PeerCoreDerivedState
 * @property {number} have blocks the peer has
 * @property {number} toReceive blocks we still need from this peer
 * @property {number} toSend blocks this peer still needs from us
 * @property {ChannelState} channel
 */
/**
 * @typedef {object} DerivedCoreState
 * @property {number} coreLength known (sparse) length of the core
 * @property {LocalCoreState} local
 * @property {Record<DeviceId, PeerCoreDerivedState>} devices state of each known peer
 */
/**
 * @typedef {Object} InternalState
 * @property {number | undefined} length Core length, e.g. how many blocks in
 * the core (including blocks that are not downloaded)
 * @property {PeerCoreState} localState
 * @property {Map<DeviceId, PeerCoreState>} remoteStates
 * @property {(deviceId: DeviceId) => boolean} isPeerSyncAllowed whether the
 * peer's role allows syncing this core's namespace (blocked peers are
 * excluded from derived counts)
 */

// This is a 32-bit number with all bits set
const ALL_32_BITS = 2 ** 32 - 1

/**
 * Track sync state for a single core. Can start tracking state before the
 * core instance exists locally, via the "pre-have" messages received over the
 * project creator core.
 *
 * Because deriving the state is expensive (it iterates through the bitfields
 * of all peers), this is pull-based: `onUpdate` signals that the state has
 * changed, and the consumer calls `getState()` when it wants the state.
 */
export class CoreSyncState {
  /** @type {import('hypercore')<'binary', Buffer> | undefined} */
  #core
  /** @type {InternalState['remoteStates']} */
  #remoteStates = new Map()
  /** @type {InternalState['localState']} */
  #localState
  #preHavesLength = 0
  #update
  #isPeerSyncAllowed
  #deviceId
  #l
  #hasDownloadFilter
  #isClosed = false
  /** @type {Map<HypercorePeer, { onbitfield: HypercorePeer['onbitfield'], onrange: HypercorePeer['onrange'] }>} */
  #patchedPeers = new Map()

  /**
   * @param {object} opts
   * @param {() => void} opts.onUpdate Called when a state update is available (via getState())
   * @param {(deviceId: DeviceId) => boolean} opts.isPeerSyncAllowed
   * @param {string} opts.deviceId
   * @param {(deviceId: DeviceId) => boolean} opts.hasDownloadFilter
   * @param {Logger} [opts.logger]
   */
  constructor({
    onUpdate,
    isPeerSyncAllowed,
    deviceId,
    hasDownloadFilter,
    logger,
  }) {
    // The logger parameter is already namespaced by SyncProgress
    this.#l = logger || Logger.create('coreSyncState')
    this.#isPeerSyncAllowed = isPeerSyncAllowed
    this.#deviceId = deviceId
    this.#hasDownloadFilter = hasDownloadFilter
    this.#localState = new PeerCoreState({
      wantsEverything: !hasDownloadFilter(deviceId),
    })
    this.#update = () => {
      if (this.#isClosed) return
      process.nextTick(onUpdate)
    }
  }

  /** @type {() => DerivedCoreState} */
  getState() {
    // No way to listen on all contiguousLength changes (like clear), so we
    // need to fetch it fresh each time
    if (this.#core) {
      this.#localState.contiguousLength = this.#core.contiguousLength
    }
    const localCoreLength = this.#core?.length || 0
    return deriveCoreState({
      length: Math.max(localCoreLength, this.#preHavesLength),
      localState: this.#localState,
      remoteStates: this.#remoteStates,
      isPeerSyncAllowed: this.#isPeerSyncAllowed,
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
    if (this.#isClosed) return

    this.#core = core

    this.#core.ready().then(() => {
      if (this.#isClosed) return
      this.#localState.setHavesBitfield(
        // @ts-ignore - internal property
        core?.core?.bitfield
      )
      this.#localState.contiguousLength = core.contiguousLength
      this.#update()
    })

    for (const peer of this.#core.peers) {
      this.#onPeerAdd(peer)
    }

    this.#core.on('peer-add', this.#onPeerAdd)
    this.#core.on('peer-remove', this.#onPeerRemove)

    // These events happen when the local bitfield changes, so we want to emit
    // state because it will have changed
    this.#core.on('download', this.#update)
    this.#core.on('append', this.#update)
  }

  /**
   * Stop listening and emitting updates. Idempotent. The pending
   * `core.update()` continuations are guarded by `#isClosed`.
   */
  close() {
    if (this.#isClosed) return
    this.#isClosed = true
    if (this.#core) {
      this.#core.off('peer-add', this.#onPeerAdd)
      this.#core.off('peer-remove', this.#onPeerRemove)
      this.#core.off('download', this.#update)
      this.#core.off('append', this.#update)
    }
    for (const [peer, original] of this.#patchedPeers) {
      peer.onbitfield = original.onbitfield
      peer.onrange = original.onrange
    }
    this.#patchedPeers.clear()
  }

  /**
   * Add a pre-emptive "have" bitfield for a peer. This is used when we receive
   * a peer "have" via extension message - it allows us to have a state for the
   * peer before the peer actually starts syncing this core
   *
   * @param {DeviceId} deviceId
   * @param {number} start
   * @param {Uint32Array} bitfield
   */
  insertPreHaves(deviceId, start, bitfield) {
    const peerState = this.#getOrCreatePeerState(deviceId)
    // Pre-haves prove the peer knows this core
    peerState.markCoreKnown(!this.#hasDownloadFilter(deviceId))
    peerState.insertPreHaves(start, bitfield)
    const previousLength = Math.max(
      this.#preHavesLength,
      this.#core?.length || 0
    )
    this.#preHavesLength = Math.max(
      this.#preHavesLength,
      peerState.preHavesBitfield.lastSet(start + bitfield.length * 32) + 1
    )
    if (this.#preHavesLength > previousLength) {
      this.#l.log(
        'Updated peer %S pre-haves length from %d to %d',
        deviceId,
        previousLength,
        this.#preHavesLength
      )
    }
    this.#update()
  }

  /**
   * Add a range of blocks that a peer wants. By default a peer wants all
   * blocks in a core - calling this will change the peer to only want the
   * blocks/ranges that are added here
   *
   * @param {DeviceId} deviceId
   * @param {number} start
   * @param {number} length
   * @returns {void}
   */
  addWantRange(deviceId, start, length) {
    this.#l.log('Peer %S wants range %d-%d', deviceId, start, start + length)
    const peerState = this.#getOrCreatePeerState(deviceId)
    peerState.addWantRange(start, length)
    this.#update()
  }

  /**
   * Set whether a peer wants everything or only blocks specified by addWantRange()
   * @param {DeviceId} deviceId
   * @param {boolean} wantsEverything
   */
  setWantsEverything(deviceId, wantsEverything) {
    this.#l.log('Peer %S wants everything: %s', deviceId, wantsEverything)
    const peerState = this.#getOrCreatePeerState(deviceId)
    peerState.setWantsEverything(wantsEverything)
    this.#update()
  }

  /**
   * @param {DeviceId} deviceId
   * @param {object} [opts]
   * @param {boolean} [opts.assumeCoreKnown=true] whether to assume the peer
   * knows this core exists. When a peer connects, we assume it knows (or will
   * imminently learn about) all cores we know of, so it is treated as wanting
   * all blocks it doesn't have (which is what makes progress reporting show
   * pending data for peers that haven't started syncing). But when a core is
   * discovered *after* a peer connected, we may know something the peer has
   * no way of knowing about, so we must not fabricate wants for it —
   * completion would block forever on a transfer the peer will never
   * request. Evidence that the peer does know the core (an open replication
   * channel, pre-haves, an explicit want range) upgrades this.
   */
  addPeer(deviceId, { assumeCoreKnown = true } = {}) {
    this.#getOrCreatePeerState(deviceId, { assumeCoreKnown })
    this.#update()
  }

  /**
   * Remove all state for a peer, e.g. when its device disconnects.
   *
   * @param {DeviceId} deviceId
   */
  removePeer(deviceId) {
    const wasRemoved = this.#remoteStates.delete(deviceId)
    if (wasRemoved) {
      this.#update()
    }
  }

  /**
   * @param {DeviceId} deviceId
   * @param {object} [opts]
   * @param {boolean} [opts.assumeCoreKnown=true] see {@link addPeer}
   */
  #getOrCreatePeerState(deviceId, { assumeCoreKnown = true } = {}) {
    if (deviceId === this.#deviceId) return this.#localState
    let peerState = this.#remoteStates.get(deviceId)
    if (!peerState) {
      peerState = new PeerCoreState({
        wantsEverything: assumeCoreKnown && !this.#hasDownloadFilter(deviceId),
        coreKnown: assumeCoreKnown,
      })
      this.#remoteStates.set(deviceId, peerState)
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
    const deviceId = keyToId(peer.remotePublicKey)

    // Update state to ensure this peer is in the state correctly
    const peerState = this.#getOrCreatePeerState(deviceId)
    // An open replication channel proves the peer knows this core
    peerState.markCoreKnown(!this.#hasDownloadFilter(deviceId))
    peerState.channel = 'opening'

    this.#core?.update({ wait: true }).then(
      () => {
        if (this.#isClosed) return
        // The peer may have disconnected, or its state replaced, while we
        // were waiting for the length handshake
        if (this.#remoteStates.get(deviceId) !== peerState) return
        peerState.channel = 'open'
        peerState.contiguousLength = peer.remoteContiguousLength
        this.#update()
      },
      () => {
        // Ignore: hypercore rejects the pending update when the core closes
      }
    )

    // A peer can have a pre-emptive "have" bitfield received via an extension
    // message, but when the peer actually connects then we switch to the actual
    // bitfield from the peer object
    peerState.setHavesBitfield(peer.remoteBitfield)
    peerState.contiguousLength = peer.remoteContiguousLength

    this.#update()

    // We want to emit state when a peer's bitfield changes, which can happen as
    // a result of these two internal calls.
    const originalOnBitfield = peer.onbitfield
    const originalOnRange = peer.onrange
    this.#patchedPeers.set(peer, {
      onbitfield: originalOnBitfield,
      onrange: originalOnRange,
    })
    peer.onbitfield = (...args) => {
      originalOnBitfield.apply(peer, args)
      peerState.contiguousLength = peer.remoteContiguousLength
      this.#update()
    }
    peer.onrange = (...args) => {
      originalOnRange.apply(peer, args)
      peerState.contiguousLength = peer.remoteContiguousLength
      this.#update()
    }
  }

  /**
   * Handle a peer being removed - keeps it in state, but marks the channel
   * closed. State is fully removed only when the device disconnects (see
   * `removePeer`).
   *
   * (defined as class field to bind to `this`)
   * @param {HypercorePeer} peer
   */
  #onPeerRemove = (peer) => {
    const original = this.#patchedPeers.get(peer)
    if (original) {
      peer.onbitfield = original.onbitfield
      peer.onrange = original.onrange
      this.#patchedPeers.delete(peer)
    }
    const deviceId = keyToId(peer.remotePublicKey)
    const peerState = this.#remoteStates.get(deviceId)
    if (!peerState) return
    peerState.channel = 'closed'
    this.#update()
  }
}

/**
 * Sync state for a core for a peer. Uses an internal bitfield from Hypercore
 * to track which blocks the peer has. Default is that a peer wants all
 * blocks, but can set ranges of "wants". Setting a want range changes all
 * other blocks to "not wanted"
 *
 * @private
 * Only exported for testing
 */
export class PeerCoreState {
  /** @type {Bitfield} */
  #preHaves = new RemoteBitfield()
  /** @type {HypercoreRemoteBitfield | undefined} */
  #haves
  /**
   * What blocks do we want? If `null`, we want everything.
   * @type {null | Bitfield}
   */
  #wants
  /**
   * Do we have evidence that the peer knows this core exists (an open
   * replication channel, pre-haves, or explicit want ranges)? While `false`,
   * the peer is treated as wanting nothing from this core: fabricating wants
   * for a core the peer may never learn about would block sync completion on
   * a transfer that will never be requested.
   */
  #coreKnown

  /**
   * This is how many consecutive blocks the peer has
   * This length is excluded from the usual have bitfield
   * @type {number}
   */
  contiguousLength = 0
  /** @type {ChannelState} */
  channel = 'closed'

  constructor({ wantsEverything = true, coreKnown = true } = {}) {
    this.#wants = wantsEverything ? null : new RemoteBitfield()
    this.#coreKnown = coreKnown
  }

  /**
   * Record evidence that the peer knows this core exists. If there was no
   * evidence before, the peer switches to the default assumption for what it
   * wants.
   *
   * @param {boolean} wantsEverythingDefault `false` when a blob download
   * filter means the peer only wants explicitly-requested ranges
   */
  markCoreKnown(wantsEverythingDefault) {
    if (this.#coreKnown) return
    this.#coreKnown = true
    this.#wants = wantsEverythingDefault ? null : new RemoteBitfield()
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
   * Add a range of blocks that a peer wants. This is not part of the Hypercore
   * protocol, so we need our own extension messages that a peer can use to
   * inform us which blocks they are interested in. For most cores peers always
   * want all blocks, but for blob cores peers may only want preview or
   * thumbnail versions of media
   *
   * @param {number} start
   * @param {number} length
   * @returns {void}
   */
  addWantRange(start, length) {
    // Explicit wants are evidence the peer knows this core
    this.#coreKnown = true
    this.#wants ??= new RemoteBitfield()
    this.#wants.setRange(start, length, true)
  }
  /**
   * Set whether this peer wants everything or only blocks specified by addWantRange()
   * @param {boolean} wantsEverything
   */
  setWantsEverything(wantsEverything) {
    this.#coreKnown = true
    this.#wants = wantsEverything ? null : new RemoteBitfield()
  }
  /**
   * Returns whether the peer has the block at `index`. If a pre-have bitfield
   * has been passed, this is used if no connected peer bitfield is available.
   * If neither bitfield is available then this defaults to `false`
   * @param {number} index
   */
  have(index) {
    return (
      index < this.contiguousLength ||
      this.#haves?.get(index) ||
      this.#preHaves.get(index)
    )
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
    let haveWord = preHaveWord
    if (this.#haves) {
      haveWord |= getBitfieldWord(this.#haves, index)
    }
    // Add bits for the contiguous range
    if (index < this.contiguousLength) {
      const contiguousEnd = index + 32
      if (contiguousEnd <= this.contiguousLength) {
        // All 32 bits are within contiguous range
        haveWord |= ALL_32_BITS
      } else {
        // Partial overlap: only some bits are within contiguous range
        const bitsInsideContiguous = this.contiguousLength - index
        haveWord |= (1 << bitsInsideContiguous) - 1
      }
    }
    return haveWord
  }
  /**
   * Returns whether this peer wants block at `index`. Defaults to `true` for
   * all blocks
   * @param {number} index
   */
  want(index) {
    return this.#wants ? this.#wants.get(index) : index >= this.contiguousLength
  }
  /**
   * Return the "wants" for the 32 blocks from `index`, as a 32-bit integer
   *
   * @param {number} index
   * @returns {number} 32-bit number representing whether the peer wants or not
   * the 32 blocks from `index`
   */
  wantWord(index) {
    // If #wants is null, peer wants everything except what's in contiguous range
    if (this.#wants === null) {
      // Create a mask of bits that are outside the contiguous range
      if (index >= this.contiguousLength) {
        // All 32 bits in this word are outside contiguous range
        return ALL_32_BITS
      }
      if (index + 32 <= this.contiguousLength) {
        // All 32 bits are within contiguous range, so peer doesn't want them
        return 0
      }
      // Partial overlap: some bits are within contiguous range
      const bitsInsideContiguous = this.contiguousLength - index
      // Mask out the bits that are inside the contiguous range
      return ((1 << bitsInsideContiguous) - 1) ^ ALL_32_BITS
    }
    // Peer has specific want ranges - get those bits
    const wantWord = getBitfieldWord(this.#wants, index)
    // But still exclude bits within contiguous range
    if (index >= this.contiguousLength) {
      return wantWord
    }
    if (index + 32 <= this.contiguousLength) {
      return 0
    }
    const bitsInsideContiguous = this.contiguousLength - index
    const mask = ((1 << bitsInsideContiguous) - 1) ^ ALL_32_BITS
    return wantWord & mask
  }
}

/**
 * Derive the block counts for one core: what we have, what we still need to
 * receive, and what we still need to send, in total and per peer.
 *
 * Peers whose role blocks syncing this core's namespace are excluded
 * entirely: their blocks are not counted as needing to be sent or received,
 * because they will never sync.
 *
 * @param {InternalState} coreState
 *
 * @private
 * Only exported for testing
 */
export function deriveCoreState(coreState) {
  const length = coreState.length || 0
  /** @type {LocalCoreState} */
  const local = { have: 0, toReceive: 0, toSend: 0 }
  /** @type {Record<DeviceId, PeerCoreDerivedState>} */
  const devices = {}

  /** @type {Map<DeviceId, PeerCoreState>} */
  const peers = new Map()
  for (const [deviceId, peerState] of coreState.remoteStates.entries()) {
    if (!coreState.isPeerSyncAllowed(deviceId)) continue
    peers.set(deviceId, peerState)
    devices[deviceId] = {
      have: 0,
      toReceive: 0,
      toSend: 0,
      channel: peerState.channel,
    }
  }

  for (let i = 0; i < length; i += 32) {
    const truncate = 2 ** Math.min(32, length - i) - 1

    const localHaves = coreState.localState.haveWord(i) & truncate
    const localWants = coreState.localState.wantWord(i) & truncate
    local.have += bitCount32(localHaves)

    let someoneElseNeedsFromMe = 0
    let iNeedFromSomeoneElse = 0

    for (const [deviceId, peer] of peers.entries()) {
      const peerHaves = peer.haveWord(i) & truncate
      devices[deviceId].have += bitCount32(peerHaves)

      const toSendToPeer = peer.wantWord(i) & ~peerHaves & localHaves
      devices[deviceId].toSend += bitCount32(toSendToPeer)
      someoneElseNeedsFromMe |= toSendToPeer

      const toReceiveFromPeer = peerHaves & ~localHaves & localWants
      devices[deviceId].toReceive += bitCount32(toReceiveFromPeer)
      iNeedFromSomeoneElse |= toReceiveFromPeer
    }

    local.toSend += bitCount32(someoneElseNeedsFromMe)
    local.toReceive += bitCount32(iNeedFromSomeoneElse)
  }

  return {
    coreLength: length,
    local,
    devices,
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
  if (index % 32 !== 0) throw new InvalidBitfieldIndexError()
  const j = index & (BITS_PER_PAGE - 1)
  const i = (index - j) / BITS_PER_PAGE

  const p = bitfield._pages.get(i)

  return p ? p.bitfield[j / 32] : 0
}
