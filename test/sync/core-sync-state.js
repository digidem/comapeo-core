import test from 'node:test'
import assert from 'node:assert/strict'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import {
  deriveState,
  PeerState,
  CoreSyncState,
  bitCount32,
} from '../../src/sync/core-sync-state.js'
import RemoteBitfield, {
  BITS_PER_PAGE,
} from '../../src/core-manager/remote-bitfield.js'
import { once } from 'node:events'
import pTimeout from 'p-timeout'
import { EventEmitter } from 'node:events'
import { createCore } from '../helpers/create-core.js'

test('want() and wantWord() agree at contiguousLength boundary', () => {
  // Peer has blocks 0..4 (contiguous), so contiguousLength = 5
  // Block 5 is the first block NOT in the contiguous range - should be wanted.
  const peer = new PeerState({ wantsEverything: true })
  peer.contiguousLength = 5

  // Block at index 4 is inside the contiguous range - not wanted
  assert.strictEqual(
    peer.want(4),
    false,
    'want(4) should be false (in contiguous range)'
  )
  // Block at index 5 is the first block OUTSIDE the contiguous range - wanted
  assert.strictEqual(
    peer.want(5),
    true,
    'want(5) should be true (first block after contiguous range)'
  )
  // Block at index 6 is also outside - wanted
  assert.strictEqual(peer.want(6), true, 'want(6) should be true')

  // wantWord(0) covers blocks 0-31. Block 5 is bit position 5 in this word.
  const wantWord0 = peer.wantWord(0)
  // bit 4 (block 4) should be 0 (in contiguous range)
  assert.strictEqual(
    (wantWord0 >> 4) & 1,
    0,
    'bit 4 should not be set (in contiguous range)'
  )
  // bit 5 (block 5) should be 1 (first block after contiguous range)
  assert.strictEqual(
    (wantWord0 >> 5) & 1,
    1,
    'bit 5 should be set (first block after contiguous range)'
  )
  // bit 6 (block 6) should be 1
  assert.strictEqual((wantWord0 >> 6) & 1, 1, 'bit 6 should be set')

  // CRITICAL: want(index) must agree with the corresponding bit in wantWord(index)
  for (let i = 0; i < 32; i++) {
    const wantResult = peer.want(i)
    const wantWordBit = (wantWord0 >> i) & 1
    assert.strictEqual(
      wantResult === true,
      wantWordBit === 1,
      `want(${i})=${wantResult} disagrees with wantWord(0) bit ${i}=${wantWordBit}`
    )
  }
})

test('want() and wantWord() agree when contiguousLength is a multiple of 32', () => {
  // When contiguousLength = 32, blocks 0-31 are contiguous.
  const peer = new PeerState({ wantsEverything: true })
  peer.contiguousLength = 32

  assert.strictEqual(
    peer.want(31),
    false,
    'want(31) should be false (last block in contiguous range)'
  )
  assert.strictEqual(
    peer.want(32),
    true,
    'want(32) should be true (first block after contiguous range)'
  )

  assert.strictEqual(
    peer.wantWord(0),
    0,
    'wantWord(0) should be 0 (all in contiguous range)'
  )
  const WANT_FULL = 2 ** 32 - 1
  assert.strictEqual(
    peer.wantWord(32),
    WANT_FULL,
    'wantWord(32) should be WANT_FULL'
  )

  // Verify consistency at the boundary
  const wantWord0 = peer.wantWord(0)
  for (let i = 0; i < 32; i++) {
    const wantResult = peer.want(i)
    const wantWordBit = (wantWord0 >> i) & 1
    assert.strictEqual(
      wantResult === true,
      wantWordBit === 1,
      `want(${i})=${wantResult} disagrees with wantWord(0) bit ${i}=${wantWordBit}`
    )
  }
})

