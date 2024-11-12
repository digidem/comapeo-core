import { KeyManager } from '@mapeo/crypto'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import test from 'node:test'
import RAM from 'random-access-memory'
import { temporaryDirectory } from 'tempy'
import { MapeoManager } from '../src/mapeo-manager.js'
import {
  connectPeers,
  createManager,
  createOldManagerOnVersion2_0_1,
  invite,
} from './utils.js'

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

  const manager2BeforeMigration = await createOldManagerOnVersion2_0_1('b', {
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
  const rootKey = KeyManager.generateRootKey()
  t.after(() => fsPromises.rm(dbFolder, { recursive: true }))

  const managerPreMigration = await createOldManagerOnVersion2_0_1('seed', {
    rootKey,
    dbFolder,
    coreStorage: () => new RAM(),
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

  // No manager.close() function on old versions, but should be okay

  const manager = new MapeoManager({
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder,
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

  assert.deepEqual(
    await manager.getDeviceInfo(),
    expectedDeviceInfo,
    'deviceInfo is migrated'
  )
})
