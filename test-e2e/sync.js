import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { pEvent } from 'p-event'
import { setTimeout as delay } from 'timers/promises'
import { request } from 'undici'
import FakeTimers from '@sinonjs/fake-timers'
import Fastify from 'fastify'
import { map } from 'iterpal'
import {
  connectPeers,
  createManager,
  createManagers,
  invite,
  seedDatabases,
  seedProjectBlobs,
  waitForPeers,
  waitForSync,
} from './utils.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { getKeys } from '../test/helpers/core-manager.js'
import { NAMESPACES, PRESYNC_NAMESPACES } from '../src/constants.js'
import { FastifyController } from '../src/fastify-controller.js'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import pTimeout from 'p-timeout'
import { BLOCKED_ROLE_ID, COORDINATOR_ROLE_ID } from '../src/roles.js'
import { kSyncState } from '../src/sync/sync-api.js'
import { createHash } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
/** @import { State } from '../src/sync/sync-api.js' */
/** @import { BlobId, BlobVariant } from '../src/types.js' */
/** @import { MapeoProject } from '../src/mapeo-project.js' */

const SCHEMAS_INITIAL_SYNC = ['preset', 'field']

test('Create and sync data', { timeout: 100_000 }, async (t) => {
  const COUNT = 10
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers)
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  await disconnect()

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const generatedDocs = (await seedDatabases(projects)).flat()
  const generatedSchemaNames = generatedDocs.reduce((acc, cur) => {
    acc.add(cur.schemaName)
    return acc
  }, new Set())

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
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

test('syncing blobs', async (t) => {
  const managers = await createManagers(4, t)
  const [invitor, ...invitees] = managers

  let disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  await disconnectPeers()

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject] = projects

  const blobs = await seedProjectBlobs(invitorProject, t, {
    photoCount: 50,
    audioCount: 20,
  })

  disconnectPeers = connectPeers(managers)
  await syncProjects(projects)

  for (const { blobId, hashes } of blobs) {
    for (const project of projects) {
      for (const variant of ['original', 'preview', 'thumbnail']) {
        if (blobId.type !== 'photo' && variant !== 'original') continue
        await assertHasBlob(
          project,
          // @ts-expect-error
          { ...blobId, variant },
          // @ts-expect-error
          hashes[variant]
        )
      }
    }
  }
})

test('non-archive devices only sync a subset of blobs', async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, invitee1, invitee2] = managers

  invitee1.setIsArchiveDevice(false)

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees: [invitee1, invitee2], projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, invitee1Project, invitee2Project] = projects
  const [invitorBlobs, invitee1Blobs, invitee2Blobs] = await Promise.all(
    projects.map((p) =>
      seedProjectBlobs(p, t, { photoCount: 50, audioCount: 20 })
    )
  )

  await t.test('originals do not sync to non-archive devices', async () => {
    await syncProjects(projects)

    // Invitee1 should not have the original variants
    for (const { blobId } of [invitorBlobs, invitee2Blobs].flat()) {
      await assertDoesNotHaveBlob(invitee1Project, {
        ...blobId,
        variant: 'original',
      })
    }

    // Invitor and invitee2 should have all blobs, invitee1 should only have
    // the preview and thumbnail variants
    for (const { blobId, hashes } of [
      invitorBlobs,
      invitee1Blobs,
      invitee2Blobs,
    ].flat()) {
      await assertHasBlob(
        invitorProject,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertHasBlob(
        invitee2Project,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      if (blobId.type !== 'photo') continue
      for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
        for (const project of projects) {
          await assertHasBlob(
            project,
            { ...blobId, variant },
            // @ts-expect-error
            hashes[variant]
          )
        }
      }
    }
  })

  await t.test(
    'originals sync when a device switches to be an archive device',
    async () => {
      invitee1.setIsArchiveDevice(true)
      await syncProjects(projects)

      for (const { blobId, hashes } of [
        invitorBlobs,
        invitee1Blobs,
        invitee2Blobs,
      ].flat()) {
        await assertHasBlob(
          invitee1Project,
          { ...blobId, variant: 'original' },
          hashes.original
        )
      }
    }
  )

  await t.test('device can toggle archive status while syncing', async (t) => {
    projects.map((p) => p.$sync.start())
    await waitForSync(projects, 'full')

    invitee2.setIsArchiveDevice(false)
    const newInvitorBlobs = await seedProjectBlobs(invitorProject, t, {
      photoCount: 10,
      audioCount: 5,
    })
    await waitForSync(projects, 'full')

    for (const { blobId, hashes } of newInvitorBlobs) {
      await assertHasBlob(
        invitorProject,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertHasBlob(
        invitee1Project,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertDoesNotHaveBlob(invitee2Project, {
        ...blobId,
        variant: 'original',
      })
      if (blobId.type !== 'photo') continue
      for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
        for (const project of projects) {
          await assertHasBlob(
            project,
            { ...blobId, variant },
            // @ts-expect-error
            hashes[variant]
          )
        }
      }
    }
  })
})

