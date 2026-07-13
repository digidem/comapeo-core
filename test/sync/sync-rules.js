import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeSyncMode,
  computeEnabledNamespaces,
  isSyncComplete,
  isTargetCompleteWithDevice,
  deriveSyncApiState,
} from '../../src/sync/sync-rules.js'
import { NAMESPACES } from '../../src/constants.js'

/** @import { PeerFacts, SyncProgressSnapshot, SyncCapability, DeviceNamespaceProgress } from '../../src/sync/sync-rules.js' */

/** @type {SyncCapability} */
const ALL_ALLOWED = {
  auth: 'allowed',
  config: 'allowed',
  data: 'allowed',
  blobIndex: 'allowed',
  blob: 'allowed',
}

/** @type {SyncCapability} */
const AUTH_ONLY = {
  auth: 'allowed',
  config: 'blocked',
  data: 'blocked',
  blobIndex: 'blocked',
  blob: 'blocked',
}

/**
 * @param {Partial<DeviceNamespaceProgress>} [overrides]
 * @returns {DeviceNamespaceProgress}
 */
function deviceProgress(overrides = {}) {
  return {
    have: 0,
    toReceive: 0,
    toSend: 0,
    openingChannels: 0,
    openChannels: 1,
    ...overrides,
  }
}

/**
 * Create a snapshot where every namespace has the given devices, all synced
 * unless overridden per namespace.
 *
 * @param {Record<string, Partial<Record<import('../../src/types.js').Namespace, Partial<DeviceNamespaceProgress>>>>} devices
 * @param {{ local?: Partial<Record<import('../../src/types.js').Namespace, { have?: number, toReceive?: number, toSend?: number }>> }} [opts]
 * @returns {SyncProgressSnapshot}
 */
function createSnapshot(devices, { local = {} } = {}) {
  const snapshot = /** @type {SyncProgressSnapshot} */ ({})
  for (const ns of NAMESPACES) {
    snapshot[ns] = {
      coreCount: 1,
      local: { have: 0, toReceive: 0, toSend: 0, ...local[ns] },
      devices: {},
    }
    for (const [deviceId, overridesByNamespace] of Object.entries(devices)) {
      snapshot[ns].devices[deviceId] = deviceProgress(
        overridesByNamespace[ns] || {}
      )
    }
  }
  return snapshot
}

/**
 * @param {string} deviceId
 * @param {SyncCapability} [capability]
 * @returns {PeerFacts}
 */
function createPeer(deviceId, capability = ALL_ALLOWED) {
  return { deviceId, capability }
}

test('computeSyncMode() truth table', () => {
  // Mirrors the behavior table previously documented in sync-api.js:
  // | Want data? | Backgrounded? | Complete? | Mode      |
  // | no         | no            | no        | initial   |
  // | no         | no            | yes       | initial   |
  // | no         | yes           | no        | initial   |
  // | no         | yes           | yes       | stopped   |
  // | yes        | no            | no        | all       |
  // | yes        | no            | yes       | all       |
  // | yes        | yes           | no        | all       |
  // | yes        | yes           | yes       | stopped   |
  const cases = /** @type {const} */ ([
    [false, false, false, 'initial'],
    [false, false, true, 'initial'],
    [false, true, false, 'initial'],
    [false, true, true, 'stopped'],
    [true, false, false, 'all'],
    [true, false, true, 'all'],
    [true, true, false, 'all'],
    [true, true, true, 'stopped'],
  ])
  for (const [wantsDataSync, isBackgrounded, isComplete, expected] of cases) {
    assert.equal(
      computeSyncMode({
        wantsDataSync,
        isBackgrounded,
        isComplete,
        previousMode: 'initial',
      }),
      expected,
      `wantsDataSync=${wantsDataSync} isBackgrounded=${isBackgrounded} isComplete=${isComplete}`
    )
  }
})

test('computeSyncMode() stays stopped while backgrounded', () => {
  // Once stopped in the background, new data appearing must not restart sync
  // until the app is foregrounded
  assert.equal(
    computeSyncMode({
      wantsDataSync: true,
      isBackgrounded: true,
      isComplete: false,
      previousMode: 'stopped',
    }),
    'stopped'
  )
  // Foregrounding resumes
  assert.equal(
    computeSyncMode({
      wantsDataSync: true,
      isBackgrounded: false,
      isComplete: false,
      previousMode: 'stopped',
    }),
    'all'
  )
})

test('computeEnabledNamespaces()', () => {
  assert.deepEqual(
    computeEnabledNamespaces({
      syncMode: 'stopped',
      capability: ALL_ALLOWED,
      isInitialSyncComplete: true,
    }),
    new Set(),
    'stopped: nothing replicates'
  )
  assert.deepEqual(
    computeEnabledNamespaces({
      syncMode: 'initial',
      capability: ALL_ALLOWED,
      isInitialSyncComplete: true,
    }),
    new Set(['auth', 'config', 'blobIndex']),
    'initial mode: only initial namespaces, even when initial sync is complete'
  )
  assert.deepEqual(
    computeEnabledNamespaces({
      syncMode: 'all',
      capability: ALL_ALLOWED,
      isInitialSyncComplete: false,
    }),
    new Set(['auth', 'config', 'blobIndex']),
    'all mode: data namespaces wait for initial sync with the peer'
  )
  assert.deepEqual(
    computeEnabledNamespaces({
      syncMode: 'all',
      capability: ALL_ALLOWED,
      isInitialSyncComplete: true,
    }),
    new Set(NAMESPACES),
    'all mode: everything once initial sync is complete'
  )
  assert.deepEqual(
    computeEnabledNamespaces({
      syncMode: 'all',
      capability: AUTH_ONLY,
      isInitialSyncComplete: true,
    }),
    new Set(['auth']),
    'capability-blocked namespaces never replicate'
  )
})

