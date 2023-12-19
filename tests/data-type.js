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
import { observationTable } from '../src/schema/project.js'
import { DataType, kCreateWithDocId } from '../src/datatype/index.js'
import { IndexWriter } from '../src/index-writer/index.js'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { randomBytes } from 'crypto'

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

async function testenv(opts) {
  const coreManager = createCoreManager(opts)
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite)
  migrate(db, {
    migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
  })

  const indexWriter = new IndexWriter({
    tables: [observationTable],
    sqlite,
  })

  const dataStore = new DataStore({
    coreManager,
    namespace: 'data',
    batch: async (entries) => indexWriter.batch(entries),
    storage: () => new RAM(),
  })
  const dataType = new DataType({
    dataStore,
    table: observationTable,
    db,
  })

  return { coreManager, dataType, dataStore }
}
