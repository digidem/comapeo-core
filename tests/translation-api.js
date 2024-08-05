import test from 'node:test'
import assert from 'node:assert/strict'
import TranslationApi, {
  ktranslatedLanguageCodeToSchemaNames,
} from '../src/translation-api.js'
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
import { randomBytes } from 'node:crypto'

test('translation api - put() and get()', async () => {
  const api = setup()

  const doc = {
    /** @type {'translation'} */
    schemaName: 'translation',
    /** @type {import('@mapeo/schema').TranslationValue['docRefType']} */
    docRefType: 'field',
    docRef: {
      docId: randomBytes(32).toString('hex'),
      versionId: `${randomBytes(32).toString('hex')}/0`,
    },
    propertyRef: 'Monitor Name',
    languageCode: 'es',
    regionCode: 'ar',
    message: 'Nombre Monitor',
  }

  let mapEntriesLength = [
    ...api[ktranslatedLanguageCodeToSchemaNames].entries(),
  ].length

  assert.equal(
    mapEntriesLength,
    0,
    'the map we use to caching translations is empty before calling put'
  )

  /* eslint-disable no-unused-vars */
  const { message, ...identifiers } = doc
  const expectedDocId = hashObject(identifiers)
  const { docId } = await api.put(doc)
  api.index(doc)

  assert(docId, 'putting a translation doc works')
  assert.equal(
    docId,
    expectedDocId,
    'the docId is built as a hash from the doc correctly'
  )

  mapEntriesLength = [...api[ktranslatedLanguageCodeToSchemaNames].entries()]
    .length

  assert.equal(
    mapEntriesLength,
    1,
    'after calling api.index(), the map now has some elements in it'
  )
  assert(
    api[ktranslatedLanguageCodeToSchemaNames].get('es')?.has('field'),
    `we've effectively have fields in spanish`
  )

  /* eslint-disable no-unused-vars */
  const { schemaName, message: msg, ...docToGet } = doc

  assert.equal(
    (await api.get(docToGet)).length,
    1,
    `using the doc without schema name to get the translation works`
  )

  const newDoc = {
    /** @type {'translation'} */
    schemaName: 'translation',
    /** @type {import('@mapeo/schema').TranslationValue['docRefType']} */
    docRefType: 'field',
    docRef: {
      docId: randomBytes(32).toString('hex'),
      versionId: `${randomBytes(32).toString('hex')}/0`,
    },
    propertyRef: 'Historic Place Name',
    languageCode: 'es',
    regionCode: 'ar',
    message: 'Nombre Lugar Histórico',
  }

  await api.put(newDoc)

  assert.equal(
    (
      await api.get({
        docRefType: 'field',
        docRef: {
          docId: randomBytes(32).toString('hex'),
          versionId: `${randomBytes(32).toString('hex')}/0`,
        },
        languageCode: 'es',
      })
    ).length,
    2,
    `we have two field translations for spanish in the db`
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
    table,
    db,
    getTranslations() {
      throw new Error('Cannot get translations from translations')
    },
  })

  return new TranslationApi({
    dataType,
    table,
  })
}
