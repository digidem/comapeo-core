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
