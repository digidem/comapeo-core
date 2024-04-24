// @ts-check
import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { valueOf } from '../src/utils.js'
import {
  createManager,
  sortById,
  removeUndefinedFields,
  randomBool,
  randomDate,
  randomNum,
} from './utils.js'
import { round } from './utils.js'
import { generate } from '@mapeo/mock-data'
import { setTimeout as delay } from 'timers/promises'

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
  {
    schemaName: 'track',
    refs: [],
    tags: {},
    attachments: [],
    locations: Array.from({ length: 10 }, trackPositionFixture),
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
    case 'track':
      return {
        ...value,
        tags: {
          foo: 'bar',
        },
      }
    default:
      return { ...value }
  }
}

const CREATE_COUNT = 100

test('CRUD operations', async (t) => {
  const manager = createManager({ seed: 'device0', t })

  for (const value of fixtures) {
    const { schemaName } = value
    await t.test(`create and read ${schemaName}`, async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      /** @type {any[]} */
      const updates = []
      const writePromises = []
      project[schemaName].on('updated-docs', (docs) => updates.push(...docs))
      let i = 0
      while (i++ < CREATE_COUNT) {
        const mocked =
          // TODO: add tracks to @mapeo/mock-data
          schemaName === 'track' ? value : valueOf(generate(schemaName)[0])
        writePromises.push(
          // @ts-ignore
          project[schemaName].create(mocked)
        )
      }
      const written = await Promise.all(writePromises)
      const read = await Promise.all(
        written.map((doc) => project[schemaName].getByDocId(doc.docId))
      )
      st.alike(
        sortById(written),
        sortById(read),
        'return create() matches return of getByDocId()'
      )
      st.alike(sortById(updates), sortById(written), 'updated-docs emitted')
    })
    await t.test('update', async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      // @ts-ignore
      const written = await project[schemaName].create(value)
      const updateValue = getUpdateFixture(value)
      await delay(1) // delay to ensure updatedAt is different to createdAt
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
        valueOf(removeUndefinedFields(updated)),
        updateValue,
        'expected value is updated'
      )
      st.not(written.updatedAt, updated.updatedAt, 'updatedAt has changed')
      st.is(written.createdAt, updated.createdAt, 'createdAt does not change')
      st.is(written.createdBy, updated.createdBy, 'createdBy does not change')
    })
    await t.test('getMany', async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      const writePromises = []
      for (let i = 0; i < CREATE_COUNT; i++) {
        const mocked =
          // TODO: add tracks to @mapeo/mock-data
          schemaName === 'track' ? value : valueOf(generate(schemaName)[0])
        writePromises.push(
          // @ts-ignore
          project[schemaName].create(mocked)
        )
      }
      const written = await Promise.all(writePromises)
      const expectedWithoutDeleted = []
      const deletePromises = []
      for (const [i, doc] of written.entries()) {
        // delete every 3rd doc
        if (i % 3 === 0) {
          deletePromises.push(project[schemaName].delete(doc.docId))
        } else {
          expectedWithoutDeleted.push(doc)
        }
      }
      const deleted = await Promise.all(deletePromises)
      const expectedWithDeleted = [...expectedWithoutDeleted, ...deleted]
      const manyWithoutDeleted = await project[schemaName].getMany()
      st.alike(
        sortById(manyWithoutDeleted),
        sortById(expectedWithoutDeleted),
        'expected values returns from getMany()'
      )
      const manyWithDeleted = await project[schemaName].getMany({
        includeDeleted: true,
      })
      st.alike(
        sortById(manyWithDeleted),
        sortById(expectedWithDeleted),
        'expected values returns from getMany({ includeDeleted: true })'
      )
    })

    t.test('create, close and then create, update', async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      const values = new Array(5).fill(null).map(() => {
        return getUpdateFixture(value)
      })
      for (const value of values) {
        // @ts-ignore
        await project[schemaName].create(value)
      }
      // @ts-ignore
      const written = await project[schemaName].create(value)
      await project.close()

      await st.exception(async () => {
        const updateValue = getUpdateFixture(value)
        // @ts-ignore
        await project[schemaName].update(written.versionId, updateValue)
      }, 'should fail updating since the project is already closed')

      await st.exception(async () => {
        for (const value of values) {
          // @ts-ignore
          await project[schemaName].create(value)
        }
      }, 'should fail creating since the project is already closed')

      // @ts-ignore
      await st.exception.all(async () => {
        await project[schemaName].getMany()
      }, 'should fail getting since the project is already closed')
    })

    t.test('create, read, close, re-open, read', async (st) => {
      const projectId = await manager.createProject()

      let project = await manager.getProject(projectId)

      const values = new Array(5).fill(null).map(() => {
        return getUpdateFixture(value)
      })

      for (const value of values) {
        // @ts-ignore
        await project[schemaName].create(value)
      }

      const many1 = await project[schemaName].getMany()
      const manyValues1 = many1.map((doc) => valueOf(doc))

      // close it
      await project.close()

      // re-open project
      project = await manager.getProject(projectId)

      const many2 = await project[schemaName].getMany()
      const manyValues2 = many2.map((doc) => valueOf(doc))

      st.alike(
        removeUndefinedFields(manyValues1),
        removeUndefinedFields(manyValues2),
        'expected values returned before closing and after re-opening'
      )
    })

    await t.test(`create and delete ${schemaName}`, async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      const writePromises = []
      let i = 0
      while (i++ < CREATE_COUNT) {
        const mocked =
          // TODO: add tracks to @mapeo/mock-data
          schemaName === 'track' ? value : valueOf(generate(schemaName)[0])
        writePromises.push(
          // @ts-ignore
          project[schemaName].create(mocked)
        )
      }
      const written = await Promise.all(writePromises)
      const deleted = await Promise.all(
        written.map((doc) => project[schemaName].delete(doc.docId))
      )
      const read = await Promise.all(
        written.map((doc) => project[schemaName].getByDocId(doc.docId))
      )
      st.ok(
        deleted.every((doc) => doc.deleted),
        'all docs are deleted'
      )
      st.alike(
        sortById(deleted),
        sortById(read),
        'return create() matches return of getByDocId()'
      )
    })

    await t.test('delete forks', async (st) => {
      const projectId = await manager.createProject()
      const project = await manager.getProject(projectId)
      // @ts-ignore
      const written = await project[schemaName].create(value)
      const updateValue = getUpdateFixture(value)
      // @ts-ignore
      const updatedFork1 = await project[schemaName].update(
        written.versionId,
        updateValue
      )
      // @ts-ignore
      const updatedFork2 = await project[schemaName].update(
        written.versionId,
        updateValue
      )
      const updatedReRead = await project[schemaName].getByDocId(written.docId)
      st.alike(
        updatedFork2,
        updatedReRead,
        'return of update() matched return of getByDocId()'
      )
      st.alike(updatedReRead.forks, [updatedFork1.versionId], 'doc is forked')
      const deleted = await project[schemaName].delete(written.docId)
      st.ok(deleted.deleted, 'doc is deleted')
      st.is(deleted.forks.length, 0, 'forks are deleted')
      const deletedReRead = await project[schemaName].getByDocId(written.docId)
      st.ok(deletedReRead.deleted, 'doc is deleted')
      st.is(deletedReRead.forks.length, 0, 'forks are deleted')
    })
  }
})

function trackPositionFixture() {
  return {
    timestamp: randomDate().toISOString(),
    mocked: randomBool(),
    coords: {
      latitude: randomNum({ min: -90, max: 90, precision: 6 }),
      longitude: randomNum({ min: -180, max: 180, precision: 6 }),
      altitude: randomNum({ min: 0, max: 5000 }),
      accuracy: randomNum({ min: 0, max: 100, precision: 2 }),
      heading: randomNum({ min: 0, max: 360, precision: 6 }),
      speed: randomNum({ min: 0, max: 100, precision: 2 }),
    },
  }
}
