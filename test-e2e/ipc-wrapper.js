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
