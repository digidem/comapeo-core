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
      const written = await project.$setProjectSettings(
        value,
        allProjectVersionIds[allProjectVersionIds.length - 1]
      )
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

test('Project settings indexer works across multiple projects', async (t) => {
  /** @type {string[]} */
  const projectVersionIds1 = []
  /** @type {string[]} */
  const projectVersionIds2 = []

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

  const project1 = createProject({
    clientDb,
    projectSettingsIndexWriter,
  })

  const project2 = createProject({
    clientDb,
    projectSettingsIndexWriter,
  })

  for (const value of fixtures) {
    const { schemaName } = value

    if (schemaName === 'project') {
      const written1 = await project1.$setProjectSettings(
        value,
        projectVersionIds1[projectVersionIds1.length - 1]
      )
      const written2 = await project2.$setProjectSettings(
        value,
        projectVersionIds2[projectVersionIds2.length - 1]
      )

      projectVersionIds1.push(written1.versionId)
      projectVersionIds2.push(written2.versionId)
    } else {
      // @ts-expect-error - TS can't figure this out, but we're not testing types here so ok to ignore
      await project1[schemaName].create(value)
      // @ts-expect-error
      await project2[schemaName].create(value)
    }
  }

  t.is(
    indexedProjectVersionIds.length,
    projectVersionIds1.length + projectVersionIds2.length
  )

  t.ok(
    [...projectVersionIds1, ...projectVersionIds2].every((id) => {
      return indexedProjectVersionIds.includes(id)
    })
  )
})

test('Project settings create, read, and update operations', async (t) => {
  const { projectSettingsIndexWriter, clientDb } = setupClient()

  const project = createProject({
    clientDb,
    projectSettingsIndexWriter,
  })

  const initialSettings = await project.$setProjectSettings({
    name: 'initial',
    defaultPresets: {},
  })

  const expectedSettings = {
    name: 'updated',
    defaultPresets: {},
  }

  const updatedSettings = await project.$setProjectSettings(
    expectedSettings,
    initialSettings.versionId
  )

  t.not(
    initialSettings.updatedAt,
    updatedSettings.updatedAt,
    'updatedAt has changed'
  )

  t.is(
    initialSettings.createdAt,
    updatedSettings.createdAt,
    'createdAt does not change'
  )

  t.is(updatedSettings.name, expectedSettings.name, 'updatable fields change')

  const settings = await project.$getProjectSettings()

  t.alike(
    updatedSettings,
    settings,
    'retrieved settings are equivalent to most recently updated'
  )
})
