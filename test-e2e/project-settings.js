import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { getVersionId } from '@mapeo/schema'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { IndexWriter } from '../src/index-writer/index.js'
import { MapeoProject } from '../src/mapeo-project.js'
import { projectTable } from '../src/schema/client.js'

/** @typedef {import('../src/index-writer/index.js').IndexWriter<import('../src/datatype/index.js').MapeoDocTablesMap['project']>} ProjectSettingsIndexWriter */

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

    return originalBatch.bind(projectSettingsIndexWriter, entries)()
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

function setupClient() {
  const sqlite = new Database(':memory:')
  const clientDb = drizzle(sqlite)
  migrate(drizzle(sqlite), { migrationsFolder: './drizzle/client' })

  const projectSettingsIndexWriter = new IndexWriter({
    tables: [projectTable],
    sqlite,
  })

  return { clientDb, projectSettingsIndexWriter }
}

/**
 * @param {Object} opts
 * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.clientDb
 * @param {ProjectSettingsIndexWriter} opts.projectSettingsIndexWriter
 * @param {Buffer} [opts.rootKey]
 * @param {Buffer} [opts.projectKey]
 */
function createProject({
  clientDb,
  projectSettingsIndexWriter,
  rootKey = randomBytes(16),
  projectKey = randomBytes(32),
}) {
  return new MapeoProject({
    keyManager: new KeyManager(rootKey),
    projectKey,
    projectSettingsConfig: {
      db: clientDb,
      indexWriter: projectSettingsIndexWriter,
    },
  })
}
