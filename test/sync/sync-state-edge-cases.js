import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveState, PeerState } from '../../src/sync/core-sync-state.js'
import { aggregatePeerStateForTesting as mutatingAddPeerState } from '../../src/sync/namespace-sync-state.js'
import RemoteBitfield from '../../src/core-manager/remote-bitfield.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a PeerState whose "haves" bitfield has the bits of `have` set.
 * @param {{ have?: number, status?: import('../../src/sync/core-sync-state.js').PeerNamespaceState['status'] }} [opts]
 */
function makePeerState({ have = 0, status } = {}) {
  const peerState = new PeerState()
  if (have) {
    const bitfield = new RemoteBitfield()
    const bigInt = BigInt(have)
    for (let i = 0; i < 53; i++) {
      bitfield.set(i, Boolean((bigInt >> BigInt(i)) & BigInt(1)))
    }
    peerState.setHavesBitfield(bitfield)
  }
  if (status) peerState.status = status
  return peerState
}

/**
 * Build a PeerNamespaceState (the per-namespace aggregated shape).
 * @param {import('../../src/sync/core-sync-state.js').PeerNamespaceState['status']} status
 * @param {number} [have]
 * @param {number} [want]
 * @param {number} [wanted]
 * @returns {import('../../src/sync/core-sync-state.js').PeerNamespaceState}
 */
function peerNsState(status, have = 0, want = 0, wanted = 0) {
  return { have, want, wanted, status }
}

// ---------------------------------------------------------------------------
// BUG F1 — namespace-sync-state.js:211 uses `===` (comparison) where `=`
// (assignment) was intended, so a peer that is 'stopped' on one core but
// 'started' on an earlier-iterated core stays reported as 'started'.
// The adjacent 'starting' branch (:216) is correct, so we keep that as a
// passing regression guard.
// ---------------------------------------------------------------------------

test(
  'mutatingAddPeerState: any core stopped => aggregate stopped',
  { todo: 'BUG F1: namespace-sync-state.js:211 uses === instead of =' },
  () => {
    const accumulator = peerNsState('started', 1)
    mutatingAddPeerState(accumulator, peerNsState('stopped', 1))
    assert.equal(
      accumulator.status,
      'stopped',
      'a peer stopped on any core must aggregate to stopped (least-synced wins)'
    )
  }
)

test('mutatingAddPeerState: starting overrides started (already correct)', () => {
  const accumulator = peerNsState('started', 1)
  mutatingAddPeerState(accumulator, peerNsState('starting', 1))
  assert.equal(accumulator.status, 'starting')
})

test('mutatingAddPeerState: block counts always sum', () => {
  const accumulator = peerNsState('started', 1, 2, 3)
  mutatingAddPeerState(accumulator, peerNsState('started', 4, 5, 6))
  assert.deepEqual(accumulator, peerNsState('started', 5, 7, 9))
})

// ---------------------------------------------------------------------------
// BUG F2 — core-sync-state.js:445 scalar want() uses `index > contiguousLength`
// where `>=` was intended (have() uses `<`, wantWord() uses `>=`). The block at
// `index === contiguousLength` is the first not-yet-had block and should be
// wanted. (No runtime impact today: scalar want()/have() have no callers, but
// it is a correctness trap.)
// ---------------------------------------------------------------------------

test(
  'PeerState.want at the contiguousLength boundary',
  { todo: 'BUG F2: core-sync-state.js:445 uses > instead of >=' },
  () => {
    const peerState = new PeerState() // wants everything
    peerState.contiguousLength = 5
    assert.equal(
      peerState.have(5),
      false,
      'block at contiguousLength is not yet had'
    )
    assert.equal(
      peerState.want(5),
      true,
      'block at contiguousLength should be wanted (matches wantWord)'
    )
  }
)

test('PeerState.want is consistent with wantWord at the boundary (cross-check)', () => {
  const peerState = new PeerState()
  peerState.contiguousLength = 5
  // wantWord is the form deriveState actually uses; bit 5 must be set.
  assert.notEqual(
    peerState.wantWord(0) & (1 << 5),
    0,
    'wantWord marks block 5 as wanted'
  )
})

// ---------------------------------------------------------------------------
// COVERAGE P0.2 — deriveState excludes blocked peers (core-sync-state.js:504-509).
// Existing tests always pass `peerSyncControllers: new Map()`, so `isBlocked`
// is never true. This asserts the exclusion behaves correctly (passes today).
// ---------------------------------------------------------------------------

test('deriveState excludes peers blocked for the namespace', () => {
  const blockedPsc = {
    syncCapability: {
      auth: 'blocked',
      config: 'blocked',
      data: 'blocked',
      blobIndex: 'blocked',
      blob: 'blocked',
    },
  }
  const derived = deriveState({
    length: 4,
    localState: makePeerState({ have: 0 }), // we have nothing, want everything
    remoteStates: new Map([
      ['blockedPeer', makePeerState({ have: 0b1111 })],
      ['okPeer', makePeerState({ have: 0b0011 })],
    ]),
    // @ts-expect-error - test stub only needs syncCapability
    peerSyncControllers: new Map([['blockedPeer', blockedPsc]]),
    namespace: 'auth',
  })

  assert.ok(
    !('blockedPeer' in derived.remoteStates),
    'blocked peer is excluded from remoteStates'
  )
  assert.ok('okPeer' in derived.remoteStates, 'allowed peer is present')
  assert.equal(
    derived.localState.want,
    2,
    'only the non-blocked peer contributes to localState.want'
  )
})

// ---------------------------------------------------------------------------
// COVERAGE P0.3 — contiguousLength masking in haveWord/wantWord. Existing tests
// run with contiguousLength === 0, so the masking paths are untested.
// ---------------------------------------------------------------------------

test('PeerState haveWord/wantWord with partial contiguous overlap', () => {
  const peerState = new PeerState() // wants everything
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

test('PeerState haveWord/wantWord with a fully-contiguous word', () => {
  const peerState = new PeerState()
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
