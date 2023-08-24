import { test } from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'

test('Managing multiple projects', async (t) => {
  const manager = new MapeoManager({ rootKey: KeyManager.generateRootKey() })

  const initialProjects = await manager.listProjects()

  t.is(
    initialProjects.length,
    0,
    'no projects exist when manager is initially created'
  )

  const createdProjectIds = [
    await manager.createProject(),
    await manager.createProject(),
    await manager.createProject(),
  ]

  const allProjects = await manager.listProjects()

  t.is(allProjects.length, createdProjectIds.length)
  t.ok(
    allProjects.every((p) => createdProjectIds.includes(p.projectId)),
    'all created projects are listed'
  )
})
