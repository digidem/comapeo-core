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

  const createdProjectId = await manager.createProject()

  const addedProjectId = await manager.addProject({
    projectKey: KeyManager.generateProjectKeypair().publicKey,
    encryptionKeys: {
      auth: randomBytes(32),
    },
  })

  const existingProjectIds = [createdProjectId, addedProjectId]

  const allProjects = await manager.listProjects()

  t.is(allProjects.length, existingProjectIds.length)
  t.ok(
    allProjects.every((p) => existingProjectIds.includes(p.projectId)),
    'all created projects are listed'
  )
})

test('Manager cannot add existing project', async (t) => {
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
    'attempting to add an existing project throws'
  )

  const existingProjectsCountAfter = (await manager.listProjects()).length

  t.is(existingProjectsCountBefore, existingProjectsCountAfter)
})
