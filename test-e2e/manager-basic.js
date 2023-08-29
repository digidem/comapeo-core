import { test } from 'brittle'
import { randomBytes } from 'crypto'
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

  const createdProjectId = await manager.createProject({
    name: 'created project',
  })

  const addedProjectId = await manager.addProject({
    projectKey: KeyManager.generateProjectKeypair().publicKey,
    encryptionKeys: { auth: randomBytes(32) },
    projectInfo: { name: 'added project' },
  })

  const listedProjects = await manager.listProjects()

  t.is(listedProjects.length, 2)

  t.is(
    listedProjects[0].projectId,
    createdProjectId,
    'created projects are listed'
  )
  t.is(listedProjects[0].name, 'created project')

  t.is(listedProjects[1].projectId, addedProjectId, 'added projects are listed')
  t.is(listedProjects[1].name, 'added project')
})

test('Manager cannot add project that already exists', async (t) => {
  const manager = new MapeoManager({ rootKey: KeyManager.generateRootKey() })

  const existingProjectId = await manager.createProject()

  const existingProjectsCountBefore = (await manager.listProjects()).length

  t.exception(
    manager.addProject({
      projectKey: Buffer.from(existingProjectId, 'hex'),
      encryptionKeys: {
        auth: randomBytes(32),
      },
    }),
    'attempting to add project that already exists throws'
  )

  const existingProjectsCountAfter = (await manager.listProjects()).length

  t.is(existingProjectsCountBefore, existingProjectsCountAfter)
})
