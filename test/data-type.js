import test from 'node:test'
import assert from 'node:assert/strict'
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
import { decode, decodeBlockPrefix, parseVersionId } from '@comapeo/schema'

/** @type {import('@comapeo/schema').ObservationValue} */
const obsFixture = {
  schemaName: 'observation',
  lat: -3,
  lon: 37,
  tags: {},
  attachments: [],
  metadata: { manualLocation: false },
}

/** @type {import('@comapeo/schema').ObservationValue} */
const newObsFixture = {
  schemaName: 'observation',
  lat: -1,
  lon: 36,
  tags: {},
  attachments: [],
  metadata: { manualLocation: false },
}

test('private createWithDocId() method', async () => {
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
    reindex: false,
  })
  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
    getTranslations() {
      throw new Error('Translations should not be fetched in this test')
    },
  })
  const customId = randomBytes(8).toString('hex')
  const obs = await dataType[kCreateWithDocId](customId, obsFixture)
  assert.equal(obs.docId, customId)
  const read = await dataType.getByDocId(customId)
  assert.equal(read.docId, customId)
})

test('private createWithDocId() method throws when doc exists', async () => {
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
    reindex: false,
  })
  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
    getTranslations() {
      throw new Error('Translations should not be fetched in this test')
    },
  })
  const customId = randomBytes(8).toString('hex')
  await dataType[kCreateWithDocId](customId, obsFixture)
  await assert.rejects(
    () => dataType[kCreateWithDocId](customId, obsFixture),
    'Throws with error creating a doc with an id that already exists'
  )
})

test('getByVersionId fetches docs by their version ID', async () => {
  const { dataType } = await testenv()

  const created = await dataType.create(obsFixture)
  const fetched = await dataType.getByVersionId(created.versionId)

  assert.equal(created.docId, fetched.docId)
})

test('`originalVersionId` field', async () => {
  const { dataType, dataStore } = await testenv()

  const obs = await dataType.create(obsFixture)
  assert.equal(
    obs.versionId,
    obs.originalVersionId,
    'newly-created documents are the originals'
  )

  const actualDiscoveryKey = parseVersionId(
    obs.originalVersionId
  ).coreDiscoveryKey
  const expectedDiscoveryKey = crypto.discoveryKey(dataStore.writerCore.key)
  assert.deepEqual(
    actualDiscoveryKey,
    expectedDiscoveryKey,
    "original version ID has the author's core discovery key"
  )

  const updatedObs = await dataType.update(obs.versionId, newObsFixture)
  assert.notEqual(
    updatedObs.versionId,
    obs.originalVersionId,
    'updated documents change their version IDs...'
  )
  assert.equal(
    updatedObs.originalVersionId,
    obs.originalVersionId,
    '...but not their original version IDs'
  )

  const deletedObs = await dataType.delete(updatedObs.docId)
  assert.notEqual(
    deletedObs.versionId,
    obs.originalVersionId,
    'deleted documents change their version IDs...'
  )
  assert.equal(
    deletedObs.originalVersionId,
    obs.originalVersionId,
    '...but not their original version IDs'
  )
})

test('validity of `originalVersionId` from another peer', async () => {
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
  assert(replicatedCore, 'Replicated core should exist')
  await replicatedCore.update({ wait: true })
  await replicatedCore.download({ end: replicatedCore.length }).done()
  const replicatedObservation = await dt2.getByVersionId(obs.versionId)

  assert.equal(replicatedObservation.originalVersionId, obs.originalVersionId)

  /** @type {import('@comapeo/schema').ObservationValue} */
  const newObsFixture = {
    schemaName: 'observation',
    lat: -3,
    lon: 37,
    tags: {},
    attachments: [],
    metadata: { manualLocation: false },
  }
  const updatedDoc = await dt2.update(obs.versionId, newObsFixture)
  const updatedObservation = await dt2.getByVersionId(updatedDoc.versionId)
  assert.equal(updatedObservation.originalVersionId, obs.originalVersionId)
  await destroy()
})

