import { test } from 'brittle'
import { setupSharedResources, createProject } from './utils.js'

test('Project settings create, read, and update operations', async (t) => {
  const shared = setupSharedResources()

  const project = createProject({
    sharedDb: shared.db,
    sharedIndexWriter: shared.indexWriter,
  })

  t.alike(
    await project.$getProjectSettings(),
    {},
    'no settings when project initially created'
  )

  const expectedSettings = {
    name: 'updated',
  }

  const updatedSettings = await project.$setProjectSettings(expectedSettings)

  t.is(updatedSettings.name, expectedSettings.name, 'updatable fields change')

  const settings = await project.$getProjectSettings()

  t.alike(
    updatedSettings,
    settings,
    'retrieved settings are equivalent to most recently updated'
  )
})