// This test catches a bug where when a peer does not want any blobs from a
// particular core, the sync state thinks the peer still wants all blobs, if
// that core is added via sync after the device has already set themselves as a
// non-archive device. We simulate this scenario by only writing audio blobs to
// seed the database, which do not have any previews or thumbnails, so nothing
// should sync with a non-archive device.
test('non-archive devices sync subset when nothing to downlad', async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, invitee1, invitee2] = managers

  invitee1.setIsArchiveDevice(false)

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees: [invitee1, invitee2], projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, invitee1Project, invitee2Project] = projects
  const [invitorBlobs, invitee1Blobs, invitee2Blobs] = await Promise.all(
    projects.map((p) =>
      seedProjectBlobs(p, t, { photoCount: 0, audioCount: 50 })
    )
  )

  await syncProjects(projects)

  // Invitee1 should not have the original variants
  for (const { blobId } of [invitorBlobs, invitee2Blobs].flat()) {
    await assertDoesNotHaveBlob(invitee1Project, {
      ...blobId,
      variant: 'original',
    })
  }

  // Invitor and invitee2 should have all blobs, invitee1 should only have
  // the preview and thumbnail variants
  for (const { blobId, hashes } of [
    invitorBlobs,
    invitee1Blobs,
    invitee2Blobs,
  ].flat()) {
    await assertHasBlob(
      invitorProject,
      { ...blobId, variant: 'original' },
      hashes.original
    )
    await assertHasBlob(
      invitee2Project,
      { ...blobId, variant: 'original' },
      hashes.original
    )
    if (blobId.type !== 'photo') continue
    for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
      for (const project of projects) {
        await assertHasBlob(
          project,
          { ...blobId, variant },
          // @ts-expect-error
          hashes[variant]
        )
      }
    }
  }
})

test('Can switch to non-archive device after creating or joining project', async (t) => {
  const managers = await createManagers(4, t)
  const [invitor, ...invitees] = managers

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const invitee1Blobs = await seedProjectBlobs(projects[1], t, {
    photoCount: 50,
    audioCount: 20,
  })

  await waitForSync(projects, 'initial')

  invitor.setIsArchiveDevice(false)
  invitees[1].setIsArchiveDevice(false)

  await syncProjects(projects)

  for (const { blobId, hashes } of invitee1Blobs) {
    // Non-archive devices should not have the original variants
    await assertDoesNotHaveBlob(projects[0], {
      ...blobId,
      variant: 'original',
    })
    await assertDoesNotHaveBlob(projects[2], {
      ...blobId,
      variant: 'original',
    })
    // Archive devices should have all blobs
    await assertHasBlob(
      projects[1],
      { ...blobId, variant: 'original' },
      hashes.original
    )
    await assertHasBlob(
      projects[3],
      { ...blobId, variant: 'original' },
      hashes.original
    )
  }
})