test('deriveState correctly counts want at contiguousLength boundary', () => {
  const localState = new PeerState({ wantsEverything: true })
  localState.contiguousLength = 0
  const localHaveBitfield = new RemoteBitfield()
  localHaveBitfield.set(5, true)
  localHaveBitfield.set(6, true)
  localHaveBitfield.set(7, true)
  localState.setHavesBitfield(localHaveBitfield)

  const remoteState = new PeerState({ wantsEverything: true })
  remoteState.contiguousLength = 5 // has blocks 0..4 contiguously

  const state = {
    length: 8,
    localState,
    remoteStates: new Map([['peer0', remoteState]]),
    peerSyncControllers: new Map(),
    namespace: /** @type {const} */ ('auth'),
  }

  const result = deriveState(state)

  assert.strictEqual(
    result.remoteStates['peer0'].want,
    3,
    'remote peer should want 3 blocks from local (5,6,7 - all outside contiguous range)'
  )

  assert.strictEqual(
    result.localState.wanted,
    3,
    'local should have 3 blocks wanted by peers'
  )
})

/**
 * @type {Array<{
 *   message: string,
 *   state: {
 *     length: number,
 *     localState: Parameters<createState>[0],
 *     remoteStates: Array<Parameters<createState>[0]>
 *   },
 *   expected: import('../../src/sync/core-sync-state.js').DerivedState
 * }>}
 */
