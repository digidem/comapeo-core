import test from 'node:test'
import assert from 'node:assert/strict'
import { isDeepStrictEqual } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { pEvent } from 'p-event'
import { createSyncScenario } from './sync-scenario.js'

/** @import { State } from '../src/sync/sync-api.js' */

// The public sync state (`$sync.getState()` / 'sync-state' events): progress
// counts, per-device enabled/complete flags, and completion detection —
// including with devices that connect late, disconnect, or never enable sync.

/** A device-group progress entry that is fully synced */
const SYNCED = {
  isSyncEnabled: true,
  isComplete: true,
  toReceive: 0,
  toSend: 0,
}

test('state before connecting, and when a peer appears', async (t) => {
  const s = await createSyncScenario(t, {
    devices: { creator: {}, member: {} },
    connected: false,
  })
  await s.seed('creator', { observation: 1 })

  assert.deepEqual(
    s.project('creator').$sync.getState(),
    { syncMode: 'initial', devices: {} },
    'disconnected: initial mode, no devices'
  )

  await s.connect()
  await s.waitForSync('initial')

  // The reported per-device isSyncEnabled needs both devices' channels open,
  // which can lag completion by a beat (the other device's auth gate), so
  // wait for the expected state rather than asserting instantly
  const expected = {
    syncMode: 'initial',
    devices: {
      [s.deviceId('member')]: {
        initial: SYNCED,
        data: {
          isSyncEnabled: false,
          isComplete: false,
          toReceive: 0,
          toSend: 1,
        },
      },
    },
  }
  await s.waitForSyncState(
    'creator',
    (state) => isDeepStrictEqual(state, expected),
    { message: 'creator settles on: initial synced, 1 observation to send' }
  )
})

test(
  'per-device progress counts prior to data sync, six devices',
  { timeout: 120_000 },
  async (t) => {
    const names = ['creator', 'm1', 'm2', 'm3', 'm4', 'm5']
    const s = await createSyncScenario(t, {
      devices: Object.fromEntries(names.map((name) => [name, {}])),
    })

    for (const name of names) {
      const { devices } = s.project(name).$sync.getState()
      assert.equal(
        Object.keys(devices).length,
        names.length - 1,
        `${name} reports all other devices`
      )
    }

    // Each device creates a distinct number of observations, so every
    // pairwise toReceive/toSend is distinguishable
    for (const [i, name] of names.entries()) {
      await s.seed(name, { observation: 3 + i })
    }
    await s.waitForSync('initial')

    // Disconnect and reconnect, because pre-have messages about data cores
    // are currently only shared on first connection
    await s.disconnectAll()
    await s.connect()

    const expected = names.map((name) => {
      /** @type {State['devices']} */ const devices = {}
      const myCount = s.seeded[name]?.observation.length ?? 0
      for (const other of names) {
        if (other === name) continue
        devices[s.deviceId(other)] = {
          initial: SYNCED,
          data: {
            isSyncEnabled: false,
            isComplete: false,
            toReceive: s.seeded[other]?.observation.length ?? 0,
            toSend: myCount,
          },
        }
      }
      return { syncMode: /** @type {const} */ ('initial'), devices }
    })

    await Promise.all(
      names.map((name, i) =>
        pEvent(s.project(name).$sync, 'sync-state', (state) =>
          isDeepStrictEqual(state, expected[i])
        )
      )
    )
    assert.deepEqual(
      names.map((name) => s.project(name).$sync.getState()),
      expected
    )
  }
)

test('pre-haves update pending counts while data sync is off', async (t) => {
  const s = await createSyncScenario(t, {
    devices: { creator: {}, member: {} },
  })
  await s.waitForSync('initial')

  const creatorSync = s.project('creator').$sync
  const memberSync = s.project('member').$sync
  const creatorId = s.deviceId('creator')
  const memberId = s.deviceId('member')

  assert.deepEqual(
    creatorSync.getState().devices[memberId].data,
    { isSyncEnabled: false, isComplete: true, toReceive: 0, toSend: 0 },
    'nothing pending at start'
  )

  const creatorSees = pEvent(
    creatorSync,
    'sync-state',
    ({ devices }) => devices[memberId]?.data.toSend > 0
  )
  const memberSees = pEvent(
    memberSync,
    'sync-state',
    ({ devices }) => devices[creatorId]?.data.toReceive > 0
  )

  // Creating a doc broadcasts a pre-have to connected peers even though the
  // data namespace is not replicating, so both sides learn there is
  // something to sync
  await s.seed('creator', { observation: 1 })
  await Promise.all([creatorSees, memberSees])

  assert.deepEqual(
    memberSync.getState().devices[creatorId].data,
    { isSyncEnabled: false, isComplete: false, toReceive: 1, toSend: 0 },
    'member learns it has something to receive'
  )
})