test('start and stop sync', async function (t) {
  // Checks that both peers need to start syncing for data to sync, and that
  // $sync.stop() actually stops data syncing
  const COUNT = 2
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers)
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

  await assert.rejects(
    () => waitForSync(projects, 'full', { timeout: 1_000 }),
    'wait for sync times out'
  )

  await assert.rejects(
    () => inviteeProject.observation.getByDocId(obs1.docId),
    'before both peers have started sync, doc does not sync'
  )

  invitorProject.$sync.start()

  // Use the same timeout as above, to check that it would have synced given the timeout
  await waitForSync(projects, 'full', { timeout: 1_000 })

  const obs1Synced = await inviteeProject.observation.getByDocId(obs1.docId)

  assert.deepEqual(obs1Synced, obs1, 'observation is synced')

  inviteeProject.$sync.stop()

  const obs2 = await inviteeProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'initial')

  await assert.rejects(
    () => waitForSync(projects, 'full', { timeout: 1_000 }),
    'wait for sync times out'
  )

  await assert.rejects(
    () => invitorProject.observation.getByDocId(obs2.docId),
    'after stopping sync, data does not sync'
  )

  inviteeProject.$sync.start()

  await waitForSync(projects, 'full')

  const obs2Synced = await invitorProject.observation.getByDocId(obs2.docId)

  assert.deepEqual(obs2Synced, obs2, 'observation is synced')

  await disconnect()
})

test('sync only happens if both sides are enabled', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers)
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  t.after(() => Promise.all(projects.map((project) => project.close())))
  const [invitorProject, inviteeProject] = projects

  const generatedObservations = generate('observation', { count: 3 })

  const obs1 = await invitorProject.observation.create(
    valueOf(generatedObservations[0])
  )
  const obs2 = await inviteeProject.observation.create(
    valueOf(generatedObservations[1])
  )

  await waitForSync(projects, 'initial')

  invitorProject.$sync.start()
  inviteeProject.$sync.start()
  await waitForSync(projects, 'full')

  assert(await inviteeProject.observation.getByDocId(obs1.docId))
  assert(await invitorProject.observation.getByDocId(obs2.docId))

  invitorProject.$sync.stop()
  inviteeProject.$sync.stop()

  const obs3 = await invitorProject.observation.create(
    valueOf(generatedObservations[2])
  )

  invitorProject.$sync.start()

  await assert.rejects(
    () => waitForSync(projects, 'full'),
    'wait for sync times out'
  )

  await assert.rejects(
    () => inviteeProject.observation.getByDocId(obs3.docId),
    'one side stopping sync should prevent data from syncing'
  )
})