const scenarios = [
  {
    message: '3 peers, start with haves, test want, have, and wanted',
    state: {
      length: 4,
      localState: { have: 0b0111 },
      remoteStates: [{ have: 0b0011 }, { have: 0b0101 }, { have: 0b0001 }],
    },
    expected: {
      coreLength: 4,
      localState: { want: 0, have: 3, wanted: 2 },
      remoteStates: {
        peer0: {
          want: 1,
          have: 2,
          wanted: 0,
          status: 'stopped',
        },
        peer1: {
          want: 1,
          have: 2,
          wanted: 0,
          status: 'stopped',
        },
        peer2: {
          want: 2,
          have: 1,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'No bitfields',
    state: {
      length: 4,
      localState: { have: 0 }, // always have a bitfield for this
      remoteStates: [{}, {}],
    },
    expected: {
      coreLength: 4,
      localState: { want: 0, have: 0, wanted: 0 },
      remoteStates: {
        peer0: {
          want: 0,
          have: 0,
          wanted: 0,
          status: 'stopped',
        },
        peer1: {
          want: 0,
          have: 0,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'started',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ have: 0b001, want: 0b011, status: 'started' }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 1 },
      remoteStates: {
        peer0: { want: 1, have: 1, wanted: 0, status: 'started' },
      },
    },
  },
  {
    message: 'test starting with wants',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ have: 0b001, want: 0b011 }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 1 },
      remoteStates: {
        peer0: {
          want: 1,
          have: 1,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'test starting with prehaves',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ prehave: 0b011 }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 1 },
      remoteStates: {
        peer0: {
          want: 1,
          have: 2,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'test starting with prehaves, then haves',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ prehave: 0b011, have: 0b111 }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 0 },
      remoteStates: {
        peer0: {
          want: 0,
          have: 3,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'test length > 32',
    state: {
      length: 72,
      localState: { have: 2 ** 50 - 1 },
      remoteStates: [
        { have: 2 ** 40 - 1 },
        { have: BigInt(2 ** 40 - 1) << BigInt(10), want: (2 ** 10 - 1) << 5 },
        { have: BigInt(2 ** 40 - 1) << BigInt(10), want: (2 ** 10 - 1) << 5 },
      ],
    },
    expected: {
      coreLength: 72,
      localState: { want: 0, have: 50, wanted: 15 },
      remoteStates: {
        peer0: {
          want: 10,
          have: 40,
          wanted: 0,
          status: 'stopped',
        },
        peer1: {
          want: 5,
          have: 40,
          wanted: 0,
          status: 'stopped',
        },
        peer2: {
          want: 5,
          have: 40,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
  {
    message: 'haves and wants beyond length',
    state: {
      length: 2,
      localState: { have: 0b1111 },
      remoteStates: [{ have: 0, want: 0b1110 }, { have: 0 }],
    },
    expected: {
      coreLength: 2,
      localState: { want: 0, have: 2, wanted: 2 },
      remoteStates: {
        peer0: {
          want: 1,
          have: 0,
          wanted: 0,
          status: 'stopped',
        },
        peer1: {
          want: 2,
          have: 0,
          wanted: 0,
          status: 'stopped',
        },
      },
    },
  },
]

test('deriveState() scenarios', () => {
  for (const { state, expected, message } of scenarios) {
    const derivedState = deriveState({
      length: state.length,
      localState: createState(state.localState),
      remoteStates: new Map(
        state.remoteStates.map((s, i) => ['peer' + i, createState(s)])
      ),
      peerSyncControllers: new Map(),
      namespace: 'auth',
    })
    assert.deepEqual(derivedState, expected, message)
  }
})

test('deriveState() have at index beyond bitfield page size', () => {
  const localState = createState({ have: 2 ** 10 - 1 })
  const remoteState = new PeerState()
  const remoteHaveBitfield = new RemoteBitfield()
  remoteHaveBitfield.set(BITS_PER_PAGE - 1 + 10, true)
  remoteState.setHavesBitfield(remoteHaveBitfield)
  const state = {
    length: BITS_PER_PAGE + 10,
    localState,
    remoteStates: new Map([['peer0', remoteState]]),
    peerSyncControllers: new Map(),
    namespace: /** @type {const} */ ('auth'),
  }
  const expected = {
    coreLength: BITS_PER_PAGE + 10,
    localState: {
      want: 1,
      have: 10,
      wanted: 10,
    },
    remoteStates: {
      peer0: {
        want: 10,
        have: 1,
        wanted: 1,
        status: 'stopped',
      },
    },
  }
  assert.deepEqual(deriveState(state), expected)
})

test('CoreReplicationState', async (t) => {
  for (const { state, expected, message } of scenarios) {
    const localCore = await createCore(t)
    await localCore.ready()
    const emitter = new EventEmitter()
    const crs = new CoreSyncState({
      onUpdate: () => emitter.emit('update'),
      peerSyncControllers: new Map(),
      namespace: 'auth',
      deviceId: '',
      hasDownloadFilter: () => false,
    })
    crs.attachCore(localCore)
    const blocks = new Array(state.length).fill('block')
    await localCore.append(blocks)
    const downloadPromises = []
    const seed = Buffer.alloc(32)
    seed.write('local')
    const kp1 = NoiseSecretStream.keyPair(seed)
    const peerIds = new Map()
    /** @type {Map<string, 'started' | 'stopped'>} */
    const statusesByPeer = new Map()
    for (const [
      index,
      { have, want, prehave },
    ] of state.remoteStates.entries()) {
      const seed = Buffer.allocUnsafe(32).fill(index)
      const kp2 = NoiseSecretStream.keyPair(seed)
      const peerId = kp2.publicKey.toString('hex')
      peerIds.set('peer' + index, peerId)
      statusesByPeer.set(peerId, 'stopped')

      // We unit test deriveState with no bitfields, but we need something here
      // for things to work
      crs.insertPreHaves(peerId, 0, createUint32Array(prehave || 0))
      if (typeof have !== 'number' && typeof want !== 'number') continue
      statusesByPeer.set(peerId, 'started')
      const core = await createCore(t, localCore.key)
      setPeerWants(crs, peerId, want)
      replicate(localCore, core, { kp1, kp2 })
      await core.update({ wait: true })
      downloadPromises.push(downloadCore(core, have))
    }
    await Promise.all(downloadPromises)
    await clearCore(localCore, state.localState.have)
    const expectedRemoteStates = Object.fromEntries(
      Object.entries(expected.remoteStates).map(([key, value]) => {
        const peerId = peerIds.get(key)
        return [
          peerId,
          {
            ...value,
            status: statusesByPeer.get(peerId),
          },
        ]
      })
    )
    await updateWithTimeout(emitter, 100)
    assert.deepEqual(
      crs.getState(),
      { ...expected, remoteStates: expectedRemoteStates },
      message
    )
  }
})

test('peer status stays "starting" until that peer\'s first Synchronize (writable core)', async (t) => {
  // `core.update({ wait: true })` resolves immediately for writable cores
  // (hypercore short-circuits: a writer is always "up to date"), so it can
  // never be a signal that a *peer* has completed its length handshake.
  const localCore = await createCore(t)
  await localCore.append(['a', 'b', 'c'])

  const emitter = new EventEmitter()
  const crs = new CoreSyncState({
    onUpdate: () => emitter.emit('update'),
    peerSyncControllers: new Map(),
    namespace: 'auth',
    deviceId: '',
    hasDownloadFilter: () => false,
  })
  crs.attachCore(localCore)

  const hold = holdSynchronize(localCore)
  const remoteCore = await createCore(t, localCore.key)
  const kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1))
  const peerId = kp2.publicKey.toString('hex')
  const destroy = replicate(localCore, remoteCore, { kp2 })
  t.after(destroy)

  await once(localCore, 'peer-add')
  // Allow any (incorrect) async continuations to settle
  await new Promise((res) => setTimeout(res, 200))

  assert.equal(
    localCore.peers[0].remoteSynced,
    false,
    'sanity: the peer has not sent its first Synchronize yet'
  )
  assert.equal(
    crs.getState().remoteStates[peerId].status,
    'starting',
    'peer is still "starting" before its first Synchronize'
  )

  hold.release()
  await waitForStatus(crs, emitter, peerId, 'started')
  assert.equal(
    localCore.peers[0].remoteSynced,
    true,
    'sanity: Synchronize has now been processed'
  )
})

test('peer status stays "starting" while another peer supplies an upgrade', async (t) => {
  // `core.update({ wait: true })` resolves for *all* waiters as soon as any
  // peer advances the core's length, so on an actively-transferring core a
  // newly-connected peer would be marked "started" before it has said
  // anything at all.
  const writerCore = await createCore(t)
  await writerCore.append(['a', 'b', 'c'])
  const localCore = await createCore(t, writerCore.key)

  const emitter = new EventEmitter()
  const crs = new CoreSyncState({
    onUpdate: () => emitter.emit('update'),
    peerSyncControllers: new Map(),
    namespace: 'auth',
    deviceId: '',
    hasDownloadFilter: () => false,
  })
  crs.attachCore(localCore)

  // Sync fully with the writer first
  const kpWriter = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1))
  const destroyWriterConn = replicate(localCore, writerCore, {
    kp2: kpWriter,
  })
  t.after(destroyWriterConn)
  localCore.download({ start: 0, end: -1 })
  await once(localCore, 'peer-add')
  await waitFor(() => localCore.contiguousLength === 3)

  // Now a new peer connects, but its first Synchronize is withheld
  const hold = holdSynchronize(localCore)
  const newPeerCore = await createCore(t, writerCore.key)
  const kpNew = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(2))
  const newPeerId = kpNew.publicKey.toString('hex')
  const destroyNewConn = replicate(localCore, newPeerCore, { kp2: kpNew })
  t.after(destroyNewConn)
  await once(localCore, 'peer-add')

  // The writer appends and we download it: the core's length advances, which
  // resolves every pending `core.update()` — but tells us nothing about the
  // new peer
  await writerCore.append('d')
  await waitFor(() => localCore.contiguousLength === 4)
  await new Promise((res) => setTimeout(res, 200))

  const newPeer = localCore.peers.find((p) =>
    p.remotePublicKey.equals(kpNew.publicKey)
  )
  assert(newPeer, 'sanity: new peer is connected')
  assert.equal(
    newPeer.remoteSynced,
    false,
    'sanity: the new peer has not sent its first Synchronize yet'
  )
  assert.equal(
    crs.getState().remoteStates[newPeerId].status,
    'starting',
    'new peer is still "starting" before its first Synchronize'
  )

  hold.release()
  await waitForStatus(crs, emitter, newPeerId, 'started')
})

test('peer status stays "starting" for a 4th concurrent peer (hypercore upgrade quorum cap)', async (t) => {
  // `core.update({ wait: true })` samples at most MAX_PEERS_UPGRADE (3)
  // peers, so with 4+ connected peers it can resolve without ever
  // consulting the 4th peer's handshake — it must not be treated as a
  // per-peer "handshake complete" signal.
  const keySource = await createCore(t) // never replicated; provides a key
  const localCore = await createCore(t, keySource.key)

  const emitter = new EventEmitter()
  const crs = new CoreSyncState({
    onUpdate: () => emitter.emit('update'),
    peerSyncControllers: new Map(),
    namespace: 'auth',
    deviceId: '',
    hasDownloadFilter: () => false,
  })
  crs.attachCore(localCore)

  // Three peers, fully synced
  for (let i = 1; i <= 3; i++) {
    const remoteCore = await createCore(t, keySource.key)
    const kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(i))
    const destroy = replicate(localCore, remoteCore, { kp2 })
    t.after(destroy)
  }
  await waitFor(
    () =>
      localCore.peers.length === 3 &&
      localCore.peers.every((p) => p.remoteSynced)
  )

  // A 4th peer connects, but its first Synchronize is withheld
  const hold = holdSynchronize(localCore, { maxPeers: 1 })
  const fourthCore = await createCore(t, keySource.key)
  const kp4 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(4))
  const fourthPeerId = kp4.publicKey.toString('hex')
  const destroy = replicate(localCore, fourthCore, { kp2: kp4 })
  t.after(destroy)
  await once(localCore, 'peer-add')

  // A 5th peer connects and syncs normally: its handshake re-evaluates
  // hypercore's shared upgrade request, which samples only the first
  // MAX_PEERS_UPGRADE peers — never the still-silent 4th
  const fifthCore = await createCore(t, keySource.key)
  const kp5 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(5))
  const destroy5 = replicate(localCore, fifthCore, { kp2: kp5 })
  t.after(destroy5)
  await waitFor(() =>
    localCore.peers.some(
      (p) => p.remotePublicKey.equals(kp5.publicKey) && p.remoteSynced
    )
  )
  // Allow any (incorrect) async continuations to settle
  await new Promise((res) => setTimeout(res, 300))

  assert.equal(
    crs.getState().remoteStates[fourthPeerId].status,
    'starting',
    '4th peer is still "starting" before its first Synchronize'
  )

  hold.release()
  await waitForStatus(crs, emitter, fourthPeerId, 'started')
})

