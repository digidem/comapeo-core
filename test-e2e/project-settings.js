import { test } from 'brittle'
import { getVersionId } from '@mapeo/schema'
import { setupClient, createProject } from './utils.js'

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
    defaultPresets: {},
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
    defaultPresets: {},
  },
]

test('Project settings indexer only indexes project record types', async (t) => {
  /** @type {string[]} */
  const allProjectVersionIds = []

  /** @type {string[]} */
  const indexedProjectVersionIds = []

  const { clientDb, projectSettingsIndexWriter } = setupClient()

  const originalBatch = projectSettingsIndexWriter.batch

  // Hook into the batch method for testing purposes
  projectSettingsIndexWriter.batch = async (entries) => {
    for (const { index, key } of entries) {
      const versionId = getVersionId({ coreKey: key, index })
      indexedProjectVersionIds.push(versionId)
    }

    return originalBatch.call(projectSettingsIndexWriter, entries)
  }

  const project = createProject({
    clientDb,
    projectSettingsIndexWriter,
  })

  for (const value of fixtures) {
    const { schemaName } = value

    if (schemaName === 'project') {
      const written = await project.$setProjectSettings(value)
      allProjectVersionIds.push(written.versionId)
    } else {
      // @ts-expect-error - TS can't figure this out, but we're not testing types here so ok to ignore
      await project[schemaName].create(value)
    }
  }

  t.is(indexedProjectVersionIds.length, allProjectVersionIds.length)

  t.ok(
    allProjectVersionIds.every((id) => {
      return indexedProjectVersionIds.includes(id)
    })
  )
})