test('getByDocId() throws if no document exists with that ID', async () => {
  const { dataType } = await testenv({ projectKey: randomBytes(32) })
  await assert.rejects(() => dataType.getByDocId('foo bar'), NotFoundError)
})

test('getByDocId() can return null if no document exists with that ID', async () => {
  const { dataType } = await testenv({ projectKey: randomBytes(32) })
  assert.equal(
    await dataType.getByDocId('foo bar', { mustBeFound: false }),
    null
  )
})

test('delete()', async () => {
  const projectKey = randomBytes(32)
  const { dataType } = await testenv({ projectKey })
  const doc = await dataType.create(obsFixture)
  assert.equal(doc.deleted, false, `'deleted' field is false before deletion`)
  const deletedDoc = await dataType.delete(doc.docId)
  assert.equal(
    deletedDoc.deleted,
    true,
    `'deleted' field is true after deletion`
  )
  assert.deepEqual(
    deletedDoc.links,
    [doc.versionId],
    `deleted doc links back to created doc`
  )
  const retrievedDocByDocId = await dataType.getByDocId(deletedDoc.docId)
  assert.deepEqual(
    retrievedDocByDocId,
    deletedDoc,
    `retrieving by docId returns deleted doc`
  )
})

test('translation', async () => {
  const projectKey = randomBytes(32)
  const { dataType, translationApi } = await testenv({ projectKey })
  /** @type {import('@comapeo/schema').ObservationValue} */
  const observation = {
    schemaName: 'observation',
    lat: -3,
    lon: 37,
    tags: {
      type: 'point',
    },
    attachments: [],
    metadata: { manualLocation: false },
  }

  const doc = await dataType.create(observation)
  const translation = {
    /** @type {'translation'} */
    schemaName: 'translation',
    /** @type {import('@comapeo/schema').TranslationValue['docRefType']} */
    docRefType: 'observation',
    docRef: { docId: doc.docId, versionId: doc.versionId },
    propertyRef: 'tags.type',
    languageCode: 'es',
    regionCode: 'AR',
    message: 'punto',
  }
  await translationApi.put(translation)
  translationApi.index(translation)

  assert.equal(
    translation.message,
    getProperty(
      await dataType.getByDocId(doc.docId, { lang: 'es' }),
      translation.propertyRef
    ),
    `we get a valid translated field`
  )
  assert.equal(
    translation.message,
    getProperty(
      await dataType.getByDocId(doc.docId, { lang: 'es-AR' }),
      translation.propertyRef
    ),
    `we get a valid translated field`
  )
  assert.equal(
    translation.message,
    getProperty(
      await dataType.getByDocId(doc.docId, { lang: 'es-ES' }),
      translation.propertyRef
    ),
    `passing an untranslated regionCode, still returns a translated field, since we fallback to only matching languageCode`
  )

  assert.equal(
    getProperty(observation, 'tags.type'),
    getProperty(
      await dataType.getByDocId(doc.docId, { lang: 'de' }),
      'tags.type'
    ),
    `passing an untranslated language code returns the untranslated message`
  )

  assert.equal(
    getProperty(observation, 'tags.type'),
    getProperty(await dataType.getByDocId(doc.docId), 'tags.type'),
    `not passing a a language code returns the untranslated message`
  )
})

/**
 * @param {object} [opts={}]
 * @param {Buffer} [opts.projectKey]
 */
async function testenv(opts = {}) {
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
    reindex: false,
  })

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
    reindex: false,
  })

  const translationDataType = new DataType({
    dataStore: configDataStore,
    table: translationTable,
    db,
    getTranslations: () => {
      throw new Error('Cannot get translations for translations')
    },
  })

  const translationApi = new TranslationApi({ dataType: translationDataType })

  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
    getTranslations: translationApi.get.bind(translationApi),
  })

  return { coreManager, dataType, dataStore, translationApi }
}