test('auto-stop', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const invitor = createManager('invitor', t)

  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })
  t.after(() => fastifyController.stop())
  const invitee = createManager('invitee', t, { fastify })

  const managers = [invitor, invitee]

  await Promise.all([
    invitor.setDeviceInfo({ name: 'invitor', deviceType: 'mobile' }),
    invitee.setDeviceInfo({ name: 'invitee', deviceType: 'mobile' }),
    fastifyController.start(),
  ])
  t.after(() => fastifyController.stop())

  const disconnect = connectPeers(managers)
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'mapeo' })
  await invite({ invitor, invitees: [invitee], projectId })

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

  const fixturePath = new URL(
    '../test/fixtures/images/02-digidem-logo.jpg',
    import.meta.url
  ).pathname
  const blob = await invitorProject.$blobs.create(
    { original: fixturePath },
    { mimeType: 'image/jpeg' }
  )
  await waitForSync(projects, 'full')
  const blobUrl = await inviteeProject.$blobs.getUrl({
    ...blob,
    variant: 'original',
  })
  const response = await request(blobUrl, { reset: true })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(
    Buffer.from(await response.body.arrayBuffer()),
    await fs.readFile(fixturePath),
    'invitee receives blob'
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

  let invitorProjectOnSyncDisabled = pEvent(
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

  invitorProject.$sync.setAutostopDataSyncTimeout(20_000)
  assert(
    !invitorProject.$sync.getState().data.isSyncEnabled,
    'invitor is still stopped'
  )

  invitorProject.$sync.start()
  inviteeProject.$sync.start()

  const observation2 = await invitorProject.observation.create(
    valueOf(generatedObservations[1])
  )
  await waitForSync(projects, 'full')
  assert(
    await inviteeProject.observation.getByDocId(observation2.docId),
    'invitee receives doc'
  )

  await clock.tickAsync(19_000)

  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    "invitor hasn't auto-stopped"
  )

  invitorProjectOnSyncDisabled = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ data: { isSyncEnabled } }) => !isSyncEnabled
  )

  clock.tick(2_000)

  await invitorProjectOnSyncDisabled
  assert(
    !invitorProject.$sync.getState().data.isSyncEnabled,
    'invitor has auto-stopped'
  )

  invitorProject.$sync.start({ autostopDataSyncAfter: 999_999 })
  invitorProject.$sync.setAutostopDataSyncTimeout(20_000)

  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    'invitor has not yet auto-stopped'
  )

  invitorProjectOnSyncDisabled = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ data: { isSyncEnabled } }) => !isSyncEnabled
  )
  clock.tick(21_000)
  await invitorProjectOnSyncDisabled

  assert(
    !invitorProject.$sync.getState().data.isSyncEnabled,
    'invitor has auto-stopped'
  )
})

test('disabling auto-stop timeout', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers)
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, inviteeProject] = projects

  invitorProject.$sync.start({ autostopDataSyncAfter: 10_000 })
  invitorProject.$sync.setAutostopDataSyncTimeout(null)

  inviteeProject.$sync.start()

  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    "invitor hasn't auto-stopped yet"
  )

  const observation1 = await invitorProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'full')
  assert(
    await inviteeProject.observation.getByDocId(observation1.docId),
    'invitee receives doc'
  )

  await clock.tickAsync(999_999_999)
  assert(
    invitorProject.$sync.getState().data.isSyncEnabled,
    "invitor still hasn't auto-stopped"
  )
})

test('validates auto-stop timeouts', async (t) => {
  const manager = await createManager('test', t)
  const projectId = await manager.createProject({ name: 'foo' })
  const project = await manager.getProject(projectId)

  const invalid = [-Infinity, 0, 1.23, 2 ** 31, Infinity]
  for (const autostopDataSyncAfter of invalid) {
    assert.throws(() => {
      project.$sync.start({ autostopDataSyncAfter })
    })
    assert.throws(() => {
      project.$sync.setAutostopDataSyncTimeout(autostopDataSyncAfter)
    })
  }

  assert(!project.$sync.getState().data.isSyncEnabled, 'sync is not enabled')
})

test('gracefully shutting down sync for all projects when backgrounded', async function (t) {
  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers)
  t.after(disconnect)

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
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
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
      assert.equal(keyCount, COUNT, 'expected number of cores')
    }
  }

  // Currently need to start syncing to share other keys - this might change if
  // we add keys based on coreOwnership records
  for (const project of projects) {
    project.$sync.start()
  }
  const everyoneEnabledDataSyncPromise = await Promise.all(
    projects.map((project) =>
      pEvent(project.$sync, 'sync-state', (state) => state.data.isSyncEnabled)
    )
  )

  await waitForSync(projects, 'full')
  await everyoneEnabledDataSyncPromise

  for (const ns of NAMESPACES) {
    for (const cm of coreManagers) {
      const keyCount = getKeys(cm, ns).length
      assert.equal(keyCount, COUNT, 'expected number of cores')
    }
  }
})

