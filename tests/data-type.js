// @ts-check
import test from 'brittle'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import RAM from 'random-access-memory'
import { observationTable } from '../src/schema/project.js'
import { DataType, kCreateWithDocId } from '../src/datatype/index.js'
import { IndexWriter } from '../src/index-writer/index.js'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'crypto'

const obsFixture = {
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
}

test('private createWithDocId() method', async (t) => {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: './drizzle/project' })
  const coreManager = createCoreManager()
  const indexWriter = new IndexWriter({
    tables: [observationTable],
    sqlite,
  })
  const dataStore = new DataStore({
    coreManager,
    namespace: 'data',
    batch: async (entries) => {
      return indexWriter.batch(entries)
    },
    storage: () => new RAM(),
  })
  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
  })
  const customId = randomBytes(8).toString('hex')
  // @ts-ignore - not sure why this is failing, ignoring for now
  const obs = await dataType[kCreateWithDocId](customId, obsFixture)
  t.is(obs.docId, customId)
  const read = await dataType.getByDocId(customId)
  t.is(read.docId, customId)
})
