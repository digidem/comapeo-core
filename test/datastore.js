import test, { mock } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { getVersionId } from '@comapeo/schema'
import { once } from 'events'
import RAM from 'random-access-memory'
import { discoveryKey } from 'hypercore-crypto'
import { omit } from '../src/lib/omit.js'

/** @type {Omit<import('@comapeo/schema').Observation, 'versionId'>} */
const obs = {
  docId: 'abc',
  originalVersionId: getVersionId({
    coreDiscoveryKey: randomBytes(32),
    index: 1,
  }),
  links: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaName: 'observation',
  lat: -3,
  lon: 37,
  tags: {},
  attachments: [],
  metadata: { manualLocation: false },
  deleted: false,
}

test('read and write', async () => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('data').core
  await writerCore.ready()
  /** @type {Array<string>} */
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
    reindex: false,
  })
  const written = await dataStore.write(obs)
  const coreDiscoveryKey = discoveryKey(writerCore.key)
  const expectedVersionId = getVersionId({ coreDiscoveryKey, index: 0 })
  assert.equal(
    written.versionId,
    expectedVersionId,
    'versionId is set to expected value'
  )
  const read = await dataStore.read(written.versionId)
  assert.deepEqual(
    read,
    written,
    'data returned from write matches data returned from read'
  )
  assert.deepEqual(
    indexedVersionIds,
    [written.versionId],
    'The indexEntries function is called with all data that is added'
  )
})

test('writeRaw and read', async () => {
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
    reindex: false,
  })
  const buf = Buffer.from('myblob')
  const versionId = await dataStore.writeRaw(buf)
  const expectedBuf = await dataStore.readRaw(versionId)
  assert.deepEqual(buf, expectedBuf)
})

test('index events', async () => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('data').core
  await writerCore.ready()
  /** @type {Array<Omit<import('multi-core-indexer').IndexState, 'entriesPerSecond'>>} */
  const indexStates = []
  const dataStore = new DataStore({
    coreManager: cm,
    namespace: 'data',
    batch: async () => {
      await new Promise((res) => setTimeout(res, 10))
      return {}
    },
    storage: () => new RAM(),
    reindex: false,
  })
  dataStore.indexer.on('index-state', (state) => {
    indexStates.push(omit(state, ['entriesPerSecond']))
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
  assert.deepEqual(indexStates, expectedStates, 'expected index states emitted')
})

test('re-indexing', async (t) => {
  const cm = createCoreManager()
  const writerCore = cm.getWriterCore('data').core
  await writerCore.ready()

  /** @satisfies {ConstructorParameters<typeof DataStore>[0]} */
  const commonOptions = {
    coreManager: cm,
    namespace: 'data',
    batch: async () => ({}),
    storage: RAM.reusable(),
    reindex: false,
  }

  const dataStore1 = new DataStore({ ...commonOptions })
  const written = await dataStore1.write(obs)
  await dataStore1.close()

  const shouldNotBeCalled = mock.fn(() => Promise.resolve({}))
  const dataStore2 = new DataStore({
    ...commonOptions,
    batch: shouldNotBeCalled,
  })
  await once(dataStore2.indexer, 'idle')
  assert.equal(
    shouldNotBeCalled.mock.callCount(),
    0,
    'test setup: this data store should not re-index'
  )
  await dataStore2.close()

  /** @type {string[]} */
  const indexedVersionIds = []
  const dataStore3 = new DataStore({
    ...commonOptions,
    batch: async (entries) => {
      for (const { index, key } of entries) {
        const coreDiscoveryKey = discoveryKey(key)
        const versionId = getVersionId({ coreDiscoveryKey, index })
        indexedVersionIds.push(versionId)
      }
      return {}
    },
    reindex: true,
  })
  t.after(() => dataStore3.close())
  await once(dataStore3.indexer, 'idle')
  assert.deepEqual(indexedVersionIds, [written.versionId], 're-indexing occurs')
})
