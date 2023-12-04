import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { valueOf } from '../src/utils.js'
import { createManager, sortById, stripUndef } from './utils.js'
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

const CREATE_COUNT = 100

test('CRUD operations', async (t) => {
  const manager = createManager('device0', t)

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
        const value = valueOf(generate(schemaName)[0])
        writePromises.push(
          // @ts-ignore
          project[schemaName].create(value)
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
        valueOf(stripUndef(updated)),
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
    // t.test(
    //   'create project, create docs, close it, then re-open it and .getMany',
    //   async (st) => {
    //     // create project
    //     const projectId = await manager.createProject()
    //     const project = await manager.getProject(projectId)

    //     const newValues = new Array(5).fill(null).map(() => {
    //       return getUpdateFixture(value)
    //     })

    //     for (const value of newValues) {
    //       await st.execution(
    //         // @ts-ignore
    //         await project[schemaName].create(value),
    //         'create after `project.close()` and creating new project'
    //       )
    //     }
    //     // close it
    //     await project.close()
    //     // re open project
    //     const reOpenedProject = await manager.getProject(projectId)
    //     // console.log(await reOpenedProject[schemaName].getMany())
    //     // const newProject = await manager.getProject(newProjectId)
    //   }
    // )
  }
})
