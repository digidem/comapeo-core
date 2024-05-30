import { test } from 'brittle'
import assert from 'node:assert/strict'
import { pEvent } from 'p-event'
import { setTimeout as delay } from 'timers/promises'
import { excludeKeys } from 'filter-obj'
import FakeTimers from '@sinonjs/fake-timers'
import { map } from 'iterpal'
import {
  connectPeers,
  createManager,
  createManagers,
  invite,
  seedDatabases,
  waitForPeers,
  waitForSync,
} from './utils.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { getKeys } from '../tests/helpers/core-manager.js'
import { NAMESPACES } from '../src/constants.js'
import { PRESYNC_NAMESPACES } from '../src/sync/peer-sync-controller.js'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import pTimeout from 'p-timeout'
import { BLOCKED_ROLE_ID, COORDINATOR_ROLE_ID } from '../src/roles.js'
import { kSyncState } from '../src/sync/sync-api.js'
/** @typedef {import('../src/mapeo-project.js').MapeoProject} MapeoProject */
/** @typedef {import('../src/sync/sync-api.js').SyncTypeState} SyncState */

const SCHEMAS_INITIAL_SYNC = ['preset', 'field']

test('Create and sync data', { timeout: 100_000 }, async (t) => {
  // NOTE: Unlike other tests in this file, this test uses `node:assert` instead
  // of `t` to ease our transition away from Brittle. We can remove this comment
  // when Brittle is removed.
  const COUNT = 10
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  await disconnect()

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const generatedDocs = (await seedDatabases(projects)).flat()
  t.pass(`Generated ${generatedDocs.length} values`)
  const generatedSchemaNames = generatedDocs.reduce((acc, cur) => {
    acc.add(cur.schemaName)
    return acc
  }, new Set())

  connectPeers(managers, { discovery: false })
  await waitForSync(projects, 'initial')

  await Promise.all(
    map(generatedSchemaNames, (schemaName) =>
      Promise.all(
        map(projects, async (project) => {
          const deviceId = project.deviceId.slice(0, 7)
          // @ts-ignore - to complex to narrow `schemaName` to valid values
          const docs = await project[schemaName].getMany()
          const expected = generatedDocs.filter(
            (v) => v.schemaName === schemaName
          )
          if (SCHEMAS_INITIAL_SYNC.includes(schemaName)) {
            assert.deepEqual(
              new Set(docs),
              new Set(expected),
              `All ${schemaName} docs synced to ${deviceId}`
            )
          } else {
            assert.notEqual(
              docs.length,
              expected.length,
              `Not all ${schemaName} docs synced to ${deviceId}`
            )
          }
        })
      )
    )
  )

  for (const project of projects) {
    project.$sync.start()
  }

  await waitForSync(projects, 'full')

  await Promise.all(
    map(generatedSchemaNames, (schemaName) =>
      Promise.all(
        map(projects, async (project) => {
          const deviceId = project.deviceId.slice(0, 7)
          // @ts-ignore - too complex to narrow `schemaName` to valid values
          const docs = await project[schemaName].getMany()
          const expected = generatedDocs.filter(
            (v) => v.schemaName === schemaName
          )
          assert.deepEqual(
            new Set(docs),
            new Set(expected),
            `All ${schemaName} docs synced to ${deviceId}`
          )
        })
      )
    )
  )
})

test('start and stop sync', async function (t) {
  // Checks that both peers need to start syncing for data to sync, and that
  // $sync.stop() actually stops data syncing
  const COUNT = 2
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, inviteeProject] = projects

  const obs1 = await invitorProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'initial')
  inviteeProject.$sync.start()

  await t.exception(
    () => pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 }),
    'wait for sync times out'
  )

  await t.exception(
    () => inviteeProject.observation.getByDocId(obs1.docId),
    'before both peers have started sync, doc does not sync'
  )

  invitorProject.$sync.start()

  // Use the same timeout as above, to check that it would have synced given the timeout
  await pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 })

  const obs1Synced = await inviteeProject.observation.getByDocId(obs1.docId)

  t.alike(obs1Synced, obs1, 'observation is synced')

  inviteeProject.$sync.stop()

  const obs2 = await inviteeProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'initial')

  await t.exception(
    () => pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 }),
    'wait for sync times out'
  )

  await t.exception(
    () => invitorProject.observation.getByDocId(obs2.docId),
    'after stopping sync, data does not sync'
  )

  inviteeProject.$sync.start()

  await pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 })

  const obs2Synced = await invitorProject.observation.getByDocId(obs2.docId)

  t.alike(obs2Synced, obs2, 'observation is synced')

  await disconnect()
})

