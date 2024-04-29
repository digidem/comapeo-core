// @ts-check
import test from 'brittle'
import { DataStore } from '../src/datastore/index.js'
import {
  createCoreManager,
  waitForCores,
  replicate,
} from './helpers/core-manager.js'
import RAM from 'random-access-memory'
import crypto from 'hypercore-crypto'
import { observationTable, translationTable } from '../src/schema/project.js'
import { DataType, kCreateWithDocId } from '../src/datatype/index.js'
import { IndexWriter } from '../src/index-writer/index.js'
import { NotFoundError } from '../src/errors.js'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'crypto'
import TranslationApi from '../src/translation-api.js'
import { getProperty } from 'dot-prop'
import { decode, decodeBlockPrefix } from '@mapeo/schema'
import { assert } from '../src/utils.js'

/** @type {import('@mapeo/schema').ObservationValue} */
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
  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

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
  const obs = await dataType[kCreateWithDocId](customId, obsFixture)
  t.is(obs.docId, customId)
  const read = await dataType.getByDocId(customId)
  t.is(read.docId, customId)
})

test('private createWithDocId() method throws when doc exists', async (t) => {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

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
  await dataType[kCreateWithDocId](customId, obsFixture)
  await t.exception(
    () => dataType[kCreateWithDocId](customId, obsFixture),
    'Throws with error creating a doc with an id that already exists'
  )
})

test('test validity of `createdBy` field', async (t) => {
  const projectKey = randomBytes(32)
  const { dataType: dt1, dataStore: ds1 } = await testenv({ projectKey })

  const customId = randomBytes(8).toString('hex')
  const obs = await dt1[kCreateWithDocId](customId, obsFixture)
  const createdBy = crypto.discoveryKey(ds1.writerCore.key).toString('hex')

  t.is(
    obs.createdBy,
    createdBy,
    'createdBy should be generated from the DataStore writerCore discoveryKey'
  )
})

test('test validity of `createdBy` field from another peer', async (t) => {
  const projectKey = randomBytes(32)
  const {
    coreManager: cm1,
    dataType: dt1,
    dataStore: ds1,
  } = await testenv({ projectKey })
  const { coreManager: cm2, dataType: dt2 } = await testenv({ projectKey })

  const obs = await dt1.create(obsFixture)
  const driveId = ds1.writerCore.key
  const { destroy } = replicate(cm1, cm2)
  await waitForCores(cm2, [driveId])
  const replicatedCore = cm2.getCoreByKey(driveId)
  await replicatedCore.update({ wait: true })
  await replicatedCore.download({ end: replicatedCore.length }).done()
  const replicatedObservation = await dt2.getByVersionId(obs.versionId)

  const createdBy = crypto.discoveryKey(ds1.writerCore.key).toString('hex')
  t.is(replicatedObservation.createdBy, createdBy)

  /** @type {import('@mapeo/schema').ObservationValue} */
  const newObsFixture = {
    schemaName: 'observation',
    refs: [{ id: randomBytes(32).toString('hex') }],
    tags: {},
    attachments: [],
    metadata: {},
  }
  const updatedDoc = await dt2.update(obs.versionId, newObsFixture)
  const updatedObservation = await dt2.getByVersionId(updatedDoc.versionId)
  t.is(updatedObservation.createdBy, createdBy)
  await destroy()
})

test('getByDocId() throws if no document exists with that ID', async (t) => {
  const { dataType } = await testenv({ projectKey: randomBytes(32) })
  await t.exception(() => dataType.getByDocId('foo bar'), NotFoundError)
})

test('delete()', async (t) => {
  const projectKey = randomBytes(32)
  const { dataType } = await testenv({ projectKey })
  const doc = await dataType.create(obsFixture)
  t.is(doc.deleted, false, `'deleted' field is false before deletion`)
  const deletedDoc = await dataType.delete(doc.docId)
  t.is(deletedDoc.deleted, true, `'deleted' field is true after deletion`)
  t.alike(
    deletedDoc.links,
    [doc.versionId],
    `deleted doc links back to created doc`
  )
  const retrievedDocByDocId = await dataType.getByDocId(deletedDoc.docId)
  t.alike(
    retrievedDocByDocId,
    deletedDoc,
    `retrieving by docId returns deleted doc`
  )
})

test('translation', async (t) => {
  const projectKey = randomBytes(32)
  const { dataType, translationApi } = await testenv({ projectKey })
  /** @type {import('@mapeo/schema').ObservationValue} */
  const observation = {
    schemaName: 'observation',
    refs: [],
    tags: {
      type: 'point',
    },
    attachments: [],
    metadata: {},
  }

  const doc = await dataType.create(observation)
  const translation = {
    /** @type {'translation'} */
    schemaName: 'translation',
    schemaNameRef: 'observation',
    docIdRef: doc.docId,
    fieldRef: 'tags.type',
    languageCode: 'es',
    regionCode: 'AR',
    message: 'punto',
  }
  await translationApi.put(translation)
  translationApi.index(translation)

  const translatedDoc = await dataType.getByDocId(doc.docId, { lang: 'es' })
  t.is(
    translation.message,
    getProperty(translatedDoc, translation.fieldRef),
    `we get a valid translated field`
  )
})

/**
 * @param {object} opts
 * @param {Buffer} [opts.projectKey]
 */
async function testenv(opts) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const coreManager = createCoreManager({ ...opts, db })

  const indexWriter = new IndexWriter({
    tables: [observationTable, translationTable],
    sqlite,
  })

  const dataStore = new DataStore({
    coreManager,
    namespace: 'data',
    batch: async (entries) => indexWriter.batch(entries),
    storage: () => new RAM(),
  })
  /** @type {TranslationApi} */
  let translationApi

  const configDataStore = new DataStore({
    coreManager,
    namespace: 'config',
    batch: async (entries) => {
      /** @type {import('multi-core-indexer').Entry[]} */
      const entriesToIndex = []
      for (const entry of entries) {
        const { schemaName } = decodeBlockPrefix(entry.block)
        try {
          if (schemaName === 'translation') {
            const doc = decode(entry.block, {
              coreDiscoveryKey: entry.key,
              index: entry.index,
            })
            assert(
              doc.schemaName === 'translation',
              'expected a translation doc'
            )
            translationApi.index(doc)
          }
          entriesToIndex.push(entry)
        } catch {
          // Ignore errors thrown by values that can't be decoded for now
        }
      }
      const indexed = await indexWriter.batch(entriesToIndex)
      return indexed
    },
    storage: () => new RAM(),
  })

  const translationDataType = new DataType({
    dataStore: configDataStore,
    table: translationTable,
    db,
    translation: translationApi,
  })

  translationApi = new TranslationApi({
    dataType: translationDataType,
    table: translationTable,
  })

  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
    translation: translationApi,
  })

  return { coreManager, dataType, dataStore, translationApi }
}
