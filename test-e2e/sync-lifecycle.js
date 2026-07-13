import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import FakeTimers from '@sinonjs/fake-timers'
import { pEvent } from 'p-event'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { createSyncScenario } from './sync-scenario.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'

// Sync intent and lifecycle: starting and stopping data sync, autostop
// timers, app backgrounding, and tearing sync down when a project closes or
// is left mid-sync.

test(
  'data syncs only while BOTH devices have started, and stops when either stops',
  { timeout: 120_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { alice: {}, bob: {} },
    })

    const aliceSeed = await s.seed('alice', { observation: 1 })
    await s.waitForSync('initial')

    // Only Bob starts: nothing moves
    s.startDataSync('bob')
    await assert.rejects(
      () => s.waitForSync('all', undefined, { timeout: 1_000 }),
      'full sync cannot complete while Alice has not started'
    )
    await s.assertNeverReceived('bob', aliceSeed.observation)

    // Both started: data flows
    s.startDataSync('alice')
    await s.waitForSync('all', undefined, { timeout: 10_000 })
    await s.assertDocsConverged(['alice', 'bob'], 'observation')

    // Bob stops: new data no longer moves, in either direction
    s.stopDataSync('bob')
    const bobSeed = await s.seed('bob', { observation: 1 })
    const aliceSeed2 = await s.seed('alice', { observation: 1 })
    await s.waitForSync('initial')
    await assert.rejects(
      () => s.waitForSync('all', undefined, { timeout: 1_000 }),
      'full sync cannot complete after Bob stopped'
    )
    await s.assertNeverReceived('alice', bobSeed.observation)
    await s.assertNeverReceived('bob', aliceSeed2.observation)

    // Bob restarts: everything catches up
    s.startDataSync('bob')
    await s.waitForSync('all')
    await s.assertDocsConverged(['alice', 'bob'], 'observation')
  }
)

test('auto-stop', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const s = await createSyncScenario(t, {
    devices: { invitor: {}, invitee: {} },
  })
  const invitorSync = s.project('invitor').$sync
  const inviteeSync = s.project('invitee').$sync

  invitorSync.start({ autostopDataSyncAfter: 10_000 })
  inviteeSync.start({ autostopDataSyncAfter: 10_000 })

  assert.equal(invitorSync.getState().syncMode, 'all')
  assert.equal(inviteeSync.getState().syncMode, 'all')

  // New data arriving restarts the inactivity timer
  await s.seed('invitor', { observation: 1 })
  await s.waitForSync('all')
  await clock.tickAsync(9_000)

  await s.seed('invitee', { observation: 1 })
  await s.waitForSync('all')
  await clock.tickAsync(9_000)

  assert.equal(
    invitorSync.getState().syncMode,
    'all',
    'no auto-stop yet: each sync restarted the timer'
  )

  // With no further activity, both sides auto-stop
  const invitorStopped = pEvent(
    invitorSync,
    'sync-state',
    ({ syncMode }) => syncMode !== 'all'
  )
  const inviteeStopped = pEvent(
    inviteeSync,
    'sync-state',
    ({ syncMode }) => syncMode !== 'all'
  )
  clock.tick(2_000)
  await Promise.all([invitorStopped, inviteeStopped])

  // Changing the timeout while stopped does not restart sync
  invitorSync.setAutostopDataSyncTimeout(20_000)
  assert.notEqual(invitorSync.getState().syncMode, 'all')

  // Restarting uses the previously-set timeout
  invitorSync.start()
  inviteeSync.start()
  await s.seed('invitor', { observation: 1 })
  await s.waitForSync('all')
  await clock.tickAsync(19_000)
  assert.equal(invitorSync.getState().syncMode, 'all', 'still within timeout')

  const stoppedAgain = pEvent(
    invitorSync,
    'sync-state',
    ({ syncMode }) => syncMode !== 'all'
  )
  clock.tick(2_000)
  await stoppedAgain

  // start() can override, setAutostopDataSyncTimeout re-overrides
  invitorSync.start({ autostopDataSyncAfter: 999_999 })
  invitorSync.setAutostopDataSyncTimeout(20_000)
  assert.equal(invitorSync.getState().syncMode, 'all')
  const stoppedThird = pEvent(
    invitorSync,
    'sync-state',
    ({ syncMode }) => syncMode !== 'all'
  )
  clock.tick(21_000)
  await stoppedThird
})

test('disabling auto-stop timeout', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const s = await createSyncScenario(t, {
    devices: { invitor: {}, invitee: {} },
  })
  const invitorSync = s.project('invitor').$sync

  invitorSync.start({ autostopDataSyncAfter: 10_000 })
  invitorSync.setAutostopDataSyncTimeout(null)
  s.startDataSync('invitee')

  await s.seed('invitor', { observation: 1 })
  await s.waitForSync('all')

  await clock.tickAsync(999_999_999)
  assert.equal(
    invitorSync.getState().syncMode,
    'all',
    'null timeout disables auto-stop'
  )
})

test('validates auto-stop timeouts', async (t) => {
  const s = await createSyncScenario(t, { devices: { solo: {} } })
  const sync = s.project('solo').$sync

  const invalid = [-Infinity, 0, 1.23, 2 ** 31, Infinity]
  for (const autostopDataSyncAfter of invalid) {
    assert.throws(() => sync.start({ autostopDataSyncAfter }))
    assert.throws(() => sync.setAutostopDataSyncTimeout(autostopDataSyncAfter))
  }
  assert.notEqual(sync.getState().syncMode, 'all', 'sync was never started')
})