test('auto-stop', async (t) => {
  // NOTE: Unlike other tests in this file, this test uses `node:assert` instead
  // of `t` to ease our transition away from Brittle. We can remove this comment
  // when Brittle is removed.
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())

  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers, { discovery: false })
  t.teardown(disconnect)

  const projectId = await invitor.createProject({ name: 'mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, inviteeProject] = projects

  const generatedObservations = generate('observation', { count: 2 })

  invitorProject.$sync.start({ autostopDataSyncAfter: 10_000 })
  inviteeProject.$sync.start({ autostopDataSyncAfter: 10_000 })

  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    "invitor hasn't auto-stopped yet"
  )
  assert(
    inviteeProject.$sync.getState().data.isSyncEnabled,
    "invitee hasn't auto-stopped yet"
  )

  const observation1 = await invitorProject.observation.create(
    valueOf(generatedObservations[0])
  )
  await waitForSync(projects, 'full')
  assert(
    await inviteeProject.observation.getByDocId(observation1.docId),
    'invitee receives doc'
  )

  await clock.tickAsync(9000)

  const observation2 = await invitorProject.observation.create(
    valueOf(generatedObservations[1])
  )
  await waitForSync(projects, 'full')
  assert(
    await inviteeProject.observation.getByDocId(observation2.docId),
    'invitee receives doc'
  )

  await clock.tickAsync(9000)

  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    "invitor hasn't auto-stopped yet because the timer has been restarted"
  )
  assert(
    inviteeProject.$sync.getState().data.isSyncEnabled,
    "invitee hasn't auto-stopped yet because the timer has been restarted"
  )

  const invitorProjectOnSyncDisabled = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ data: { isSyncEnabled } }) => !isSyncEnabled
  )
  const inviteeProjectOnSyncDisabled = pEvent(
    inviteeProject.$sync,
    'sync-state',
    ({ data: { isSyncEnabled } }) => !isSyncEnabled
  )

  clock.tick(2000)

  await Promise.all([
    invitorProjectOnSyncDisabled,
    inviteeProjectOnSyncDisabled,
  ])
  assert(
    !invitorProject.$sync.getState().data.isSyncEnabled,
    'invitor has auto-stopped'
  )
  assert(
    !inviteeProject.$sync.getState().data.isSyncEnabled,
    'invitee has auto-stopped'
  )
})

test('validates auto-stop timeouts', async (t) => {
  const manager = await createManager('test', t)
  const projectId = await manager.createProject({ name: 'foo' })
  const project = await manager.getProject(projectId)

  const invalid = [-Infinity, 0, 1.23, 2 ** 31]
  for (const autostopDataSyncAfter of invalid) {
    assert.throws(() => {
      project.$sync.start({ autostopDataSyncAfter })
    })
  }

  assert(!project.$sync.getState().data.isSyncEnabled, 'sync is not enabled')
})

test('gracefully shutting down sync for all projects when backgrounded', async function (t) {
  // NOTE: Unlike other tests in this file, this test uses `node:assert` instead
  // of `t` to ease our transition away from Brittle. We can remove this comment
  // when Brittle is removed.

  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers, { discovery: false })
  t.teardown(disconnect)

  const projectGroupsAfterFirstStep = await Promise.all(
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

      await assert.rejects(
        () => inviteeProject.observation.getByDocId(observation1.docId),
        'before peers have started sync, doc does not sync'
      )

      inviteeProject.$sync.start()
      invitorProject.$sync.start()

      await waitForSync(projects, 'full')

      return { invitorProject, inviteeProject, observation1 }
    })
  )

  invitor.onBackgrounded()

  const projectGroupsAfterSecondStep = await Promise.all(
    projectGroupsAfterFirstStep.map(
      async ({ invitorProject, inviteeProject, observation1 }) => {
        assert(
          await inviteeProject.observation.getByDocId(observation1.docId),
          'invitee receives doc'
        )

        const observation2 = await invitorProject.observation.create(
          valueOf(generate('observation')[0])
        )
        const observation3 = await inviteeProject.observation.create(
          valueOf(generate('observation')[0])
        )
        await delay(1000)
        await assert.rejects(
          () => inviteeProject.observation.getByDocId(observation2.docId),
          "invitee doesn't receive second doc yet"
        )
        await assert.rejects(
          () => invitorProject.observation.getByDocId(observation3.docId),
          "invitor doesn't receive third doc yet"
        )

        return { invitorProject, inviteeProject, observation2, observation3 }
      }
    )
  )

  invitor.onForegrounded()

  await Promise.all(
    projectGroupsAfterSecondStep.map(
      async ({
        invitorProject,
        inviteeProject,
        observation2,
        observation3,
      }) => {
        await waitForSync([invitorProject, inviteeProject], 'full')

        assert(
          await inviteeProject.observation.getByDocId(observation2.docId),
          'invitee receives second doc'
        )
        assert(
          await invitorProject.observation.getByDocId(observation3.docId),
          'invitor receives third doc'
        )
      }
    )
  )
})

