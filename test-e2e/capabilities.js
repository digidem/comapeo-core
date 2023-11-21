import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'
import { kCapabilities } from '../src/mapeo-project.js'
import {
  DEFAULT_CAPABILITIES,
  CREATOR_CAPABILITIES,
  MEMBER_ROLE_ID,
  COORDINATOR_ROLE_ID,
  NO_ROLE_CAPABILITIES,
} from '../src/capabilities.js'
import { randomBytes } from 'crypto'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('Creator capabilities and role assignment', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const manager = new MapeoManager({
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities,
    CREATOR_CAPABILITIES,
    'Project creator has creator capabilities'
  )

  const deviceId = randomBytes(32).toString('hex')
  await project[kCapabilities].assignRole(deviceId, MEMBER_ROLE_ID)

  t.alike(
    // TODO: Ideally use `await project.$member.getById(deviceId)` and check `capabilities` property
    await project[kCapabilities].getCapabilities(deviceId),
    DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    'Can assign capabilities to device'
  )
})

test('New device without capabilities', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const manager = new MapeoManager({
    projectMigrationsFolder,
    clientMigrationsFolder,
    rootKey,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const projectId = await manager.addProject({
    projectKey: randomBytes(32),
    encryptionKeys: { auth: randomBytes(32) },
  })
  const project = await manager.getProject(projectId)
  await project.ready()

  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities.sync,
    {
      auth: 'allowed',
      config: 'allowed',
      data: 'blocked',
      blobIndex: 'blocked',
      blob: 'blocked',
    },
    'A new device before sync can sync auth and config namespaces, but not other namespaces'
  )
  await t.exception(async () => {
    const deviceId = randomBytes(32).toString('hex')
    await project[kCapabilities].assignRole(deviceId, MEMBER_ROLE_ID)
  }, 'Trying to assign a role without capabilities throws an error')
})

test('getMany() - on invitor device', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const km = new KeyManager(rootKey)
  const creatorDeviceId = km.getIdentityKeypair().publicKey.toString('hex')
  const manager = new MapeoManager({
    rootKey,
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities,
    CREATOR_CAPABILITIES,
    'Project creator has creator capabilities'
  )

  const deviceId1 = randomBytes(32).toString('hex')
  const deviceId2 = randomBytes(32).toString('hex')
  await project[kCapabilities].assignRole(deviceId1, MEMBER_ROLE_ID)
  await project[kCapabilities].assignRole(deviceId2, COORDINATOR_ROLE_ID)

  const expected = {
    [deviceId1]: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    [deviceId2]: DEFAULT_CAPABILITIES[COORDINATOR_ROLE_ID],
    [creatorDeviceId]: CREATOR_CAPABILITIES,
  }

  t.alike(
    await project[kCapabilities].getAll(),
    expected,
    'expected capabilities'
  )
})

test('getMany() - on newly invited device before sync', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const km = new KeyManager(rootKey)
  const deviceId = km.getIdentityKeypair().publicKey.toString('hex')
  const manager = new MapeoManager({
    projectMigrationsFolder,
    clientMigrationsFolder,
    rootKey,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const projectId = await manager.addProject({
    projectKey: randomBytes(32),
    encryptionKeys: { auth: randomBytes(32) },
  })
  const project = await manager.getProject(projectId)
  await project.ready()

  const expected = {
    [deviceId]: NO_ROLE_CAPABILITIES,
  }

  t.alike(
    await project[kCapabilities].getAll(),
    expected,
    'expected capabilities'
  )
})