test(
  'backgrounding gracefully stops sync for all projects; foregrounding resumes',
  { timeout: 120_000 },
  async function (t) {
    const managers = await createManagers(2, t)
    const [invitor, ...invitees] = managers

    const disconnect = connectPeers(managers)
    t.after(disconnect)

    // Three projects on the same manager, all actively syncing
    const projectGroups = await Promise.all(
      [1, 2, 3].map(async (projectNumber) => {
        const projectId = await invitor.createProject({
          name: `Project ${projectNumber}`,
        })
        await invite({ invitor, invitees, projectId })
        const projects = await Promise.all(
          managers.map((m) => m.getProject(projectId))
        )
        const [invitorProject, inviteeProject] = projects

        const observation1 = await invitorProject.observation.create(
          valueOf(generate('observation')[0])
        )
        inviteeProject.$sync.start()
        invitorProject.$sync.start()
        await waitForSync(projects, 'all')

        return { invitorProject, inviteeProject, observation1 }
      })
    )

    invitor.onBackgrounded()

    const afterBackground = await Promise.all(
      projectGroups.map(
        async ({ invitorProject, inviteeProject, observation1 }) => {
          assert(
            await inviteeProject.observation.getByDocId(observation1.docId),
            'doc synced before backgrounding is present'
          )

          // Nothing written after backgrounding moves, in either direction
          const observation2 = await invitorProject.observation.create(
            valueOf(generate('observation')[0])
          )
          const observation3 = await inviteeProject.observation.create(
            valueOf(generate('observation')[0])
          )
          await delay(1_000)
          await assert.rejects(() =>
            inviteeProject.observation.getByDocId(observation2.docId)
          )
          await assert.rejects(() =>
            invitorProject.observation.getByDocId(observation3.docId)
          )
          return { invitorProject, inviteeProject, observation2, observation3 }
        }
      )
    )

    invitor.onForegrounded()

    await Promise.all(
      afterBackground.map(
        async ({
          invitorProject,
          inviteeProject,
          observation2,
          observation3,
        }) => {
          await waitForSync([invitorProject, inviteeProject], 'all')
          assert(
            await inviteeProject.observation.getByDocId(observation2.docId)
          )
          assert(
            await invitorProject.observation.getByDocId(observation3.docId)
          )
        }
      )
    )
  }
)

/**
 * Install a one-shot unhandledRejection guard that records the first
 * rejection. Removes node's own listeners for the duration of the test and
 * restores them after.
 *
 * @param {import('node:test').TestContext} t
 */
function captureUnhandledRejection(t) {
  /** @type {unknown} */
  let captured
  let didCapture = false
  /** @param {unknown} reason */
  const onUnhandled = (reason) => {
    if (!didCapture) {
      didCapture = true
      captured = reason
    }
  }
  const previous = process.listeners('unhandledRejection')
  for (const listener of previous) {
    process.off('unhandledRejection', listener)
  }
  process.on('unhandledRejection', onUnhandled)
  t.after(() => {
    process.off('unhandledRejection', onUnhandled)
    for (const listener of previous) {
      process.on('unhandledRejection', listener)
    }
  })
  return {
    get didCapture() {
      return didCapture
    },
    describe() {
      return captured instanceof Error ? captured.message : String(captured)
    },
  }
}

test('SyncApi close() is idempotent', async (t) => {
  const s = await createSyncScenario(t, { devices: { solo: {} } })
  const sync = s.project('solo').$sync
  sync.close()
  sync.close()
})

test(
  'closing a project mid-sync tears down sync cleanly',
  { timeout: 60_000 },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, member: {} },
    })

    await s.seed('creator', { observation: 60 })
    await s.seed('member', { observation: 60 })
    s.startDataSync()
    await s.waitForSync('initial')

    const memberProject = s.project('member')
    const creatorCore = memberProject[kCoreManager].creatorCore
    assert(
      creatorCore.listenerCount('peer-remove') > 0,
      'sync listeners are registered while the project is open (precondition)'
    )

    const guard = captureUnhandledRejection(t)

    // Close while data is still flowing
    await memberProject.close()
    await delay(500)

    assert.equal(
      guard.didCapture,
      false,
      `unexpected unhandled rejection on close: ${guard.describe()}`
    )
    // peer-remove on the creator core is only registered by the sync
    // subsystem, so zero listeners left proves sync tore down with the
    // project
    assert.equal(
      creatorCore.listenerCount('peer-remove'),
      0,
      'no sync listeners remain on the creator core after close'
    )
  }
)

test(
  'leaving a project while closing it concurrently is safe',
  {
    timeout: 60_000,
    todo:
      'KNOWN BUG (pre-existing, outside sync): the leave path awaits ' +
      'datatype reads/writes (indexer.idle()) that reject with "Cannot ' +
      'await idle after closing" when project close tears the indexer down ' +
      'mid-leave. Needs an idempotency/ordering guard in MapeoProject ' +
      '_close/kProjectLeave.',
  },
  async (t) => {
    const s = await createSyncScenario(t, {
      devices: { creator: {}, member: {} },
    })

    await s.seed('creator', { observation: 40 })
    await s.seed('member', { observation: 40 })
    s.startDataSync()
    await s.waitForSync('initial')

    const guard = captureUnhandledRejection(t)

    // Race the leave (assign LEFT + clear data + post-leave propagation)
    // against the project close path
    const results = await Promise.allSettled([
      s.manager('member').leaveProject(s.projectId),
      s.project('member').close(),
    ])
    await delay(500)

    const rejected = results.filter((r) => r.status === 'rejected')
    assert.equal(
      rejected.length,
      0,
      `neither leave nor close should reject, got: ${rejected
        .map((r) =>
          r.reason instanceof Error ? r.reason.message : String(r.reason)
        )
        .join('; ')}`
    )
    assert.equal(
      guard.didCapture,
      false,
      `unexpected unhandled rejection during leave/close race: ${guard.describe()}`
    )
  }
)