test('shares cores', async function (t) {
  const COUNT = 5
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const coreManagers = projects.map((p) => p[kCoreManager])

  await waitForSync(projects, 'initial')

  for (const ns of PRESYNC_NAMESPACES) {
    for (const cm of coreManagers) {
      const keyCount = getKeys(cm, ns).length
      t.is(keyCount, COUNT, 'expected number of cores')
    }
  }

  // Currently need to start syncing to share other keys - this might change if
  // we add keys based on coreOwnership records
  for (const project of projects) {
    project.$sync.start()
  }

  await waitForSync(projects, 'full')

  for (const ns of NAMESPACES) {
    for (const cm of coreManagers) {
      const keyCount = getKeys(cm, ns).length
      t.is(keyCount, COUNT, 'expected number of cores')
    }
  }
})

test('no sync capabilities === no namespaces sync apart from auth', async (t) => {
  const COUNT = 3
  const managers = await createManagers(COUNT, t)
  const [invitor, invitee, blocked] = managers
  const disconnect1 = connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({
    invitor,
    invitees: [blocked],
    projectId,
    roleId: BLOCKED_ROLE_ID,
  })
  await invite({
    invitor,
    invitees: [invitee],
    projectId,
    roleId: COORDINATOR_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, inviteeProject] = projects

  const generatedDocs = (await seedDatabases([inviteeProject])).flat()
  const configDocsCount = generatedDocs.filter(
    (doc) => doc.schemaName !== 'observation'
  ).length
  const dataDocsCount = generatedDocs.length - configDocsCount

  for (const project of projects) {
    project.$sync.start()
  }

  await waitForSync([inviteeProject, invitorProject], 'full')

  // Reaching into internals here, but only to validate the result of the test, so not fully e2e
  const [invitorState, inviteeState, blockedState] = projects.map((p) =>
    p.$sync[kSyncState].getState()
  )

  t.is(invitorState.config.localState.have, configDocsCount + COUNT) // count device info doc for each invited device
  t.is(invitorState.data.localState.have, dataDocsCount)
  t.is(blockedState.config.localState.have, 1) // just the device info doc
  t.is(blockedState.data.localState.have, 0) // no data docs synced

  for (const ns of NAMESPACES) {
    if (ns === 'auth') {
      t.is(invitorState[ns].coreCount, 3)
      t.is(inviteeState[ns].coreCount, 3)
      t.is(blockedState[ns].coreCount, 3)
    } else if (PRESYNC_NAMESPACES.includes(ns)) {
      t.is(invitorState[ns].coreCount, 3)
      t.is(inviteeState[ns].coreCount, 3)
      t.is(blockedState[ns].coreCount, 1)
    } else {
      t.is(invitorState[ns].coreCount, 2)
      t.is(inviteeState[ns].coreCount, 2)
      t.is(blockedState[ns].coreCount, 1)
    }

    // "Invitor" knows blocked peer is blocked from the start, so never connects
    // and never creates a local copy of the blocked peer cores, but "Invitee"
    // does connect initially, before it realized the peer is blocked, and
    // creates a local copy of the blocked peer's cores, but never downloads
    // data, so it considers data to be "missing" which the Invitor does not
    // register as missing.
    t.alike(
      excludeKeys(invitorState[ns].localState, ['missing']),
      excludeKeys(inviteeState[ns].localState, ['missing'])
    )
  }

  await disconnect1()

  await Promise.all(projects.map((p) => p.close()))
})

test('Sync state emitted when starting and stopping sync', async function (t) {
  const COUNT = 2
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const projectId = await invitor.createProject({ name: 'Mapeo' })

  const disconnect = connectPeers(managers, { discovery: false })

  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const stateEvents = []

  projects[0].$sync.on('sync-state', (state) => {
    const timestamp = Date.now()
    stateEvents.push({ state, timestamp })
  })

  projects[0].$sync.start()
  t.ok(stateEvents.length === 1, 'sync-state event emitted after start')

  await delay(500)

  const eventCountBeforeStop = stateEvents.length
  projects[0].$sync.stop()
  t.ok(
    stateEvents.length > eventCountBeforeStop,
    'sync-state event emitted after stop'
  )

  await disconnect()
  await Promise.all(projects.map((p) => p.close()))
})

test('Correct sync state prior to data sync', async function (t) {
  const COUNT = 6
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const projectId = await invitor.createProject({ name: 'Mapeo' })

  const disconnect1 = connectPeers(managers, { discovery: false })

  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const generated = await seedDatabases(projects, { schemas: ['observation'] })
  await waitForSync(projects, 'initial')

  const initialSyncState = await Promise.all(
    projects.map((p) => p.$sync.getState())
  )

  // Disconnect and reconnect, because currently pre-have messages about data
  // sync state are only shared on first connection
  await disconnect1()
  const disconnect2 = connectPeers(managers, { discovery: false })
  await waitForPeers(managers)

  const expected = generated.map((docs, i) => {
    return {
      initial: initialSyncState[i].initial,
      data: {
        have: docs.length,
        want: generated.filter((d) => d !== docs).flat().length,
        wanted: docs.length,
        missing: 0,
        dataToSync: true,
        isSyncEnabled: false,
      },
      connectedPeers: managers.length - 1,
    }
  })

  // Wait for initial sharing of sync state
  await delay(200)

  const syncState = await Promise.all(projects.map((p) => p.$sync.getState()))

  t.alike(syncState, expected)

  await disconnect2()
  await Promise.all(projects.map((p) => p.close()))
})

test('pre-haves are updated', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers)
  t.teardown(disconnect)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  for (const project of projects) t.teardown(() => project.close())
  const [invitorProject, inviteeProject] = projects
  await waitForSync(projects, 'initial')

  assertDataSyncStateMatches(
    t,
    invitorProject,
    { have: 0, wanted: 0, dataToSync: false },
    'Invitor project should have nothing to sync at start'
  )
  assertDataSyncStateMatches(
    t,
    inviteeProject,
    { have: 0, wanted: 0, dataToSync: false },
    'Invitee project should see nothing to sync at start'
  )

  const invitorToSyncPromise = pEvent(
    invitorProject.$sync,
    'sync-state',
    (syncState) =>
      syncStateMatches(syncState.data, {
        have: 1,
        wanted: 1,
        dataToSync: true,
      })
  )
  const inviteeToSyncPromise = pEvent(
    inviteeProject.$sync,
    'sync-state',
    (syncState) =>
      syncStateMatches(syncState.data, {
        have: 0,
        want: 1,
        dataToSync: true,
      })
  )

  await invitorProject.observation.create(valueOf(generate('observation')[0]))

  await Promise.all([invitorToSyncPromise, inviteeToSyncPromise])

  assertDataSyncStateMatches(
    t,
    inviteeProject,
    { have: 0, want: 1, dataToSync: true },
    'Invitee project should learn about something to sync'
  )
})

/**
 * @param {import('brittle').TestInstance} t
 * @param {MapeoProject} project
 * @param {Partial<SyncState>} expected
 * @param {string} message
 * @returns {void}
 */
function assertDataSyncStateMatches(t, project, expected, message) {
  const actual = project.$sync.getState().data
  t.ok(syncStateMatches(actual, expected), message)
}

/**
 * @param {SyncState} syncState
 * @param {Partial<SyncState>} expected
 * @returns {boolean}
 */
function syncStateMatches(syncState, expected) {
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actualValue = /** @type {any} */ (syncState)[key]
    if (actualValue !== expectedValue) return false
  }
  return true
}
