import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyManager } from '@mapeo/crypto'
import { generate } from '@mapeo/mock-data'
import { parseVersionId, valueOf } from '@comapeo/schema'
import { discoveryKey } from 'hypercore-crypto'

import { kCoreOwnership } from '../src/mapeo-project.js'
import { createManager } from './utils.js'

test('CoreOwnership', async (t) => {
  const rootKey = KeyManager.generateRootKey()
  const km = new KeyManager(rootKey)
  const manager = createManager('test', t, {
    rootKey,
  })

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const coreOwnership = project[kCoreOwnership]

  const identityKeypair = km.getIdentityKeypair()
  const deviceId = identityKeypair.publicKey.toString('hex')
  const authCoreId = await coreOwnership.getCoreId(deviceId, 'auth')
  assert.equal(await coreOwnership.getOwner(authCoreId), deviceId)

  const preset = await project.preset.create(valueOf(generate('preset')[0]))
  assert.equal(
    discoveryId(await coreOwnership.getCoreId(deviceId, 'config')),
    parseVersionId(preset.versionId).coreDiscoveryKey.toString('hex')
  )

  const observation = await project.observation.create(
    valueOf(generate('observation')[0])
  )
  assert.equal(
    discoveryId(await coreOwnership.getCoreId(deviceId, 'data')),
    parseVersionId(observation.versionId).coreDiscoveryKey.toString('hex')
  )
})

/** @param {string} id */
function discoveryId(id) {
  return discoveryKey(Buffer.from(id, 'hex')).toString('hex')
}
