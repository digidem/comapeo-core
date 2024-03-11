// @ts-check
import test from 'brittle'
import TranslationApi from '../src/translation-api.js'
import { DataType } from '../src/datatype/index.js'
import { DataStore } from '../src/datastore/index.js'
import { translationTable as table } from '../src/schema/project.js'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createCoreManager } from './helpers/core-manager.js'
import { IndexWriter } from '../src/index-writer/index.js'
import RAM from 'random-access-memory'
import { hashObject } from '../src/utils.js'

test('put() and get()', async (t) => {
  const api = setup()
  const doc = {
    /** @type {'translation'} */
    schemaName: 'translation',
    schemaNameRef: 'field',
    docIdRef: '',
    fieldRef: '',
    languageCode: 'es',
    regionCode: 'ar',
    message: 'Nombre Monitor',
  }
  const expectedDocId = hashObject(doc)
  const docId = await api.put(doc)
  t.ok(docId, `putting a translation doc works`)
  t.is(
    docId,
    expectedDocId,
    'the docId is built as a hash from the doc correctly'
  )

  /* eslint-disable no-unused-vars */
  const { schemaName, ...docToGet } = doc
  t.ok(
    await api.get(docToGet),
    `using the doc without schema name to get the translation works`
  )
})

function setup() {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)

  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const cm = createCoreManager({ db })

  const indexWriter = new IndexWriter({
    tables: [table],
    sqlite,
  })

  const dataStore = new DataStore({
    namespace: 'config',
    coreManager: cm,
    storage: () => new RAM(),
    batch: async (entries) => indexWriter.batch(entries),
  })

  const dataType = new DataType({
    dataStore,
    table: table,
    db,
  })

  return new TranslationApi({
    dataType,
    table,
  })
}
