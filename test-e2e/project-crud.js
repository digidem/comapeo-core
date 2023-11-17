import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { valueOf } from '../src/utils.js'
import { MapeoManager } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'
import { stripUndef } from './utils-new.js'
import { round } from './utils-new.js'

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
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  for (const value of fixtures) {
    const { schemaName } = value
    t.test(`create and read ${schemaName}`, async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      // @ts-ignore - TS can't figure this out, but we're not testing types here so ok to ignore
      const written = await project[schemaName].create(value)
      const read = await project[schemaName].getByDocId(written.docId)
      st.alike(valueOf(stripUndef(written)), value, 'expected value is written')
      st.alike(written, read, 'return create() matches return of getByDocId()')
    })
    t.test('update', async (st) => {
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
      st.alike(
        updated,
        updatedReRead,
        'return of update() matched return of getByDocId()'
      )
      st.alike(
        valueOf(stripUndef(updated)),
        updateValue,
        'expected value is updated'
      )
      st.not(written.updatedAt, updated.updatedAt, 'updatedAt has changed')
      st.is(written.createdAt, updated.createdAt, 'createdAt does not change')
      st.is(written.createdBy, updated.createdBy, 'createdBy does not change')
    })
    t.test('getMany', async (st) => {
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
      st.alike(
        stripUndef(manyValues),
        values,
        'expected values returns from getMany()'
      )
    })
  }
})
