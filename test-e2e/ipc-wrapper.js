import { test } from 'brittle'
import { MessageChannel, MessagePort } from 'node:worker_threads'
import RAM from 'random-access-memory'
import { KeyManager } from '@mapeo/crypto'
import { createClient } from 'rpc-reflector'
import { createMapeoServer } from '../src/ipc-wrapper/server.js'
import { MapeoManager } from '../src/mapeo-manager.js'
import { createMapeoClient } from '../src/ipc-wrapper/client.js'

test('IPC wrappers work', async (t) => {
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

  const projectId = await client.createProject({ name: 'mapeo' })

  t.ok(projectId)

  const project = await client.getProject(projectId)

  t.ok(project)

  const projectSettings = await project.$getProjectSettings()

  t.alike(projectSettings, { name: 'mapeo', defaultPresets: undefined })

  server.close()
  createClient.close(client)

  port1.close()
  port2.close()
})

test('Client calls fail after server closes', async (t) => {
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

  const projectId = await client.createProject({ name: 'mapeo' })
  const projectBefore = await client.getProject(projectId)

  await projectBefore.$getProjectSettings()

  server.close()

  createClient.close(client)
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

  port1.close()
  port2.close()
})
