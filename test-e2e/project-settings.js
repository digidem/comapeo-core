import { test } from 'brittle'
import { getVersionId } from '@mapeo/schema'
import { setupSharedResources, createProject } from './utils.js'

/** @satisfies {Array<import('@mapeo/schema').MapeoValue>} */
const fixtures = [
  {
    schemaName: 'observation',
    refs: [],
    tags: {},
    attachments: [],
    metadata: {},
  },
  {
    schemaName: 'preset',
    name: 'myPreset',
    tags: {},
    geometry: ['point'],
    addTags: {},
    removeTags: {},
    fieldIds: [],
    terms: [],
  },
  {
    schemaName: 'project',
    name: 'myProject',
  },
  {
    schemaName: 'field',
    type: 'text',
    tagKey: 'foo',
    label: 'my label',
  },
  {
    schemaName: 'project',
    name: 'myProject updated',
  },
]

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
