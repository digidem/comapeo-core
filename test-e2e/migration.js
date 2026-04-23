import { KeyManager } from '@mapeo/crypto'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import test from 'node:test'
import { temporaryDirectory } from 'tempy'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import {
  connectPeers,
  createManager,
  createOldManagerOnVersion2_0_1,
  invite,
} from './utils.js'
import {
  checkShouldMigrate,
  listProjectsFromStorage,
  migrateStorage,
  MIGRATION_REASON_ALREADY_UPGRADED,
  MIGRATION_REASON_NEEDS_UPGRADE,
  MIGRATION_REASON_NO_SPACE,
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

  const rootKey = KeyManager.generateRootKey()

  const manager = await createOldManagerOnVersion2_0_1('seed', t, {
    rootKey,
    dbFolder,
    coreStorage,
    fastify: Fastify(),
  })

  t.after(async () => {
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
      // @ts-ignore It's fine we can create these anyway
      await project.observation.create(valueOf(generate('observation')[0]))
    }

    await project.close()
  })
  await Promise.all(addObservationsPromises)

  // List projects from storage folder
  const storedProjectIds = await listProjectsFromStorage(coreStorage)
  assert.equal(storedProjectIds.length, 4, 'Should find 4 projects in storage')

  const lowStorage = 420

  const { shouldUpgrade: shouldntUpgrade, reason: noSpaceReason } =
    await checkShouldMigrate(coreStorage, lowStorage)

  assert(!shouldntUpgrade, 'Should not upgrade when lacking space')
  assert.equal(
    noSpaceReason,
    MIGRATION_REASON_NO_SPACE,
    'No space for migration'
  )

  // Thrice what a project needs
  // Threshold is 2.5x
  const availableStorage = 75_000

  const { shouldUpgrade, reason } = await checkShouldMigrate(
    coreStorage,
    availableStorage
  )

  assert.equal(reason, MIGRATION_REASON_NEEDS_UPGRADE, 'Has reason to upgrade')
  assert(shouldUpgrade, 'Upgrade should happen')

  // Migrate the storage
  const migrationResults = await migrateStorage(coreStorage)

  assert.equal(
    Object.keys(migrationResults).length,
    4,
    'Should have migration results for 4 projects'
  )

  // Verify each project was successfully analyzed
  for (const projectId of storedProjectIds) {
    const result = migrationResults[projectId]
    assert(result, `Should have migration result for project ${projectId}`)
    assert(
      result.migrated === true,
      `Project ${projectId} should have successful migration`
    )
    if (result.error) {
      console.error(`Project ${projectId} migration error:`, result.error)
    }
  }

  const { shouldUpgrade: shouldUpgradeAgain, reason: migrateAgainReason } =
    await checkShouldMigrate(coreStorage, availableStorage)

  assert(!shouldUpgradeAgain, 'No need to upgrade again')
  assert.equal(
    migrateAgainReason,
    MIGRATION_REASON_ALREADY_UPGRADED,
    'already upgraded'
  )
})
