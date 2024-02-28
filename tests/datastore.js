// @ts-check
import test from 'tape'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { getVersionId } from '@mapeo/schema'
import { once } from 'events'
import RAM from 'random-access-memory'
import { discoveryKey } from 'hypercore-crypto'

/** @type {Omit<import('@mapeo/schema').Observation, 'versionId'>} */
const obs = {
  docId: 'abc',
  links: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'def',
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
  deleted: false,
}

test('read and write', async (t) => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('data').core
  await writerCore.ready()
  const indexedVersionIds = []
  const dataStore = new DataStore({
    coreManager: cm,
    namespace: 'data',
    batch: async (entries) => {
      for (const { index, key } of entries) {
        const coreDiscoveryKey = discoveryKey(key)
        const versionId = getVersionId({ coreDiscoveryKey, index })
        indexedVersionIds.push(versionId)
      }
      return {}
    },
    storage: () => new RAM(),
  })
  const written = await dataStore.write(obs)
  const coreDiscoveryKey = discoveryKey(writerCore.key)
  const expectedVersionId = getVersionId({ coreDiscoveryKey, index: 0 })
  t.is(
    written.versionId,
    expectedVersionId,
    'versionId is set to expected value'
  )
  const read = await dataStore.read(written.versionId)
  t.deepEqual(
    read,
    written,
    'data returned from write matches data returned from read'
  )
  t.deepEqual(
    indexedVersionIds,
    [written.versionId],
    'The indexEntries function is called with all data that is added'
  )
})

test('writeRaw and read', async (t) => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('config').core
  await writerCore.ready()
  const dataStore = new DataStore({
    coreManager: cm,
    namespace: 'config',
    batch: async () => {
      await new Promise((res) => setTimeout(res, 10))
      return {}
    },
    storage: () => new RAM(),
  })
  const buf = Buffer.from('myblob')
  const versionId = await dataStore.writeRaw(buf)
  const expectedBuf = await dataStore.readRaw(versionId)
  t.deepEqual(buf, expectedBuf)
})

test('index events', async (t) => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('data').core
  await writerCore.ready()
  const indexStates = []
  const dataStore = new DataStore({
    coreManager: cm,
    namespace: 'data',
    batch: async () => {
      await new Promise((res) => setTimeout(res, 10))
      return {}
    },
    storage: () => new RAM(),
  })
  dataStore.indexer.on('index-state', (state) => {
    // eslint-disable-next-line no-unused-vars
    const { entriesPerSecond, ...rest } = state
    indexStates.push(rest)
  })
  const idlePromise = once(dataStore.indexer, 'idle')
  await dataStore.write(obs)
  await idlePromise
  const expectedStates = [
    {
      current: 'indexing',
      remaining: 1,
    },
    {
      current: 'idle',
      remaining: 0,
    },
  ]
  t.deepEqual(indexStates, expectedStates, 'expected index states emitted')
})
