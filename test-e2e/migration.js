import { fileURLToPath } from 'node:url'
import { KeyManager } from '@comapeo/crypto'
import Fastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { temporaryDirectory } from 'tempy'
import {
  connectPeers,
  createManager,
  createOldManagerOnVersion2_0_1,
  invite,
  removeOldManagerDir,
} from './utils.js'

const projectMigrationsFolder = fileURLToPath(
  new URL('../drizzle/project', import.meta.url)
)
const clientMigrationsFolder = fileURLToPath(
  new URL('../drizzle/client', import.meta.url)
)

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
  // After createManager's hook, so this manager is closed first
  t.after(() =>
    Promise.all(
      [manager2DbFolder, manager2CoreStorage].map(removeOldManagerDir)
    )
  )

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
  // After createManager's hook, so this manager is closed first
  t.after(() => Promise.all([dbFolder, coreStorage].map(removeOldManagerDir)))

  assert.deepEqual(
    await manager.getDeviceInfo(),
    expectedDeviceInfo,
    'deviceInfo is migrated'
  )
})