test('isTargetCompleteWithDevice()', () => {
  const peer = createPeer('a')

  assert.equal(
    isTargetCompleteWithDevice(createSnapshot({ a: {} }), peer, 'all'),
    true,
    'complete when channels open and nothing to transfer'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({ a: { auth: { openChannels: 0, openingChannels: 1 } } }),
      peer,
      'initial'
    ),
    false,
    'not complete until the creator core handshake finishes'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({ a: { config: { toReceive: 2 } } }),
      peer,
      'initial'
    ),
    false,
    'not complete while we still need blocks from the device'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({ a: { data: { toSend: 1 } } }),
      peer,
      'initial'
    ),
    true,
    'data namespaces do not affect the initial target'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({ a: { data: { toSend: 1 } } }),
      peer,
      'all'
    ),
    false,
    'data namespaces do affect the all target'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({ a: { blobIndex: { openingChannels: 1 } } }),
      peer,
      'initial'
    ),
    false,
    'a channel still opening blocks completion (we may not know their length yet)'
  )
  assert.equal(
    isTargetCompleteWithDevice(
      createSnapshot({
        a: { config: { toReceive: 5, openChannels: 0 } },
      }),
      createPeer('a', AUTH_ONLY),
      'initial'
    ),
    true,
    'capability-blocked namespaces are skipped (they will never sync)'
  )
})

test('isSyncComplete()', () => {
  const peerA = createPeer('a')
  const peerB = createPeer('b')

  assert.equal(
    isSyncComplete(createSnapshot({ a: {}, b: {} }), [peerA, peerB], 'all'),
    true
  )
  assert.equal(
    isSyncComplete(createSnapshot({ a: {} }), [], 'all'),
    true,
    'complete with no connected peers (nothing we can transfer)'
  )
  assert.equal(
    isSyncComplete(
      createSnapshot({ a: {} }, { local: { data: { toReceive: 3 } } }),
      [peerA],
      'all'
    ),
    false,
    'incomplete while we still need blocks, even if no per-device entry shows it'
  )
  assert.equal(
    isSyncComplete(
      createSnapshot({ a: {} }, { local: { data: { toReceive: 3 } } }),
      [peerA],
      'initial'
    ),
    true,
    'outstanding data blocks do not affect the initial target'
  )
  assert.equal(
    isSyncComplete(
      createSnapshot({
        a: {},
        b: { auth: { openChannels: 0, openingChannels: 1 } },
      }),
      [peerA, peerB],
      'initial'
    ),
    false,
    'a connected peer we have not finished the handshake with blocks completion'
  )
  // A connected peer with no state at all (e.g. a race where its state has
  // not been seeded yet) must block completion rather than being ignored
  const snapshotMissingB = createSnapshot({ a: {} })
  assert.equal(
    isSyncComplete(snapshotMissingB, [peerA, peerB], 'initial'),
    false,
    'a connected peer with no per-device state blocks completion'
  )
})

test('deriveSyncApiState()', () => {
  const peerA = createPeer('a')
  const state = deriveSyncApiState({
    snapshot: createSnapshot({
      a: { data: { toReceive: 5, toSend: 2 }, blob: { toReceive: 1 } },
    }),
    connectedPeers: [peerA],
    syncMode: 'all',
  })
  assert.deepEqual(state, {
    syncMode: 'all',
    devices: {
      a: {
        initial: {
          isSyncEnabled: true,
          isComplete: true,
          toReceive: 0,
          toSend: 0,
        },
        data: {
          isSyncEnabled: true,
          isComplete: false,
          toReceive: 6,
          toSend: 2,
        },
      },
    },
  })
})

test('deriveSyncApiState() data channels closed reads as data sync not enabled', () => {
  // Data replication channels only open when both sides enable data sync, so
  // closed channels mean the other device (or we) have not started data sync
  const peer = createPeer('a')
  const state = deriveSyncApiState({
    snapshot: createSnapshot({
      a: {
        data: { openChannels: 0 },
        blob: { openChannels: 0 },
      },
    }),
    connectedPeers: [peer],
    syncMode: 'initial',
  })
  assert.equal(state.devices.a.initial.isSyncEnabled, true)
  assert.equal(state.devices.a.data.isSyncEnabled, false)
  assert.equal(
    state.devices.a.data.isComplete,
    true,
    'closed channels with nothing outstanding still count as complete'
  )
})

test('deriveSyncApiState() auth-only peer still appears in devices', () => {
  const peer = createPeer('a', AUTH_ONLY)
  const state = deriveSyncApiState({
    snapshot: createSnapshot({ a: {} }),
    connectedPeers: [peer],
    syncMode: 'all',
  })
  assert.deepEqual(Object.keys(state.devices), ['a'])
  assert.equal(state.devices.a.initial.isSyncEnabled, true)
  assert.equal(
    state.devices.a.data.isSyncEnabled,
    false,
    'all data-group namespaces blocked means data sync not enabled'
  )
  assert.equal(
    state.devices.a.data.isComplete,
    true,
    'blocked namespaces are complete (they will never sync)'
  )
})