test('no sync capabilities === no namespaces sync apart from auth', async (t) => {
  const COUNT = 3
  const managers = await createManagers(COUNT, t)
  const [invitor, invitee, blocked] = managers
  const disconnect1 = connectPeers(managers)
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

  try {
    const [invitorProject, inviteeProject] = projects

    assert.equal(
      (await invitorProject.$member.getById(blocked.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'invitor sees blocked participant as part of the project'
    )
    assert.equal(
      (await inviteeProject.$member.getById(blocked.deviceId)).role.roleId,
      BLOCKED_ROLE_ID,
      'invitee sees blocked participant as part of the project'
    )

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

    assert.equal(invitorState.config.localState.have, configDocsCount + COUNT) // count device info doc for each invited device
    assert.equal(invitorState.data.localState.have, dataDocsCount)
    assert.equal(blockedState.config.localState.have, 1) // just the device info doc
    assert.equal(blockedState.data.localState.have, 0) // no data docs synced

    for (const ns of NAMESPACES) {
      assert.equal(invitorState[ns].coreCount, 3, ns)
      assert.equal(inviteeState[ns].coreCount, 3, ns)
      assert.equal(blockedState[ns].coreCount, 3, ns)
      assert.deepEqual(
        invitorState[ns].localState,
        inviteeState[ns].localState,
        ns
      )
    }
  } finally {
    await disconnect1()

    await Promise.all(projects.map((p) => p.close()))
  }
})

test('Sync state emitted when starting and stopping sync', async function (t) {
  const COUNT = 2
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)
  t.after(() => project.close())

  /** @type {State[]} */ const statesBeforeStart = []

  /** @type {State[]} */ let states = statesBeforeStart
  project.$sync.on('sync-state', (state) => states.push(state))

  const disconnect = connectPeers(managers)
  t.after(disconnect)
  await invite({ invitor, invitees, projectId })

  /** @type {State[]} */ const statesAfterStart = []
  states = statesAfterStart
  project.$sync.start()
  assert(
    statesAfterStart.length >= 1,
    'Expected at least one event after starting'
  )
  for (const state of statesAfterStart) {
    assert(state.initial.isSyncEnabled, 'initial namespaces are enabled')
    assert(state.data.isSyncEnabled, 'data namespaces are enabled')
  }

  await delay(500)

  /** @type {State[]} */ const statesAfterStop = []
  states = statesAfterStop
  project.$sync.stop()

  for (const state of statesAfterStart) {
    assert(state.initial.isSyncEnabled, 'initial namespaces are enabled')
    assert(state.data.isSyncEnabled, 'data namespaces are enabled')
  }

  assert(
    statesAfterStop.length >= 1,
    'Expected at least one event after stopping'
  )
  for (const state of statesAfterStop) {
    assert(state.initial.isSyncEnabled, 'initial namespaces are still enabled')
    assert(!state.data.isSyncEnabled, 'data namespaces are disabled')
  }
})

test('updates sync state when peers are added', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers
  const [invitee] = invitees

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const invitorProject = await invitor.getProject(projectId)
  t.after(() => invitorProject.close())

  await invitorProject.observation.create(valueOf(generate('observation')[0]))
  assert.deepEqual(
    invitorProject.$sync.getState(),
    {
      initial: { isSyncEnabled: true },
      data: { isSyncEnabled: false },
      remoteDeviceSyncState: {},
    },
    'data sync state is correct at start'
  )

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await invite({ invitor, invitees, projectId })

  assert.deepEqual(
    invitorProject.$sync.getState(),
    {
      initial: { isSyncEnabled: true },
      data: { isSyncEnabled: false },
      remoteDeviceSyncState: {
        [invitee.deviceId]: {
          initial: { isSyncEnabled: true, want: 0, wanted: 0 },
          data: { isSyncEnabled: false, want: 1, wanted: 0 },
        },
      },
    },
    'there should be something to sync'
  )
})

