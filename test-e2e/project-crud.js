import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'

import { MapeoProject } from '../src/mapeo-project.js'
import { createBlobServer } from '../src/blob-server/index.js'
import { createBlobStore } from '../tests/helpers/blob-store.js'
import { valueOf } from '../src/utils.js'
import { MapeoManager } from '../src/mapeo-manager.js'

/** @satisfies {Array<import('@mapeo/schema').MapeoValue>} */
const fixtures = [
  {
    schemaName: 'observation',
    refs: [],
    tags: {},
    attachments: [],
    metadata: {},
  },
  {
    schemaName: 'preset',
    name: 'myPreset',
    tags: {},
    geometry: ['point'],
    addTags: {},
    removeTags: {},
    fieldIds: [],
    terms: [],
  },
  {
    schemaName: 'field',
    type: 'text',
    tagKey: 'foo',
    label: 'my label',
  },
]

/**
 * Add some random data to each fixture to test updates
 *
 * @template {import('@mapeo/schema').MapeoValue} T
 * @param {T} value
 * @returns {T}
 */
function getUpdateFixture(value) {
  switch (value.schemaName) {
    case 'observation':
      return {
        ...value,
        lon: round(Math.random() * 180, 6),
        lat: round(Math.random() * 90, 6),
      }
    case 'preset':
      return {
        ...value,
        fieldIds: [randomBytes(32).toString('hex')],
      }
    case 'field':
      return {
        ...value,
        label: randomBytes(10).toString('hex'),
      }
    default:
      return { ...value }
  }
}

test('CRUD operations', async (t) => {
  const manager = new MapeoManager({ rootKey: KeyManager.generateRootKey() })
  for (const value of fixtures) {
    const { schemaName } = value
    t.test(`create and read ${schemaName}`, async (t) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      // @ts-ignore - TS can't figure this out, but we're not testing types here so ok to ignore
      const written = await project[schemaName].create(value)
      const read = await project[schemaName].getByDocId(written.docId)
      t.alike(valueOf(stripUndef(written)), value, 'expected value is written')
      t.alike(written, read, 'return create() matches return of getByDocId()')
    })
    t.test('update', async (t) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      // @ts-ignore
      const written = await project[schemaName].create(value)
      const updateValue = getUpdateFixture(value)
      // @ts-ignore
      const updated = await project[schemaName].update(
        written.versionId,
        updateValue
      )
      const updatedReRead = await project[schemaName].getByDocId(written.docId)
      t.alike(
        updated,
        updatedReRead,
        'return of update() matched return of getByDocId()'
      )
      t.alike(
        valueOf(stripUndef(updated)),
        updateValue,
        'expected value is updated'
      )
      t.not(written.updatedAt, updated.updatedAt, 'updatedAt has changed')
      t.is(written.createdAt, updated.createdAt, 'createdAt does not change')
    })
    t.test('getMany', async (t) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      const values = new Array(5).fill(null).map(() => {
        return getUpdateFixture(value)
      })
      for (const value of values) {
        // @ts-ignore
        await project[schemaName].create(value)
      }
      const many = await project[schemaName].getMany()
      const manyValues = many.map((doc) => valueOf(doc))
      t.alike(
        stripUndef(manyValues),
        values,
        'expected values returns from getMany()'
      )
    })
  }
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

function createProject({
  rootKey = randomBytes(16),
  projectKey = randomBytes(32),
} = {}) {
  const keyManager = new KeyManager(rootKey)
  const { blobStore } = createBlobStore()
  const blobServer = createBlobServer({
    blobStore,
    logger: true,
    prefix: '/',
    projectId: projectKey.toString('hex'),
  })

  return new MapeoProject({
    keyManager,
    projectKey,
    blobServer,
  })
}

/**
 * Remove undefined properties from an object, to allow deep comparison
 * @param {object} obj
 */
function stripUndef(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 *
 * @param {number} value
 * @param {number} decimalPlaces
 */
function round(value, decimalPlaces) {
  return Math.round(value * 10 ** decimalPlaces) / 10 ** decimalPlaces
}