test(
  'per-device isSyncEnabled reflects whether the *other* device is syncing',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, m1: {}, m2: {} },
    })
    await s.seed('creator', { observation: 1 })
    await s.waitForSync('initial')

    const creatorSync = s.project('creator').$sync
    const m1Id = s.deviceId('m1')
    const m2Id = s.deviceId('m2')

    // Only the creator starts data sync: no device pair is data-syncing yet
    s.startDataSync('creator')
    assert.equal(creatorSync.getState().syncMode, 'all')
    assert.equal(
      creatorSync.getState().devices[m1Id].data.isSyncEnabled,
      false,
      'm1 has not enabled data sync'
    )

    const m1AppearsEnabled = pEvent(
      creatorSync,
      'sync-state',
      ({ devices }) => devices[m1Id]?.data.isSyncEnabled
    )
    s.startDataSync('m1')
    await m1AppearsEnabled

    assert.equal(
      creatorSync.getState().devices[m2Id]?.data.isSyncEnabled,
      false,
      'm2 still has not enabled data sync'
    )

    // Wait for creator↔m1 to finish. (waitForSync('all') would never resolve
    // here — m2 never enables data sync, so device-wide completion is
    // legitimately unreachable — so wait on the pair's isComplete instead.)
    await s.waitForSyncState(
      'creator',
      ({ devices }) => devices[m1Id]?.data.isComplete === true,
      { message: 'creator never completed data sync with m1' }
    )
    await s.waitForSyncState(
      'm1',
      ({ devices }) => devices[s.deviceId('creator')]?.data.isComplete === true,
      { message: 'm1 never completed data sync with creator' }
    )
    const m1AppearsDisabled = pEvent(
      creatorSync,
      'sync-state',
      ({ devices }) => !devices[m1Id]?.data.isSyncEnabled
    )
    s.stopDataSync('m1')
    await m1AppearsDisabled

    assert.deepEqual(
      creatorSync.getState().devices[m1Id],
      {
        initial: SYNCED,
        data: {
          isSyncEnabled: false,
          isComplete: true,
          toReceive: 0,
          toSend: 0,
        },
      },
      'm1: settled and disabled'
    )
    assert.deepEqual(
      creatorSync.getState().devices[m2Id],
      {
        initial: SYNCED,
        data: {
          isSyncEnabled: false,
          isComplete: false,
          toReceive: 0,
          toSend: 1,
        },
      },
      'm2: never enabled, still needs the observation'
    )
  }
)

test('sync-state events emitted on start and stop', async (t) => {
  const s = await createSyncScenario(t, {
    devices: { creator: {}, member: {} },
  })
  const sync = s.project('creator').$sync

  /** @type {State[]} */ let states = []
  sync.on('sync-state', (state) => states.push(state))

  states = []
  sync.start()
  assert(states.length >= 1, 'at least one event after starting')
  for (const state of states) assert.equal(state.syncMode, 'all')

  await delay(500)

  states = []
  sync.stop()
  assert(states.length >= 1, 'at least one event after stopping')
  for (const state of states) assert.equal(state.syncMode, 'initial')
})

test(
  'full sync completes across three devices',
  { timeout: 120_000 },
  async (t) => {
    // Guards completion detection with >2 peers: a third peer must neither
    // be ignored (premature completion) nor block completion forever
    const s = await createSyncScenario(t, {
      devices: { a: {}, b: {}, c: {} },
    })
    for (const name of ['a', 'b', 'c']) {
      await s.seed(name, { observation: 40 })
    }
    s.startDataSync()
    await s.waitForSync('all', undefined, { timeout: 60_000 })
    await s.assertDocsConverged(['a', 'b', 'c'], 'observation', {
      expected: Object.values(s.seeded).flatMap(
        (docs) => docs.observation ?? []
      ),
    })
  }
)

test(
  'completion is not blocked by a disconnected peer we want data from',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, leaver: {}, stayer: {} },
    })

    // The leaver creates an observation; the creator learns it exists (via
    // pre-haves) but doesn't fetch it (data sync off)
    await s.seed('leaver', { observation: 1 })
    await s.waitForSync('initial')
    const leaverDeviceId = s.deviceId('leaver')
    await s.waitForSyncState(
      'creator',
      ({ devices }) => devices[leaverDeviceId]?.data.toReceive === 1,
      { message: "creator never learned about the leaver's observation" }
    )

    // The leaver disconnects, taking the only copy of its observation with
    // it. Sync must still complete between the remaining devices.
    await s.disconnect('leaver')

    s.startDataSync('creator', 'stayer')
    await s.project('creator').$sync.waitForSync('all', { timeoutMs: 10_000 })
  }
)

test(
  'completion with a newly-arrived peer is not blocked by an absent one',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, first: {}, second: {} },
      connected: false,
    })

    // Sync with the first device, which then leaves (with data of its own
    // the creator now wants)
    await s.connect('creator', 'first')
    await s.seed('first', { observation: 5 })
    await s.waitForSync('initial', ['creator', 'first'])
    await s.disconnect('first')

    // A different device arrives: initial sync with it must complete
    // without waiting on the absent device
    await s.connect('creator', 'second')
    await s.waitForSync('initial', ['creator', 'second'], { timeout: 10_000 })
  }
)

test(
  'waitForSync rejects with "Sync timeout" when sync stalls',
  { timeout: 60_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, member: {} },
    })

    // Only the creator enables data sync; both sides have data the other
    // wants, so full sync can never complete
    await s.seed('creator', { observation: 10 })
    await s.seed('member', { observation: 10 })
    s.startDataSync('creator')
    await s.waitForSync('initial')
    await delay(500)

    await assert.rejects(
      () => s.project('creator').$sync.waitForSync('all', { timeoutMs: 1_000 }),
      (err) => {
        assert(err instanceof Error)
        assert.equal(err.message, 'Sync timeout')
        return true
      }
    )
  }
)

test(
  'waitForSync keeps waiting while sync activity continues',
  { timeout: 60_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, member: {} },
    })
    s.startDataSync()

    // Continuous new data keeps resetting the inactivity timer, so a short
    // timeoutMs does not fire even though total wall-clock exceeds it
    let keepGoing = true
    const churn = (async () => {
      while (keepGoing) {
        await s.seed('member', { observation: 1 })
        await s.seed('creator', { observation: 1 })
        await delay(150)
      }
    })()

    try {
      await s.project('creator').$sync.waitForSync('all', { timeoutMs: 1_000 })
    } finally {
      keepGoing = false
      await churn
    }
  }
)