test('Correct sync state prior to data sync', async function (t) {
  const COUNT = 6
  const managers = await createManagers(COUNT, t)
  const [invitor, ...invitees] = managers
  const projectId = await invitor.createProject({ name: 'Mapeo' })

  const disconnect1 = connectPeers(managers)

  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  for (const project of projects) {
    const { remoteDeviceSyncState } = project.$sync.getState()
    const otherDeviceCount = Object.keys(remoteDeviceSyncState).length
    assert.equal(otherDeviceCount, COUNT - 1)
  }

  const generated = await seedDatabases(projects, { schemas: ['observation'] })
  await waitForSync(projects, 'initial')

  // Disconnect and reconnect, because currently pre-have messages about data
  // sync state are only shared on first connection
  await disconnect1()
  const disconnect2 = connectPeers(managers)
  await waitForPeers(managers)

  const expected = managers.map((manager, index) => {
    /** @type {State['remoteDeviceSyncState']} */ const remoteDeviceSyncState =
      {}

    const myDocs = generated[index]

    for (const [otherIndex, otherManager] of managers.entries()) {
      if (manager === otherManager) continue

      const otherDocs = generated[otherIndex]
      const wanted = otherDocs.length
      const want = myDocs.length

      remoteDeviceSyncState[otherManager.deviceId] = {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want, wanted },
      }
    }

    return {
      initial: { isSyncEnabled: true },
      data: { isSyncEnabled: false },
      remoteDeviceSyncState,
    }
  })

  await Promise.all(
    projects.map((project, i) =>
      pEvent(project.$sync, 'sync-state', (syncState) =>
        isDeepStrictEqual(syncState, expected[i])
      )
    )
  )

  const syncState = projects.map((p) => p.$sync.getState())
  assert.deepEqual(syncState, expected)

  await disconnect2()
  await Promise.all(projects.map((p) => p.close()))
})

test('pre-haves are updated', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, ...invitees] = managers
  const [invitee] = invitees

  const disconnect = connectPeers(managers)
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  for (const project of projects) t.after(() => project.close())
  const [invitorProject, inviteeProject] = projects
  await waitForSync(projects, 'initial')

  assert.deepEqual(
    invitorProject.$sync.getState().remoteDeviceSyncState[invitee.deviceId]
      .data,
    {
      isSyncEnabled: false,
      want: 0,
      wanted: 0,
    },
    'Invitor project should have nothing to sync at start'
  )
  assert.deepEqual(
    inviteeProject.$sync.getState().remoteDeviceSyncState[invitor.deviceId]
      .data,
    {
      isSyncEnabled: false,
      want: 0,
      wanted: 0,
    },
    'Invitee project should have nothing to sync at start'
  )

  const invitorToSyncPromise = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) =>
      remoteDeviceSyncState[invitee.deviceId]?.data.want > 0
  )
  const inviteeToSyncPromise = pEvent(
    inviteeProject.$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) =>
      remoteDeviceSyncState[invitor.deviceId]?.data.wanted > 0
  )

  await invitorProject.observation.create(valueOf(generate('observation')[0]))

  await Promise.all([invitorToSyncPromise, inviteeToSyncPromise])

  assert.deepEqual(
    inviteeProject.$sync.getState().remoteDeviceSyncState[invitor.deviceId]
      .data,
    {
      isSyncEnabled: false,
      want: 0,
      wanted: 1,
    },
    'Invitee project should learn about something to sync'
  )
})

