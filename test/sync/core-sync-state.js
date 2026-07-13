import test from 'node:test'
import assert from 'node:assert/strict'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import {
  deriveCoreState,
  PeerCoreState,
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

/**
 * Counts in the derived state are always from the local device's point of
 * view: for a peer entry, `toSend` = blocks that peer still needs from us,
 * `toReceive` = blocks we still need from that peer.
 *
 * @type {Array<{
 *   message: string,
 *   state: {
 *     length: number,
 *     localState: Parameters<createState>[0],
 *     remoteStates: Array<Parameters<createState>[0]>
 *   },
 *   expected: import('../../src/sync/core-sync-state.js').DerivedCoreState
 * }>}
 */
const scenarios = [
  {
    message: '3 peers, start with haves, test toSend, have, and toReceive',
    state: {
      length: 4,
      localState: { have: 0b0111 },
      remoteStates: [{ have: 0b0011 }, { have: 0b0101 }, { have: 0b0001 }],
    },
    expected: {
      coreLength: 4,
      local: { toReceive: 0, have: 3, toSend: 2 },
      devices: {
        peer0: {
          toSend: 1,
          have: 2,
          toReceive: 0,
          channel: 'closed',
        },
        peer1: {
          toSend: 1,
          have: 2,
          toReceive: 0,
          channel: 'closed',
        },
        peer2: {
          toSend: 2,
          have: 1,
          toReceive: 0,
          channel: 'closed',
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
      local: { toReceive: 0, have: 0, toSend: 0 },
      devices: {
        peer0: {
          toSend: 0,
          have: 0,
          toReceive: 0,
          channel: 'closed',
        },
        peer1: {
          toSend: 0,
          have: 0,
          toReceive: 0,
          channel: 'closed',
        },
      },
    },
  },
  {
    message: 'open channel',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ have: 0b001, want: 0b011, channel: 'open' }],
    },
    expected: {
      coreLength: 3,
      local: { toReceive: 0, have: 3, toSend: 1 },
      devices: {
        peer0: { toSend: 1, have: 1, toReceive: 0, channel: 'open' },
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
      local: { toReceive: 0, have: 3, toSend: 1 },
      devices: {
        peer0: {
          toSend: 1,
          have: 1,
          toReceive: 0,
          channel: 'closed',
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
      local: { toReceive: 0, have: 3, toSend: 1 },
      devices: {
        peer0: {
          toSend: 1,
          have: 2,
          toReceive: 0,
          channel: 'closed',
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
      local: { toReceive: 0, have: 3, toSend: 0 },
      devices: {
        peer0: {
          toSend: 0,
          have: 3,
          toReceive: 0,
          channel: 'closed',
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
      local: { toReceive: 0, have: 50, toSend: 15 },
      devices: {
        peer0: {
          toSend: 10,
          have: 40,
          toReceive: 0,
          channel: 'closed',
        },
        peer1: {
          toSend: 5,
          have: 40,
          toReceive: 0,
          channel: 'closed',
        },
        peer2: {
          toSend: 5,
          have: 40,
          toReceive: 0,
          channel: 'closed',
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
      local: { toReceive: 0, have: 2, toSend: 2 },
      devices: {
        peer0: {
          toSend: 1,
          have: 0,
          toReceive: 0,
          channel: 'closed',
        },
        peer1: {
          toSend: 2,
          have: 0,
          toReceive: 0,
          channel: 'closed',
        },
      },
    },
  },
]

test('deriveCoreState() scenarios', () => {
  for (const { state, expected, message } of scenarios) {
    const derivedState = deriveCoreState({
      length: state.length,
      localState: createState(state.localState),
      remoteStates: new Map(
        state.remoteStates.map((s, i) => ['peer' + i, createState(s)])
      ),
      isPeerSyncAllowed: () => true,
    })
    assert.deepEqual(derivedState, expected, message)
  }
})

test('deriveCoreState() excludes blocked peers from counts', () => {
  const derivedState = deriveCoreState({
    length: 4,
    localState: createState({ have: 0b0111 }),
    remoteStates: new Map([
      ['allowedPeer', createState({ have: 0b0011 })],
      ['blockedPeer', createState({ have: 0b1000 })],
    ]),
    isPeerSyncAllowed: (deviceId) => deviceId !== 'blockedPeer',
  })
  assert.deepEqual(derivedState, {
    coreLength: 4,
    // The blocked peer's blocks are not counted as toReceive/toSend, and the
    // blocked peer has no entry at all
    local: { toReceive: 0, have: 3, toSend: 1 },
    devices: {
      allowedPeer: {
        toSend: 1,
        have: 2,
        toReceive: 0,
        channel: 'closed',
      },
    },
  })
})

test('deriveCoreState() have at index beyond bitfield page size', () => {
  const localState = createState({ have: 2 ** 10 - 1 })
  const remoteState = new PeerCoreState()
  const remoteHaveBitfield = new RemoteBitfield()
  remoteHaveBitfield.set(BITS_PER_PAGE - 1 + 10, true)
  remoteState.setHavesBitfield(remoteHaveBitfield)
  const state = {
    length: BITS_PER_PAGE + 10,
    localState,
    remoteStates: new Map([['peer0', remoteState]]),
    isPeerSyncAllowed: () => true,
  }
  const expected = {
    coreLength: BITS_PER_PAGE + 10,
    local: {
      toReceive: 1,
      have: 10,
      toSend: 10,
    },
    devices: {
      peer0: {
        toSend: 10,
        have: 1,
        toReceive: 1,
        channel: 'closed',
      },
    },
  }
  assert.deepEqual(deriveCoreState(state), expected)
})

test('CoreSyncState integration', async (t) => {
  for (const { state, expected, message } of scenarios) {
    const localCore = await createCore(t)
    await localCore.ready()
    const emitter = new EventEmitter()
    const crs = new CoreSyncState({
      onUpdate: () => emitter.emit('update'),
      isPeerSyncAllowed: () => true,
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
    /** @type {Map<string, 'open' | 'closed'>} */
    const channelsByPeer = new Map()
    for (const [
      index,
      { have, want, prehave },
    ] of state.remoteStates.entries()) {
      const seed = Buffer.allocUnsafe(32).fill(index)
      const kp2 = NoiseSecretStream.keyPair(seed)
      const peerId = kp2.publicKey.toString('hex')
      peerIds.set('peer' + index, peerId)
      channelsByPeer.set(peerId, 'closed')

      // We unit test deriveCoreState with no bitfields, but we need something
      // here for things to work
      crs.insertPreHaves(peerId, 0, createUint32Array(prehave || 0))
      if (typeof have !== 'number' && typeof want !== 'number') continue
      channelsByPeer.set(peerId, 'open')
      const core = await createCore(t, localCore.key)
      setPeerWants(crs, peerId, want)
      replicate(localCore, core, { kp1, kp2 })
      await core.update({ wait: true })
      downloadPromises.push(downloadCore(core, have))
    }
    await Promise.all(downloadPromises)
    await clearCore(localCore, state.localState.have)
    const expectedDevices = Object.fromEntries(
      Object.entries(expected.devices).map(([key, value]) => {
        const peerId = peerIds.get(key)
        return [
          peerId,
          {
            ...value,
            channel: channelsByPeer.get(peerId),
          },
        ]
      })
    )
    await updateWithTimeout(emitter, 100)
    assert.deepEqual(
      crs.getState(),
      { ...expected, devices: expectedDevices },
      message
    )
  }
})

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
 * @param {{ have?: number | bigint, prehave?: number, want?: number | bigint, channel?: import('../../src/sync/core-sync-state.js').ChannelState }} param0
 */
function createState({ have, prehave, want, channel }) {
  const peerState = new PeerCoreState()
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
  if (typeof channel === 'string') peerState.channel = channel
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

test('PeerCoreState.want is consistent with wantWord at the contiguous boundary', () => {
  const peerState = new PeerCoreState()
  peerState.contiguousLength = 5
  // wantWord is the form deriveCoreState actually uses; bit 5 must be set
  assert.notEqual(
    peerState.wantWord(0) & (1 << 5),
    0,
    'wantWord marks block 5 as wanted'
  )
  assert.equal(
    peerState.want(5),
    true,
    'scalar want() agrees with wantWord at the boundary'
  )
})

test('PeerCoreState haveWord/wantWord with partial contiguous overlap', () => {
  const peerState = new PeerCoreState() // wants everything
  peerState.contiguousLength = 5
  assert.equal(
    peerState.haveWord(0) & 0xff,
    0b11111,
    'lower 5 bits are "had" via the contiguous range'
  )
  assert.equal(
    peerState.wantWord(0) & 0b11111,
    0,
    'contiguous (already-had) bits are not wanted'
  )
  assert.notEqual(
    peerState.wantWord(0) & (1 << 5),
    0,
    'the first non-contiguous bit is wanted'
  )
})

test('PeerCoreState haveWord/wantWord with a fully-contiguous word', () => {
  const peerState = new PeerCoreState()
  peerState.contiguousLength = 32
  assert.equal(
    peerState.haveWord(0) >>> 0,
    0xffffffff,
    'all 32 bits "had" when the whole word is within the contiguous range'
  )
  assert.equal(
    peerState.wantWord(0),
    0,
    'nothing wanted when the whole word is contiguous'
  )
})

test('PeerCoreState with no evidence the peer knows the core wants nothing', () => {
  const peerState = new PeerCoreState({
    wantsEverything: false,
    coreKnown: false,
  })
  assert.equal(peerState.wantWord(0), 0, 'no fabricated wants')
  // Evidence arrives (e.g. pre-haves or an open channel): default wants apply
  peerState.markCoreKnown(true)
  assert.equal(
    peerState.wantWord(0) >>> 0,
    0xffffffff,
    'wants everything once the core is known'
  )
})
