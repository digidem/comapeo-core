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
  const km = new KeyManager(rootKey)
  const manager = new MapeoManager({
    rootKey,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const ownDeviceId = km.getIdentityKeypair().publicKey.toString('hex')
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const capabilities = project[kCapabilities]

  t.alike(
    await capabilities.getCapabilities(ownDeviceId),
    CREATOR_CAPABILITIES,
    'Project creator has creator capabilities'
  )
  const deviceId = randomBytes(32).toString('hex')
  await capabilities.assignRole(deviceId, MEMBER_ROLE_ID)
  t.alike(
    await capabilities.getCapabilities(deviceId),
    DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    'Can assign capabilities to device'
  )
})

test('New device without capabilities', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const km = new KeyManager(rootKey)
  const manager = new MapeoManager({
    rootKey,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })
  const ownDeviceId = km.getIdentityKeypair().publicKey.toString('hex')
  console.log('deviceId', ownDeviceId.slice(0, 7))
  const projectId = await manager.addProject({
    projectKey: randomBytes(32),
    encryptionKeys: { auth: randomBytes(32) },
  })
  const project = await manager.getProject(projectId)
  await project.ready()
  const cap = project[kCapabilities]
  t.alike(
    await cap.getCapabilities(ownDeviceId),
    DEFAULT_CAPABILITIES[BLOCKED_ROLE_ID],
    'A new device before sync is blocked'
  )
  await t.exception(async () => {
    const deviceId = randomBytes(32).toString('hex')
    await cap.assignRole(deviceId, MEMBER_ROLE_ID)
  }, 'Trying to assign a role without capabilities throws an error')
})
