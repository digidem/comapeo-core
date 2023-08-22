import { test } from 'brittle'
import { MapeoManager } from '../src/mapeo-manager.js'

test('MapeoManager.createProject works', async (t) => {
  const manager = new MapeoManager()

  const expectedSettings = {
    name: 'foo',
  }

  const projectId = await manager.createProject({ name: expectedSettings.name })

  t.ok(projectId)

  const project = await manager.getProject(projectId)

  const settings = await project.$getProjectSettings()

  t.is(
    settings.name,
    expectedSettings.name,
    'settings for fetched project are the same as when created'
  )
})
