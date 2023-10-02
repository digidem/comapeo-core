import { test } from 'brittle'
import { MessageChannel } from 'node:worker_threads'
import RAM from 'random-access-memory'
import { KeyManager } from '@mapeo/crypto'
import { createMapeoServer } from '../src/ipc-wrapper/server.js'
import { MapeoManager } from '../src/mapeo-manager.js'
import {
  createMapeoClient,
  closeMapeoClient,
} from '../src/ipc-wrapper/client.js'

test('IPC wrappers work', async (t) => {
  const { client, cleanup } = setup()

  const projectId = await client.createProject({ name: 'mapeo' })

  t.ok(projectId)

  const project = await client.getProject(projectId)

  t.ok(project)

  const projectSettings = await project.$getProjectSettings()

  t.alike(projectSettings, { name: 'mapeo', defaultPresets: undefined })

  return cleanup()
})

test('Multiple projects and several calls in same tick', async (t) => {
  const { client, cleanup } = setup()

  const sample = Array(10)
    .fill(null)
    .map((_, index) => {
      return {
        name: `Mapeo ${index}`,
        defaultPresets: undefined,
      }
    })

  const projectIds = await Promise.all(
    sample.map(async (s) => client.createProject(s))
  )

  const projects = await Promise.all(
    projectIds.map((id) => client.getProject(id))
  )

  const settings = await Promise.all(
    projects.map((project) => project.$getProjectSettings())
  )

  const listedProjects = await client.listProjects()

  t.is(projectIds.length, sample.length)
  t.is(projects.length, sample.length)
  t.is(settings.length, sample.length)
  t.is(listedProjects.length, sample.length)

  settings.forEach((s, index) => {
    const expectedSettings = sample[index]
    t.alike(s, expectedSettings)
  })

  return cleanup()
})

test('Attempting to get non-existent project fails', async (t) => {
  const { client, cleanup } = setup()

  await t.exception(async () => {
    await client.getProject('mapeo')
  })

  const results = await Promise.allSettled([
    client.getProject('mapeo'),
    client.getProject('mapeo'),
  ])

  t.alike(
    results.map(({ status }) => status),
    ['rejected', 'rejected']
  )

  return cleanup()
})

test('Concurrent calls that succeed', async (t) => {
  const { client, cleanup } = setup()

  const projectId = await client.createProject()

  const [project1, project2] = await Promise.all([
    client.getProject(projectId),
    client.getProject(projectId),
  ])

  t.is(project1, project2)

  return cleanup()
})

test('Client calls fail after server closes', async (t) => {
  const { client, server, cleanup } = setup()

  const projectId = await client.createProject({ name: 'mapeo' })
  const projectBefore = await client.getProject(projectId)

  await projectBefore.$getProjectSettings()

  server.close()
  await closeMapeoClient(client)

  const projectAfter = await client.getProject(projectId)

  // Even after server closes we're still able to get the project ipc instance, which is okay
  // because any field access should fail on that, rendering it unusable
  // Adding this assertion to track changes in this behavior
  t.ok(projectAfter)

  // Doing it this way to speed up the test because each should wait for a timeout
  // Attempting to access any fields on the ipc instances should fail (aside from client.getProject, which is tested above)
  const results = await Promise.allSettled([
    client.listProjects(),
    projectBefore.$getProjectSettings(),
  ])

  for (const result of results) {
    // @ts-ignore
    t.is(result.status, 'rejected', result.reason)
  }

  return cleanup()
})

function setup() {
  const { port1, port2 } = new MessageChannel()

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  // Since v14.7.0, Node's MessagePort extends EventTarget (https://nodejs.org/api/worker_threads.html#class-messageport)
  // @ts-expect-error
  const server = createMapeoServer(manager, port1)
  // @ts-expect-error
  const client = createMapeoClient(port2)

  port1.start()
  port2.start()

  return {
    port1,
    port2,
    server,
    client,
    cleanup: async () => {
      server.close()
      await closeMapeoClient(client)
      port1.close()
      port2.close()
    },
  }
}
