import test from 'brittle'
import {
  deriveState,
  PeerState,
} from '../src/core-manager/core-replication-state.js'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'

/**
 * @type {Array<{
 *   message: string,
 *   state: {
 *     length: number,
 *     localState: Parameters<createState>[0],
 *     remoteStates: Array<Parameters<createState>[0]>
 *   },
 *   expected: import('../src/core-manager/core-replication-state.js').DerivedState
 * }>}
 */
const scenarios = [
  {
    message: 'No bitfields',
    state: {
      length: 4,
      localState: {},
      remoteStates: [{}, {}],
    },
    expected: {
      coreLength: 4,
      localState: { want: 0, have: 0, wanted: 0, missing: 4 },
      remoteStates: {
        peer0: { want: 0, have: 0, wanted: 0, missing: 4, connected: false },
        peer1: { want: 0, have: 0, wanted: 0, missing: 4, connected: false },
      },
    },
  },
  {
    message: '3 peers, start with haves, test want, have, wanted and missing',
    state: {
      length: 4,
      localState: { have: 0b0111 },
      remoteStates: [{ have: 0b0011 }, { have: 0b0101 }, { have: 0b0001 }],
    },
    expected: {
      coreLength: 4,
      localState: { want: 0, have: 3, wanted: 2, missing: 1 },
      remoteStates: {
        peer0: { want: 1, have: 2, wanted: 1, missing: 1, connected: false },
        peer1: { want: 1, have: 2, wanted: 1, missing: 1, connected: false },
        peer2: { want: 2, have: 1, wanted: 0, missing: 1, connected: false },
      },
    },
  },
  {
    message: 'connected = true',
    state: {
      length: 3,
      localState: { have: 0b111 },
      remoteStates: [{ have: 0b001, want: 0b011, connected: true }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 1, missing: 0 },
      remoteStates: {
        peer0: { want: 1, have: 1, wanted: 0, missing: 0, connected: true },
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
      localState: { want: 0, have: 3, wanted: 1, missing: 0 },
      remoteStates: {
        peer0: { want: 1, have: 1, wanted: 0, missing: 0, connected: false },
      },
    },
  },
  {
    message: 'test starting with prehaves',
    state: {
      length: 3,
      localState: { preHave: 0b111 },
      remoteStates: [{ preHave: 0b011 }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 1, missing: 0 },
      remoteStates: {
        peer0: { want: 1, have: 2, wanted: 0, missing: 0, connected: false },
      },
    },
  },
  {
    message: 'test starting with prehaves, then haves',
    state: {
      length: 3,
      localState: { preHave: 0b111 },
      remoteStates: [{ preHave: 0b011, have: 0b111 }],
    },
    expected: {
      coreLength: 3,
      localState: { want: 0, have: 3, wanted: 0, missing: 0 },
      remoteStates: {
        peer0: { want: 0, have: 3, wanted: 0, missing: 0, connected: false },
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
      localState: { want: 0, have: 50, wanted: 15, missing: 22 },
      remoteStates: {
        peer0: { want: 10, have: 40, wanted: 5, missing: 22, connected: false },
        peer1: { want: 5, have: 40, wanted: 10, missing: 0, connected: false },
        peer2: { want: 5, have: 40, wanted: 10, missing: 0, connected: false },
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
      localState: { want: 0, have: 2, wanted: 2, missing: 0 },
      remoteStates: {
        peer0: { want: 1, have: 0, wanted: 0, missing: 0, connected: false },
        peer1: { want: 2, have: 0, wanted: 0, missing: 0, connected: false },
      },
    },
  },
]

test('deriveState() scenarios', (t) => {
  for (const { state, expected, message } of scenarios) {
    const derivedState = deriveState({
      length: state.length,
      localState: createState(state.localState),
      remoteStates: new Map(
        state.remoteStates.map((s, i) => ['peer' + i, createState(s)])
      ),
    })
    t.alike(derivedState, expected, message)
  }
})

test('deriveState() have at index beyond bitfield page size', (t) => {
  const BITS_PER_PAGE = 32768
  const localState = createState({ have: 2 ** 10 - 1 })
  const remoteState = new PeerState()
  const remoteHaveBitfield = new RemoteBitfield()
  remoteHaveBitfield.set(BITS_PER_PAGE - 1 + 10, true)
  remoteState.setHavesBitfield(remoteHaveBitfield)
  const state = {
    length: BITS_PER_PAGE + 10,
    localState,
    remoteStates: new Map([['peer0', remoteState]]),
  }
  const expected = {
    coreLength: BITS_PER_PAGE + 10,
    localState: {
      want: 1,
      have: 10,
      wanted: 10,
      missing: BITS_PER_PAGE - 1,
    },
    remoteStates: {
      peer0: {
        want: 10,
        have: 1,
        wanted: 1,
        missing: BITS_PER_PAGE - 1,
        connected: false,
      },
    },
  }
  t.alike(deriveState(state), expected)
})

/**
 *
 * @param {{ have?: number, prehave?: number, want?: number, connected?: number }} param0
 */
function createState({ have, preHave, want, connected }) {
  const peerState = new PeerState()
  if (preHave) {
    const bitfield = createBitfield(preHave)
    peerState.setPreHavesBitfield(bitfield)
  }
  if (have) {
    const bitfield = createBitfield(have)
    peerState.setHavesBitfield(bitfield)
  }
  if (want) {
    const bitfield = createBitfield(want)
    peerState.setWantsBitfield(bitfield)
  }
  if (typeof connected === 'boolean') peerState.connected = connected
  return peerState
}

/**
 * Create a bitfield from a number, e.g. `createBitfield(0b1011)` will create a
 * bitfield with the 1st, 2nd and 4th bits set.
 * @param {number} bits
 */
function createBitfield(bits) {
  if (bits > Number.MAX_SAFE_INTEGER) throw new Error()
  const bitfield = new RemoteBitfield()
  const bigInt = BigInt(bits)
  // 53 because the max safe integer in JS is 53 bits
  for (let i = BigInt(0); i < 53; i++) {
    bitfield.set(Number(i), !!((bigInt >> i) & 1n))
  }
  return bitfield
}
