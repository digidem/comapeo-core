// @ts-nocheck TODO
import test from 'node:test'
import assert from 'node:assert/strict'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hypercore from 'hypercore'
import RAM from 'random-access-memory'
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

test('CoreReplicationState', async () => {
  for (const { state, expected, message } of scenarios) {
    const localCore = await createCore()
    await localCore.ready()
    const emitter = new EventEmitter()
    const crs = new CoreSyncState({
      onUpdate: () => emitter.emit('update'),
      peerSyncControllers: new Map(),
      namespace: 'auth',
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
      const core = await createCore(localCore.key)
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

/** @param {any} [key] */
async function createCore(key) {
  const core = new Hypercore(() => new RAM(), key)
  await core.ready()
  return core
}

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
        peerState.setWantRange({ start: i, length: 1 })
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
  const bigInt = BigInt(bits)
  /** @type {{ start: number, length: number}[]} */
  const ranges = []
  // 53 because the max safe integer in JS is 53 bits
  for (let i = 0; i < 53; i++) {
    if ((bigInt >> BigInt(i)) & BigInt(1)) {
      ranges.push({ start: i, length: 1 })
    }
  }
  state.setPeerWants(peerId, ranges)
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