test('data sync state is properly updated as data sync is enabled and disabled', async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers)
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const invitorProject = await invitor.getProject(projectId)
  invitorProject.observation.create(valueOf(generate('observation')[0]))
  assert.ok(
    invitorProject.$sync.getState().initial.isSyncEnabled,
    'initial sync is enabled for local device'
  )

  await invite({ invitor, invitees, projectId })
  const inviteesProjects = await Promise.all(
    invitees.map((m) => m.getProject(projectId))
  )
  await waitForSync([invitorProject, ...inviteesProjects], 'initial')

  assert.deepEqual(
    invitorProject.$sync.getState().remoteDeviceSyncState,
    {
      [invitees[0].deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 1, wanted: 0 },
      },
      [invitees[1].deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 1, wanted: 0 },
      },
    },
    "from the invitor's perspective, remote peers want one document and data sync is disabled"
  )
  assert.deepEqual(
    inviteesProjects[0].$sync.getState().remoteDeviceSyncState,
    {
      [invitorProject.deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 0, wanted: 1 },
      },
      [invitees[1].deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 0, wanted: 0 },
      },
    },
    "from one invitee's perspective, one remote peer has a document and data sync is disabled"
  )

  invitorProject.$sync.start()

  assert.ok(
    invitorProject.$sync.getState().data.isSyncEnabled,
    'after enabled sync, data sync is enabled for local device'
  )
  assert.deepEqual(
    invitorProject.$sync.getState().remoteDeviceSyncState,
    {
      [invitees[0].deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 1, wanted: 0 },
      },
      [invitees[1].deviceId]: {
        initial: { isSyncEnabled: true, want: 0, wanted: 0 },
        data: { isSyncEnabled: false, want: 1, wanted: 0 },
      },
    },
    'data sync is still disabled for remote peers'
  )

  const inviteeAppearsEnabledPromise = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) =>
      remoteDeviceSyncState[invitees[0].deviceId]?.data.isSyncEnabled
  )
  const invitorProjectSyncedWithFirstInviteePromise = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) => {
      const remoteData = remoteDeviceSyncState[invitees[0].deviceId]?.data ?? {}
      return remoteData.want + remoteData.wanted === 0
    }
  )
  const firstInviteeProjectSyncedWithInvitorPromise = pEvent(
    inviteesProjects[0].$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) => {
      const remoteData = remoteDeviceSyncState[invitor.deviceId]?.data ?? {}
      return remoteData.want + remoteData.wanted === 0
    }
  )

  inviteesProjects[0].$sync.start()

  assert.ok(
    inviteesProjects[0].$sync.getState().data.isSyncEnabled,
    'invitee has data sync enabled after starting sync'
  )

  await inviteeAppearsEnabledPromise

  assert(
    invitorProject.$sync.getState().remoteDeviceSyncState[invitees[0].deviceId]
      ?.data.isSyncEnabled,
    'one invitee has enabled data sync'
  )
  assert(
    !invitorProject.$sync.getState().remoteDeviceSyncState[invitees[1].deviceId]
      ?.data.isSyncEnabled,
    'other invitee has not enabled data sync'
  )

  await Promise.all([
    invitorProjectSyncedWithFirstInviteePromise,
    firstInviteeProjectSyncedWithInvitorPromise,
  ])

  const inviteeAppearsDisabledPromise = pEvent(
    invitorProject.$sync,
    'sync-state',
    ({ remoteDeviceSyncState }) =>
      !remoteDeviceSyncState[invitees[0].deviceId]?.data.isSyncEnabled
  )

  inviteesProjects[0].$sync.stop()

  await inviteeAppearsDisabledPromise

  const finalRemoteDeviceSyncState =
    invitorProject.$sync.getState().remoteDeviceSyncState
  assert.deepEqual(
    finalRemoteDeviceSyncState[invitees[0].deviceId],
    {
      initial: { isSyncEnabled: true, want: 0, wanted: 0 },
      data: { isSyncEnabled: false, want: 0, wanted: 0 },
    },
    'one invitee is disabled but settled'
  )
  assert.deepEqual(
    finalRemoteDeviceSyncState[invitees[1].deviceId],
    {
      initial: { isSyncEnabled: true, want: 0, wanted: 0 },
      data: { isSyncEnabled: false, want: 1, wanted: 0 },
    },
    'other invitee is still disabled, still wants something'
  )
})