/**
 * Intercept and queue the first Synchronize message(s) from peers that are
 * added to `core` after this is called, so tests can hold a peer in the
 * "channel open, length handshake not yet processed" state. Uses the same
 * interception point as production code: hypercore dispatches wire messages
 * by property lookup on the peer object, so shadowing `onsync` on the
 * instance sees every message.
 *
 * @param {import('hypercore')} core
 * @param {object} [opts]
 * @param {number} [opts.maxPeers] only hold the first `maxPeers` peers added
 * after this call (later peers' messages flow normally)
 */
function holdSynchronize(core, { maxPeers = Infinity } = {}) {
  /** @type {Array<() => unknown>} */
  const queued = []
  /** @type {Array<() => void>} */
  const restores = []
  let held = true
  let heldPeerCount = 0
  /** @param {import('../../src/types.js').HypercorePeer} peer */
  const onPeerAdd = (peer) => {
    if (heldPeerCount >= maxPeers) return
    heldPeerCount++
    const originalOnSync = peer.onsync
    peer.onsync = (...args) => {
      if (!held) return originalOnSync.apply(peer, args)
      queued.push(() => originalOnSync.apply(peer, args))
      return Promise.resolve()
    }
    restores.push(() => {
      peer.onsync = originalOnSync
    })
  }
  core.on('peer-add', onPeerAdd)
  return {
    release() {
      held = false
      core.off('peer-add', onPeerAdd)
      for (const apply of queued) apply()
      for (const restore of restores) restore()
    },
  }
}

