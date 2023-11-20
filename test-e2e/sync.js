import { test } from 'brittle'
import {
  connectPeers,
  createManagers,
  invite,
  seedDatabases,
  sortById,
  waitForSync,
} from './utils-new.js'
import { kCoreManager } from '../src/mapeo-project.js'
import { getKeys } from '../tests/helpers/core-manager.js'
import { NAMESPACES } from '../src/core-manager/index.js'
import { PRESYNC_NAMESPACES } from '../src/sync/peer-sync-controller.js'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '../src/utils.js'
import pTimeout from 'p-timeout'

const SCHEMAS_INITIAL_SYNC = ['preset', 'field']

test('Create and sync data', async function (t) {
  const COUNT = 5
  const managers = await createManagers(COUNT)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject()
  await invite({ invitor, invitees, projectId })
  await disconnect()

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const generatedDocs = (await seedDatabases(projects)).flat()
  t.pass(`Generated ${generatedDocs.length} values`)
  const generatedSchemaNames = generatedDocs.reduce((acc, cur) => {
    acc.add(cur.schemaName)
    return acc
  }, new Set())

  connectPeers(managers, { discovery: false })
  await waitForSync(projects, 'initial')

  for (const schemaName of generatedSchemaNames) {
    for (const project of projects) {
      const deviceId = project.deviceId.slice(0, 7)
      // @ts-ignore - to complex to narrow `schemaName` to valid values
      const docs = await project[schemaName].getMany()
      const expected = generatedDocs.filter((v) => v.schemaName === schemaName)
      if (SCHEMAS_INITIAL_SYNC.includes(schemaName)) {
        t.alike(
          sortById(docs),
          sortById(expected),
          `All ${schemaName} docs synced to ${deviceId}`
        )
      } else {
        t.not(
          docs.length,
          expected.length,
          `Not all ${schemaName} docs synced to ${deviceId}`
        )
      }
    }
  }

  for (const project of projects) {
    project.$sync.start()
  }

  await waitForSync(projects, 'full')

  for (const schemaName of generatedSchemaNames) {
    for (const project of projects) {
      const deviceId = project.deviceId.slice(0, 7)
      // @ts-ignore - to complex to narrow `schemaName` to valid values
      const docs = await project[schemaName].getMany()
      const expected = generatedDocs.filter((v) => v.schemaName === schemaName)
      t.alike(
        sortById(docs),
        sortById(expected),
        `All ${schemaName} docs synced to ${deviceId}`
      )
    }
  }
})

test('start and stop sync', async function (t) {
  // Checks that both peers need to start syncing for data to sync, and that
  // $sync.stop() actually stops data syncing
  const COUNT = 2
  const managers = await createManagers(COUNT)
  const [invitor, ...invitees] = managers
  const disconnect = connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject()
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, inviteeProject] = projects

  const obs1 = await invitorProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'initial')
  inviteeProject.$sync.start()

  await t.exception(
    () => pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 }),
    'wait for sync times out'
  )

  await t.exception(
    () => inviteeProject.observation.getByDocId(obs1.docId),
    'before both peers have started sync, doc does not sync'
  )

  invitorProject.$sync.start()

  // Use the same timeout as above, to check that it would have synced given the timeout
  await pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 })

  const obs1Synced = await inviteeProject.observation.getByDocId(obs1.docId)

  t.alike(obs1Synced, obs1, 'observation is synced')

  inviteeProject.$sync.stop()

  const obs2 = await inviteeProject.observation.create(
    valueOf(generate('observation')[0])
  )
  await waitForSync(projects, 'initial')

  await t.exception(
    () => pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 }),
    'wait for sync times out'
  )

  await t.exception(
    () => invitorProject.observation.getByDocId(obs2.docId),
    'after stopping sync, data does not sync'
  )

  inviteeProject.$sync.start()

  await pTimeout(waitForSync(projects, 'full'), { milliseconds: 1000 })

  const obs2Synced = await invitorProject.observation.getByDocId(obs2.docId)

  t.alike(obs2Synced, obs2, 'observation is synced')

  await disconnect()
})

test('shares cores', async function (t) {
  const COUNT = 5
  const managers = await createManagers(COUNT)
  const [invitor, ...invitees] = managers
  connectPeers(managers, { discovery: false })
  const projectId = await invitor.createProject()
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const coreManagers = projects.map((p) => p[kCoreManager])

  await waitForSync(projects, 'initial')

  for (const ns of PRESYNC_NAMESPACES) {
    for (const cm of coreManagers) {
      const keyCount = getKeys(cm, ns).length
      t.is(keyCount, COUNT, 'expected number of cores')
    }
  }

  // Currently need to start syncing to share other keys - this might change if
  // we add keys based on coreOwnership records
  for (const project of projects) {
    project.$sync.start()
  }

  await waitForSync(projects, 'full')

  for (const ns of NAMESPACES) {
    for (const cm of coreManagers) {
      const keyCount = getKeys(cm, ns).length
      t.is(keyCount, COUNT, 'expected number of cores')
    }
  }
})
