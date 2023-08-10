import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoProject } from '../src/mapeo-project.js'

/** @type {import('@mapeo/schema').ObservationValue} */
const obsValue = {
  schemaName: 'observation',
  refs: [],
  tags: {},
  attachments: [],
  metadata: {},
}

test('create and read', async (t) => {
  const project = await createProject()
  const written = await project.observation.create(obsValue)
  const read = await project.observation.getByDocId(written.docId)
  t.alike(written, read)
})

test('update', async (t) => {
  const project = await createProject()
  const written = await project.observation.create(obsValue)
  const writtenValue = valueOf(written)
  const updated = await project.observation.update(written.versionId, {
    ...writtenValue,
    lon: 0.573453,
    lat: 50.854259,
  })
  const updatedReRead = await project.observation.getByDocId(written.docId)
  t.alike(updated, updatedReRead)
  // Floating-point errors
  t.ok((updated.lon || 0) - 0.573453 < 0.000001)
  t.ok((updated.lat || 0) - 50.854259 < 0.000001)
  t.not(written.updatedAt, updated.updatedAt, 'updatedAt has changed')
  t.is(written.createdAt, updated.createdAt, 'createdAt does not change')
})

test('getMany', async (t) => {
  const project = await createProject()
  const obs = new Array(5).fill(null).map((value, index) => {
    return {
      ...obsValue,
      tags: { index },
    }
  })
  for (const value of obs) {
    await project.observation.create(value)
  }
  const many = await project.observation.getMany()
  const manyValues = many.map((doc) => valueOf(doc))
  t.alike(stripUndef(manyValues), obs)
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
  return new MapeoProject({
    keyManager,
    projectKey,
  })
}

/**
 * Remove undefined properties from an object, to allow deep comparison
 * @param {object} obj
 */
function stripUndef(obj) {
  return JSON.parse(JSON.stringify(obj))
}
