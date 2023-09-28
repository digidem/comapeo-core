import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'
import { kCapabilities } from '../src/mapeo-project.js'
import {
  DEFAULT_CAPABILITIES,
  CREATOR_CAPABILITIES,
  MEMBER_ROLE_ID,
  BLOCKED_ROLE_ID,
} from '../src/capabilities.js'
import { randomBytes } from 'crypto'

test('Creator capabilities and role assignment', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const manager = new MapeoManager({
    rootKey,
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
    ownCapabilities,
    DEFAULT_CAPABILITIES[BLOCKED_ROLE_ID],
    'A new device before sync is blocked'
  )
  await t.exception(async () => {
    const deviceId = randomBytes(32).toString('hex')
    await project[kCapabilities].assignRole(deviceId, MEMBER_ROLE_ID)
  }, 'Trying to assign a role without capabilities throws an error')
})