/**
 * @param {() => boolean} condition
 * @param {number} [timeoutMs]
 */
async function waitFor(condition, timeoutMs = 1000) {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition')
    }
    await new Promise((res) => setTimeout(res, 10))
  }
}

/**
 * Wait until the peer's status matches, driven by state update events.
 *
 * @param {CoreSyncState} crs
 * @param {EventEmitter} emitter
 * @param {string} peerId
 * @param {import('../../src/sync/core-sync-state.js').PeerNamespaceState['status']} status
 * @param {number} [timeoutMs]
 */
async function waitForStatus(crs, emitter, peerId, status, timeoutMs = 1000) {
  await pTimeout(
    (async () => {
      while (crs.getState().remoteStates[peerId]?.status !== status) {
        await once(emitter, 'update')
      }
    })(),
    {
      milliseconds: timeoutMs,
      message: `Timed out waiting for status ${status}`,
    }
  )
}

test('bitCount32', () => {
  const testCases = new Set([0, 2 ** 32 - 1])
  for (let i = 0; i < 32; i++) {
    testCases.add(2 ** i)
    testCases.add(2 ** i - 1)
  }
  for (let i = 0; i < 100; i++) {
    testCases.add(Math.floor(Math.random() * 2 ** 32))
  }

  for (const n of testCases) {
    const actual = bitCount32(n)
    const expected = slowBitCount(n)
    assert.equal(
      actual,
      expected,
      `${n.toString(2)} has ${expected} bit(s) set`
    )
  }
})