test(
  'Sync state with disconnected peer (disconnected peer wants)',
  { timeout: 100_000 },
  async (t) => {
    // 1. Connect to a peer, invite it
    // 2. Disconnect from the peer
    // 3. Connect to a new peer, invite it
    // 4. Wait for initial sync with new peer
    // 5. Sync should complete with new peer

    const managers = await createManagers(3, t)
    const [invitor, inviteeA, inviteeB] = managers
    const disconnectA = connectPeers([invitor, inviteeA])
    const projectId = await invitor.createProject({ name: 'Mapeo' })
    await invite({ invitor, invitees: [inviteeA], projectId })

    const [invitorProject, inviteeAProject] = await Promise.all(
      [invitor, inviteeA].map((m) => m.getProject(projectId))
    )

    await Promise.all(
      [invitorProject, inviteeAProject].map((p) =>
        p.$sync.waitForSync('initial')
      )
    )

    await disconnectA()

    const disconnectB = connectPeers([invitor, inviteeB])
    await invite({ invitor, invitees: [inviteeB], projectId })
    await pTimeout(invitorProject.$sync.waitForSync('initial'), {
      milliseconds: 1000,
      message: 'invitor should complete initial sync with inviteeB',
    })

    await disconnectB()
  }
)

test(
  'Sync state with disconnected peer (want data from peer)',
  { timeout: 100_000 },
  async (t) => {
    // 1. Connect to two peers, invite them
    // 2. One peer adds an observation, does not sync it
    // 3. Wait until other two peers "know" about that observation
    // 4. Disconnect peer that added observation
    // 5. Attempt to sync remaining connected peers
    // 6. Sync should complete with remaining connected peer

    const managers = await createManagers(3, t)
    const [invitor, inviteeA, inviteeB] = managers
    const disconnectA = connectPeers([invitor, inviteeA])
    const disconnectB = connectPeers([invitor, inviteeB])
    const projectId = await invitor.createProject({ name: 'Mapeo' })
    await invite({ invitor, invitees: [inviteeA, inviteeB], projectId })

    const [invitorProject, inviteeAProject, inviteeBProject] =
      await Promise.all(
        [invitor, inviteeA, inviteeB].map((m) => m.getProject(projectId))
      )

    await inviteeAProject.observation.create(
      valueOf(generate('observation')[0])
    )

    await Promise.all(
      [invitorProject, inviteeAProject].map((p) =>
        p.$sync.waitForSync('initial')
      )
    )

    // Need to wait for pre-have of inviteeA observation to be received
    await new Promise((res) => {
      invitorProject.$sync[kSyncState].on('state', function onState(state) {
        if (state.data.localState.want === 1) {
          invitorProject.$sync[kSyncState].removeListener('state', onState)
          res(void 0)
        }
      })
    })
    await disconnectA()

    invitorProject.$sync.start()
    inviteeBProject.$sync.start()

    await pTimeout(invitorProject.$sync.waitForSync('full'), {
      milliseconds: 1000,
      message: 'invitor should complete full sync with inviteeB',
    })

    await disconnectB()
  }
)

/**
 * @param {MapeoProject[]} projects
 */
async function syncProjects(projects) {
  for (const project of projects) {
    project.$sync.start()
  }
  await waitForSync(projects, 'full')
  for (const project of projects) {
    project.$sync.stop()
  }
}

/**
 * @param {MapeoProject} project
 * @param {BlobId} blobId
 * @param {Buffer} expectedHash
 * @param {string} [message]
 */
async function assertHasBlob(project, blobId, expectedHash, message) {
  const url = await project.$blobs.getUrl(blobId)
  const response = await request(url, { reset: true })
  assert.equal(response.statusCode, 200)
  const hash = createHash('sha256')
  await pipeline(response.body, hash)
  assert.equal(hash.digest('hex'), expectedHash.toString('hex'), message)
}

/**
 * @param {MapeoProject} project
 * @param {BlobId} blobId
 * @param {string} [message]
 */
async function assertDoesNotHaveBlob(project, blobId, message) {
  const url = await project.$blobs.getUrl(blobId)
  const response = await request(url, { reset: true })
  assert.equal(response.statusCode, 404, message)
}
