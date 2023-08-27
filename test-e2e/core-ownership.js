import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'
import { kCoreOwnership } from '../src/mapeo-project.js'
import { parseVersionId } from '@mapeo/schema'

test('CoreOwnership', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const km = new KeyManager(rootKey)
  const manager = new MapeoManager({ rootKey })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const coreOwnership = project[kCoreOwnership]
  await project.ready()

  const identityKeypair = km.getIdentityKeypair()
  const deviceId = identityKeypair.publicKey.toString('hex')
  const authCoreId = await coreOwnership.getCoreId(deviceId, 'auth')
  t.is(await coreOwnership.getOwner(authCoreId), deviceId)

  const preset = await project.preset.create({
    schemaName: 'preset',
    name: 'test preset',
    geometry: ['point'],
    tags: {},
    addTags: {},
    removeTags: {},
    terms: [],
    fieldIds: [],
  })
  t.is(
    await coreOwnership.getCoreId(deviceId, 'config'),
    parseVersionId(preset.versionId).coreKey.toString('hex')
  )

  const observation = await project.observation.create({
    schemaName: 'observation',
    attachments: [],
    tags: {},
    refs: [],
    metadata: {},
  })
  t.is(
    await coreOwnership.getCoreId(deviceId, 'data'),
    parseVersionId(observation.versionId).coreKey.toString('hex')
  )
})