// This takes several hours to run on my M2 Macbook Pro (it's the slowBitCount
// that takes a long time - bitCount32 takes about 23 seconds), so not running
// this by default. The test did pass when I ran it though.
test.skip('bitCount32 (full test)', () => {
  for (let n = 0; n < 2 ** 32; n++) {
    if (n % 2 ** 28 === 0) console.log(n)
    const bitCount = bitCount32(n)
    const expected = slowBitCount(n)
    if (bitCount !== expected) assert.fail('bitcount is correct ' + n)
  }
})

/**
 * Slow but understandable implementation to compare with fast obscure implementation
 * @param {number} n
 */
function slowBitCount(n) {
  let result = 0
  for (let i = 0, mask = 1; i < 32; i++) {
    if (n & mask) result++
    mask <<= 1
  }
  return result
}

/**
 *
 * @param {{ have?: number | bigint, prehave?: number, want?: number | bigint, status?: import('../../src/sync/core-sync-state.js').PeerNamespaceState['status'] }} param0
 */
function createState({ have, prehave, want, status }) {
  const peerState = new PeerState()
  if (prehave) {
    const bitfield = createUint32Array(prehave)
    peerState.insertPreHaves(0, bitfield)
  }
  if (have) {
    const bitfield = createBitfield(have)
    peerState.setHavesBitfield(bitfield)
  }
  if (want) {
    const bigInt = BigInt(want)
    // 53 because the max safe integer in JS is 53 bits
    for (let i = 0; i < 53; i++) {
      if ((bigInt >> BigInt(i)) & BigInt(1)) {
        peerState.addWantRange(i, 1)
      }
    }
  }
  if (typeof status === 'string') peerState.status = status
  return peerState
}

/**
 * Create a bitfield from a number, e.g. `createBitfield(0b1011)` will create a
 * bitfield with the 1st, 2nd and 4th bits set.
 * @param {number | bigint} bits
 */
