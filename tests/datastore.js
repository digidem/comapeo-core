// @ts-check
import test from 'brittle'
import { DataStore } from '../src/datastore/index.js'
import { createCoreManager } from './helpers/core-manager.js'
import { getVersionId } from '@mapeo/schema'
import { once } from 'events'
import RAM from 'random-access-memory'

/** @type {Omit<import('@mapeo/schema').Observation, 'versionId'>} */
const obs = {
  docId: 'abc',
  links: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
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
        const versionId = getVersionId({ coreKey: key, index })
        indexedVersionIds.push(versionId)
      }
    },
    storage: () => new RAM(),
  })
  const written = await dataStore.write(obs)
  const expectedVersionId = getVersionId({ coreKey: writerCore.key, index: 0 })
  t.is(
    written.versionId,
    expectedVersionId,
    'versionId is set to expected value'
  )
  const read = await dataStore.read(written.versionId)
  t.alike(
    read,
    written,
    'data returned from write matches data returned from read'
  )
  t.alike(
    indexedVersionIds,
    [written.versionId],
    'The indexEntries function is called with all data that is added'
  )
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
    },
    storage: () => new RAM(),
  })
  dataStore.on('index-state', (state) => {
    // eslint-disable-next-line no-unused-vars
    const { entriesPerSecond, ...rest } = state
    indexStates.push(rest)
  })
  const idlePromise = once(dataStore, 'idle')
  await dataStore.write(obs)
  await idlePromise
  const expectedStates = [
    {
      current: 'idle',
      remaining: 0,
    },
    {
      current: 'indexing',
      remaining: 1,
    },
    {
      current: 'idle',
      remaining: 0,
    },
  ]
  t.alike(indexStates, expectedStates, 'expected index states emitted')
})
