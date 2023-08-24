import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'

test('MapeoManager.createProject works', async (t) => {
  const manager = new MapeoManager({ rootKey: KeyManager.generateRootKey() })

  const expectedSettings = {
    name: 'foo',
  }

  const projectId = await manager.createProject(expectedSettings)

  t.ok(projectId)

  const project = await manager.getProject(projectId)

  const settings = await project.$getProjectSettings()

  t.is(
    settings.name,
    expectedSettings.name,
    'settings for fetched project are the same as when created'
  )
})
