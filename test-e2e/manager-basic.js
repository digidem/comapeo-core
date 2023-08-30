import { test } from 'brittle'
import { randomBytes, createHash } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { MapeoManager } from '../src/mapeo-manager.js'
import RAM from 'random-access-memory'

test('Managing multiple projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

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

  const createdProject = listedProjects.find(
    ({ projectId }) => projectId === createdProjectId
  )
  t.ok(createdProject, 'created project is listed')
  t.is(createdProject?.name, 'created project')

  const addedProject = listedProjects.find(
    ({ projectId }) => projectId === addedProjectId
  )
  t.ok(addedProject, 'added project is listed')
  t.is(addedProject?.name, 'added project')
})

test('Manager cannot add project that already exists', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

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

test('Consistent storage folders', async (t) => {
  /** @type {string[]} */
  const storageNames = []
  const manager = new MapeoManager({
    rootKey: randomBytesSeed('root_key').subarray(0, 16),
    dbFolder: ':memory:',
    coreStorage: (name) => {
      storageNames.push(name)
      return new RAM()
    },
  })

  for (let i = 0; i < 10; i++) {
    const projectId = await manager.addProject({
      projectKey: randomBytesSeed('test' + i),
      encryptionKeys: { auth: randomBytes(32) },
      projectInfo: {},
    })
    await manager.getProject(projectId)
  }

  // @ts-ignore snapshot() is missing from typedefs
  t.snapshot(storageNames.sort())
})

/**
 * Generate a deterministic random bytes
 *
 * @param {string} seed
 */
function randomBytesSeed(seed) {
  return createHash('sha256').update(seed).digest()
}
