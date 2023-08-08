import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { temporaryFile } from 'tempy'
import fs from 'node:fs'
import { execSync } from 'child_process'
import { test } from 'brittle'
import RAM from 'random-access-memory'
import { DataStore } from '../lib/datastore/data-store-new.js'
import { DataType } from '../lib/datatype/data-type-new.js'
import { IndexWriter } from '../lib/index-writer.js'
import { observationTable } from '../lib/schema/project.js'
import { createCoreManager } from '../tests/helpers/core-manager.js'

/** @type {import('@mapeo/schema').ObservationValue} */
const obsValue = {
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
}

test('create and read', async (t) => {
  const observation = await createDataType(t)
  const written = await observation.create(obsValue)
  const read = await observation.getByDocId(written.docId)
  t.alike(written, read)
})

test('update', async (t) => {
  const observation = await createDataType(t)
  const written = await observation.create(obsValue)
  const writtenValue = valueOf(written)
  const updated = await observation.update(written.versionId, {
    ...writtenValue,
    lon: 0.573453,
    lat: 50.854259,
  })
  const updatedReRead = await observation.getByDocId(written.docId)
  t.alike(updated, updatedReRead)
  // Floating-point errors
  t.ok((updated.lon || 0) - 0.573453 < 0.000001)
  t.ok((updated.lat || 0) - 50.854259 < 0.000001)
})

test('getMany', async (t) => {
  const observation = await createDataType(t)
  const obs = new Array(5).fill(null).map((value, index) => {
    return {
      ...obsValue,
      tags: { index },
    }
  })
  for (const value of obs) {
    await observation.create(value)
  }
  const many = await observation.getMany()
  const manyValues = many.map((doc) => valueOf(doc))
  t.alike(manyValues, obs)
})

/**
 * @template {import('@mapeo/schema').MapeoDoc & { forks: string[] }} T
 * @param {T} doc
 * @returns {Omit<T, 'docId' | 'versionId' | 'links' | 'forks' | 'createdAt' | 'updatedAt'>}
 */
function valueOf(doc) {
  // eslint-disable-next-line no-unused-vars
  const { docId, versionId, links, forks, createdAt, updatedAt, ...rest } = doc
  return rest
}

/** @param {import('brittle').TestInstance} t */
async function createDataType(t) {
  const coreManager = createCoreManager()
  await coreManager.getWriterCore('auth').core.ready()
  const { db, sqlite } = createDb(t)
  const indexWriter = new IndexWriter({
    tables: [observationTable],
    sqlite,
  })
  const dataStore = new DataStore({
    coreManager,
    namespace: 'data',
    indexWriter,
    storage: () => new RAM(),
  })
  return new DataType({
    dataStore,
    table: observationTable,
    db,
    getPermissions: () => {},
  })
}

/** @param {import('brittle').TestInstance} t */
function createDb(t) {
  const dbPath = temporaryFile()

  execSync(
    `drizzle-kit push:sqlite --schema=lib/schema/project.js --driver=better-sqlite --url=${dbPath}`
  )

  const sqlite = new Database(dbPath)
  const db = drizzle(sqlite)

  t.teardown(() => {
    sqlite.close()
    fs.unlinkSync(dbPath)
  })

  return { db, sqlite }
}
