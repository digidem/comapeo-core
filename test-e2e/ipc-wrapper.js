import { test } from 'brittle'
import { MessageChannel } from 'node:worker_threads'
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

  const server = createMapeoServer(manager, port1)
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

  const server = createMapeoServer(manager, port1)
  const client = createMapeoClient(port2)

  port1.start()
  port2.start()

  const projectId = await client.createProject({ name: 'mapeo' })
  const project = await client.getProject(projectId)

  await project.$getProjectSettings()

  server.close()

  // Doing it this way to speed up the test because each should wait for a timeout
  const results = await Promise.allSettled([
    // Test client method that returns a normal value
    client.listProjects(),
    // Test client method that returns a proxied value (special case)
    client.getProject(projectId),
    // Test project method that returns a normal value
    project.$getProjectSettings(),
  ])

  for (const result of results) {
    // @ts-ignore
    t.is(result.status, 'rejected', result.reason)
  }

  port1.close()
  port2.close()
})