function createBitfield(bits) {
  if (bits > Number.MAX_SAFE_INTEGER) throw new Error()
  const bitfield = new RemoteBitfield()
  const bigInt = BigInt(bits)
  // 53 because the max safe integer in JS is 53 bits
  for (let i = 0; i < 53; i++) {
    bitfield.set(i, !!((bigInt >> BigInt(i)) & BigInt(1)))
  }
  return bitfield
}

/**
 *
 * @param {import('hypercore')} core
 * @param {number | bigint} [bits]
 */
async function clearCore(core, bits) {
  if (typeof bits === 'undefined') return
  if (bits > Number.MAX_SAFE_INTEGER) throw new Error()
  await core.ready()
  const bigInt = BigInt(bits)
  const promises = []
  // 53 because the max safe integer in JS is 53 bits
  for (let i = 0; i < core.length; i++) {
    if ((bigInt >> BigInt(i)) & BigInt(1)) continue
    promises.push(core.clear(i))
  }
  await Promise.all(promises)
}

/**
 *
 * @param {import('hypercore')} core
 * @param {number | bigint} [bits]
 */
async function downloadCore(core, bits) {
  if (typeof bits === 'undefined') return
  if (bits > Number.MAX_SAFE_INTEGER) throw new Error()
  await core.ready()
  const bigInt = BigInt(bits)
  const blocks = []
  // 53 because the max safe integer in JS is 53 bits
  for (let i = 0; i < core.length; i++) {
    if ((bigInt >> BigInt(i)) & BigInt(1)) {
      blocks.push(i)
    }
  }
  await core.download({ blocks }).done()
}

/**
 *
 * @param {CoreSyncState} state
 * @param {string} peerId
 * @param {number | bigint} [bits]
 */
function setPeerWants(state, peerId, bits) {
  if (typeof bits === 'undefined') return
  if (bits > Number.MAX_SAFE_INTEGER) throw new Error()
  state.setWantsEverything(peerId, false)
  const bigInt = BigInt(bits)
  // 53 because the max safe integer in JS is 53 bits
  for (let i = 0; i < 53; i++) {
    if ((bigInt >> BigInt(i)) & BigInt(1)) {
      state.addWantRange(peerId, i, 1)
    }
  }
}

/**
 * Wait for update event with a timeout
 * @param {EventEmitter} updateEmitter
 * @param {number} milliseconds
 */
async function updateWithTimeout(updateEmitter, milliseconds) {
  return pTimeout(once(updateEmitter, 'update'), {
    milliseconds,
    message: false,
  })
}

/**
 * @typedef {ReturnType<import('@hyperswarm/secret-stream').keyPair>} KeyPair
 */

/**
 * @param {import('hypercore')} core1
 * @param {import('hypercore')} core2
 * @param { {kp1?: KeyPair, kp2?: KeyPair} } [keyPairs]
 * @returns {() => Promise<[void, void]>}
 */
export function replicate(
  core1,
  core2,
  {
    // Keep keypairs deterministic for tests, since we use peer.publicKey as an identifier.
    kp1 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(0)),
    kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1)),
  } = {}
) {
  const n1 = new NoiseSecretStream(true, undefined, {
    keyPair: kp1,
  })
  const n2 = new NoiseSecretStream(false, undefined, {
    keyPair: kp2,
  })

  const n1RawStream = /** @type {import('streamx').Duplex} */ (n1.rawStream)
  const n2RawStream = /** @type {import('streamx').Duplex} */ (n2.rawStream)
  n1RawStream.pipe(n2RawStream).pipe(n1RawStream)

  core1.replicate(n1)
  core2.replicate(n2)

  return async function destroy() {
    return Promise.all([
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n1.on('close', res)
          n1.destroy()
        })
      ),
      /** @type {Promise<void>} */
      (
        new Promise((res) => {
          n2.on('close', res)
          n2.destroy()
        })
      ),
    ])
  }
}

/**
 *
 * @param {number} n
 */
function createUint32Array(n) {
  if (n > 2 ** 32 - 1) {
    throw new Error('Currently can only make array from 32-bit number')
  }
  return new Uint32Array([n])
}
