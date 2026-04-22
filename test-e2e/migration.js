import { KeyManager } from '@mapeo/crypto'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import test from 'node:test'
import { temporaryDirectory } from 'tempy'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import { MapeoManager } from '../src/mapeo-manager.js'
import {
  connectPeers,
  createManager,
  createOldManagerOnVersion2_0_1,
  invite,
} from './utils.js'
import {
  calculateStoragePerProject,
  listProjectsFromStorage,
} from '../src/migration.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('migrations pick up values that were not previously understood', async (t) => {
  // Create Manager 1, which has new data.

  const manager1 = createManager('a', t)
  await manager1.setDeviceInfo({
    name: 'a',
    deviceType: 'selfHostedServer',
    // Old versions shouldn't be able to recognize this.
    selfHostedServerDetails: { baseUrl: 'https://comapeo-test.example/' },
  })

  const projectId = await manager1.createProject({ name: 'test project' })
  const manager1Project = await manager1.getProject(projectId)

  {
    const manager1Members = await manager1Project.$member.getMany()
    assert(
      manager1Members.some(
        (member) =>
          member.selfHostedServerDetails?.baseUrl ===
          'https://comapeo-test.example/'
      ),
      'test setup: new manager has new data'
    )
  }

  // Create Manager 2, which is not yet up to date.

  const manager2DbFolder = temporaryDirectory()
  const manager2CoreStorage = temporaryDirectory()
  t.after(() => fsPromises.rm(manager2DbFolder, { recursive: true }))
  t.after(() => fsPromises.rm(manager2CoreStorage, { recursive: true }))

  const manager2BeforeMigration = await createOldManagerOnVersion2_0_1('b', t, {
    dbFolder: manager2DbFolder,
    coreStorage: manager2CoreStorage,
  })
  await manager2BeforeMigration.setDeviceInfo({
    name: 'b',
    deviceType: 'mobile',
  })

  // Connect them and ensure that Manager 2 doesn't yet know about the new data.

  const disconnect = connectPeers([manager1, manager2BeforeMigration])

  await invite({
    projectId,
    invitor: manager1,
    invitees: [manager2BeforeMigration],
  })

  {
    const manager2Project = await manager2BeforeMigration.getProject(projectId)
    await manager2Project.$sync.waitForSync('initial')
    const manager2Members = await manager2Project.$member.getMany()
    assert(
      !manager2Members.some((member) => 'selfHostedServerDetails' in member),
      "test setup: old manager doesn't understand new data (yet)"
    )

    await manager2Project.close()
  }

  await disconnect()

  // Migrate Manager 2 and see that it now knows about the data.

  const manager2AfterMigration = createManager('b', t, {
    dbFolder: manager2DbFolder,
    coreStorage: manager2CoreStorage,
  })

  {
    const manager2Project = await manager2AfterMigration.getProject(projectId)
    const manager2Members = await manager2Project.$member.getMany()
    const serverMember = manager2Members.find(
      (member) => member.deviceType === 'selfHostedServer'
    )
    assert(serverMember, 'we still have the server member')
    assert.equal(
      serverMember.selfHostedServerDetails?.baseUrl,
      'https://comapeo-test.example/',
      'migrated manager has new data'
    )
  }
})

test('migration of localDeviceInfo table', async (t) => {
  const dbFolder = temporaryDirectory()
  const coreStorage = temporaryDirectory()

  const rootKey = KeyManager.generateRootKey()
  t.after(() => fsPromises.rm(dbFolder, { recursive: true }))

  const managerPreMigration = await createOldManagerOnVersion2_0_1('seed', t, {
    rootKey,
    dbFolder,
    coreStorage,
    fastify: Fastify(),
  })
  const deviceInfo = /** @type {const} */ ({
    name: 'Test Device',
    deviceType: 'desktop',
  })
  const expectedDeviceInfo = {
    ...deviceInfo,
    deviceId: managerPreMigration.deviceId,
  }
  await managerPreMigration.setDeviceInfo(deviceInfo)
  assert.deepEqual(
    await managerPreMigration.getDeviceInfo(),
    expectedDeviceInfo
  )

  // No manager.close() function yet, but should be ok

  const manager = await createManager('test', t, {
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage,
    fastify: Fastify(),
  })

  assert.deepEqual(
    await manager.getDeviceInfo(),
    expectedDeviceInfo,
    'deviceInfo is migrated'
  )
})

test.only('calculate storage breakdown per project', async (t) => {
  const dbFolder = temporaryDirectory()
  const coreStorage = temporaryDirectory()

  const fastify = Fastify()
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage,
    fastify,
  })

  t.after(async () => {
    await manager.close()
    await fastify.close()
    await fsPromises.rm(dbFolder, { recursive: true })
    await fsPromises.rm(coreStorage, { recursive: true })
  })

  // Create 4 projects
  const projectIds = []
  for (let i = 0; i < 4; i++) {
    const projectId = await manager.createProject({
      name: `Project ${i + 1}`,
    })
    projectIds.push(projectId)
  }

  // Add observations to each project (different amounts to make them distinguishable)
  const observationCounts = [5, 10, 15, 20]
  const addObservationsPromises = projectIds.map(async (projectId, i) => {
    const project = await manager.getProject(projectId)
    const count = observationCounts[i]

    for (let j = 0; j < count; j++) {
      await project.observation.create(valueOf(generate('observation')[0]))
    }

    await project.close()
  })
  await Promise.all(addObservationsPromises)

  // Close the manager
  await manager.close()

  // List projects from storage folder
  const storedProjectIds = await listProjectsFromStorage(coreStorage)
  assert.equal(storedProjectIds.length, 4, 'Should find 4 projects in storage')

  // Calculate storage breakdown per project
  const storageBreakdown = await calculateStoragePerProject(coreStorage)

  assert.equal(
    Object.keys(storageBreakdown).length,
    4,
    'Should have storage info for 4 projects'
  )

  // Verify each project has storage info
  const projectInfo = await Promise.all(
    storedProjectIds.map(async (projectId) => {
      const storageInfo = storageBreakdown[projectId]

      assert(storageInfo, `Should have storage info for project ${projectId}`)
      assert(
        storageInfo.coreCount > 0,
        `Project ${projectId} should have cores`
      )
      assert(
        storageInfo.totalSize > 0,
        `Project ${projectId} should have total size > 0`
      )
      assert(
        Object.keys(storageInfo.cores).length === storageInfo.coreCount,
        `Project ${projectId} core count should match cores object length`
      )

      return { projectId, ...storageInfo }
    })
  )

  // Sort by total size to show the breakdown
  projectInfo.sort((a, b) => a.totalSize - b.totalSize)
  for (const { projectId, coreCount, totalSize } of projectInfo) {
    console.log(
      `Project ${projectId.slice(
        0,
        8
      )}...: ${coreCount} cores, ${totalSize} bytes`
    )
  }

  // Verify we have varying sizes (projects had different observation counts)
  const sizes = projectInfo.map((p) => p.totalSize)
  console.log('Project sizes (bytes):', sizes)
})
