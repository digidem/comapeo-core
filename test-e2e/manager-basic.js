import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { getExpectedConfig, createManager } from './utils.js'
import { MapeoProject } from '../src/mapeo-project.js'
import { defaultConfigPath } from '../test/helpers/default-config.js'
import { hashObject } from '../src/utils.js'
import { Reader } from 'comapeocat'
import {
  assertProjectHasImportedCategories,
  categoriesArchiveFromFolder,
} from './utils.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

test('Managing created projects', async (t) => {
  const manager = createManager('test', t)

  const project1Id = await manager.createProject()
  const project2Id = await manager.createProject({ name: 'project 2' })

  await t.test('initial information from listed projects', async () => {
    const listedProjects = await manager.listProjects()

    assert.equal(listedProjects.length, 2)

    const listedProject1 = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const listedProject2 = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    assert(listedProject1)
    assert(!listedProject1.name)
    assert.equal(listedProject1.status, 'joined')
    assert(listedProject1?.createdAt)
    assert(listedProject1?.updatedAt)

    assert(listedProject2)
    assert.equal(listedProject2.name, 'project 2')
    assert.equal(listedProject2.status, 'joined')
    assert(listedProject2?.createdAt)
    assert(listedProject2?.updatedAt)
  })

  const project1 = await manager.getProject(project1Id)
  const project2 = await manager.getProject(project2Id)

  assert(project1)
  assert(project2)

  assert(project1 instanceof MapeoProject)
  assert(project2 instanceof MapeoProject)

  await t.test('initial settings from project instances', async () => {
    const settings1 = await project1.$getProjectSettings()
    const settings2 = await project2.$getProjectSettings()
    assert.deepEqual(
      settings1,
      {
        name: undefined,
        projectColor: undefined,
        projectDescription: undefined,
        defaultPresets: undefined,
        configMetadata: undefined,
        sendStats: false,
      },
      'undefined name and default presets for project1'
    )
    assert.deepEqual(
      settings2,
      {
        name: 'project 2',
        projectColor: undefined,
        projectDescription: undefined,
        defaultPresets: undefined,
        configMetadata: undefined,
        sendStats: false,
      },
      'matched name for project2 with undefined default presets'
    )
  })

  await t.test('after updating project settings', async () => {
    await project1.$setProjectSettings({
      name: 'project 1',
      projectColor: '#123456',
    })
    await project2.$setProjectSettings({
      name: 'project 2 updated',
      projectDescription: 'project 2 description',
    })

    const settings1 = await project1.$getProjectSettings()
    const settings2 = await project2.$getProjectSettings()

    assert.deepEqual(settings1, {
      name: 'project 1',
      projectColor: '#123456',
      projectDescription: undefined,
      defaultPresets: undefined,
      configMetadata: undefined,
      sendStats: false,
    })

    assert.deepEqual(settings2, {
      name: 'project 2 updated',
      projectColor: undefined,
      projectDescription: 'project 2 description',
      defaultPresets: undefined,
      configMetadata: undefined,
      sendStats: false,
    })

    assert.equal(settings2.name, 'project 2 updated')

    const listedProjects = await manager.listProjects()

    assert.equal(listedProjects.length, 2)

    const project1FromListed = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const project2FromListed = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    assert(project1FromListed)
    assert(project1FromListed.status === 'joined')

    const {
      createdAt: project1CreatedAt,
      updatedAt: project1UpdatedAt,
      ...project1OtherInfo
    } = project1FromListed

    assert(project1CreatedAt)
    assert(project1UpdatedAt)
    assert.deepEqual(project1OtherInfo, {
      projectId: project1Id,
      name: 'project 1',
      projectColor: '#123456',
      projectDescription: undefined,
      sendStats: false,
      status: 'joined',
    })

    assert(project2FromListed)
    assert.equal(project2FromListed.status, 'joined')

    const {
      createdAt: project2CreatedAt,
      updatedAt: project2UpdatedAt,
      ...project2OtherInfo
    } = project2FromListed

    assert(project2CreatedAt)
    assert(project2UpdatedAt)
    assert.deepEqual(project2OtherInfo, {
      projectId: project2Id,
      name: 'project 2 updated',
      projectColor: undefined,
      projectDescription: 'project 2 description',
      sendStats: false,
      status: 'joined',
    })
  })
})

describe('Consistent loading of config', async () => {
  test('loading default config when creating project', async () => {
    const manager = createManager('test', t, {
      defaultConfigPath,
    })
    const reader = new Reader(defaultConfigPath)
    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)
    await assertProjectHasImportedCategories(project, reader)
  })

  test('load config from path when creating project', async (t) => {
    const manager = createManager('test', t, {
      defaultConfigPath,
    })
    const fixturePath = path.join(__dirname, 'fixtures/config/complete')
    const archivePath = await categoriesArchiveFromFolder(t, fixturePath)
    const reader = new Reader(archivePath)
    const projectId = await manager.createProject({ configPath: archivePath })
    const project = await manager.getProject(projectId)
    await assertProjectHasImportedCategories(project, reader)
  })

  test('load different config after project creation', async (t) => {
    const manager = createManager('test', t, {
      defaultConfigPath,
    })
    const projectId = await manager.createProject()
    const project = await manager.getProject(projectId)

    {
      // Project should start with default config
      const reader = new Reader(defaultConfigPath)
      await assertProjectHasImportedCategories(project, reader)
    }

    {
      // After importing new config, project should have the new config
      const fixturePath = path.join(__dirname, 'fixtures/config/complete')
      const archivePath = await categoriesArchiveFromFolder(t, fixturePath)
      const reader = new Reader(archivePath)
      await project.$importCategories({ filePath: archivePath })
      await assertProjectHasImportedCategories(project, reader)
    }
  })
})

test('Managing added projects', async (t) => {
  // Workers init slower than this test and lead to race conditions
  const manager = createManager('test', t, { useIndexWorkers: false })

  const project1Id = await manager.addProject(
    {
      projectKey: KeyManager.generateProjectKeypair().publicKey,
      encryptionKeys: { auth: randomBytes(32) },
      projectName: 'project 1',
    },
    { waitForSync: false }
  )

  const project2Id = await manager.addProject(
    {
      projectKey: KeyManager.generateProjectKeypair().publicKey,
      encryptionKeys: { auth: randomBytes(32) },
      projectName: 'project 2',
    },
    { waitForSync: false }
  )

  await t.test('initial information from listed projects', async () => {
    const listedProjects = await manager.listProjects()

    assert.equal(listedProjects.length, 2)

    const listedProject1 = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const listedProject2 = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    assert(listedProject1)
    assert.equal(listedProject1.name, 'project 1')
    assert.equal(listedProject1.status, 'joining')
    assert(!('createdAt' in listedProject1))
    assert(!('updatedAt' in listedProject1))

    assert(listedProject2)
    assert.equal(listedProject2.name, 'project 2')
    assert.equal(listedProject2.status, 'joining')
    assert(!('createdAt' in listedProject2))
    assert(!('updatedAt' in listedProject2))
  })

  await t.test(
    'initial settings from project instances',
    { skip: true },
    async () => {
      const project1 = await manager.getProject(project1Id)
      const project2 = await manager.getProject(project2Id)

      assert(project1)
      assert(project2)

      const settings1 = await project1.$getProjectSettings()
      const settings2 = await project2.$getProjectSettings()

      assert.deepEqual(settings1, {
        name: 'project 1',
        defaultPresets: undefined,
        projectColor: undefined,
        projectDescription: undefined,
        sendStats: false,
      })

      assert.deepEqual(settings2, {
        name: 'project 2',
        defaultPresets: undefined,
        projectColor: undefined,
        projectDescription: undefined,
        sendStats: false,
      })
    }
  )
})

test('Managing both created and added projects', async (t) => {
  const manager = createManager('test', t)

  const createdProjectId = await manager.createProject({
    name: 'created project',
  })

  const addedProjectId = await manager.addProject(
    {
      projectKey: KeyManager.generateProjectKeypair().publicKey,
      encryptionKeys: { auth: randomBytes(32) },
      projectName: 'added project',
    },
    { waitForSync: false }
  )

  const listedProjects = await manager.listProjects()

  assert.equal(listedProjects.length, 2)

  const createdProjectListed = listedProjects.find(
    ({ projectId }) => projectId === createdProjectId
  )
  assert(createdProjectListed, 'created project is listed')

  const addedProjectListed = listedProjects.find(
    ({ projectId }) => projectId === addedProjectId
  )
  assert(addedProjectListed, 'added project is listed')

  const createdProject = await manager.getProject(createdProjectId)
  assert(createdProject)

  const addedProject = await manager.getProject(addedProjectId)
  assert(addedProject)
})

test('Manager cannot add project that already exists', async (t) => {
  const manager = createManager('test', t)

  const existingProjectId = await manager.createProject()

  const existingProjectsCountBefore = (await manager.listProjects()).length

  await assert.rejects(
    async () =>
      manager.addProject({
        projectKey: Buffer.from(existingProjectId, 'hex'),
        encryptionKeys: { auth: randomBytes(32) },
        projectName: 'Mapeo Project',
      }),
    'attempting to add project that already exists throws'
  )

  const existingProjectsCountAfter = (await manager.listProjects()).length

  assert.equal(existingProjectsCountBefore, existingProjectsCountAfter)
})

test('Consistent storage folders', async (t) => {
  /** @type {string[]} */
  const storageNames = []
  const manager = createManager('test', t, {
    rootKey: randomBytesSeed('root_key').subarray(0, 16),
    coreStorage: (name) => {
      storageNames.push(name)
      return new RAM()
    },
  })

  for (let i = 0; i < 10; i++) {
    const projectId = await manager.addProject(
      {
        projectKey: randomBytesSeed('test' + i),
        encryptionKeys: { auth: randomBytes(32) },
        projectName: 'Mapeo Project',
      },
      { waitForSync: false }
    )
    const project = await manager.getProject(projectId)
    // awaiting this ensures that indexing is done, which means that indexer storage is created
    await project.$getOwnRole()
  }

  assert.equal(
    hashObject(storageNames.sort()),
    '0c177494a78a8564be24976b2805a06dd9b8bfc7515ba62f1cfec1cba6f66152',
    'storage names match snapshot'
  )
})

// TODO: Why is this test keeping server handles open?
test.skip('Reusing port after start/stop of discovery', async (t) => {
  const manager = createManager('test', t)

  t.after(() =>
    manager.stopLocalPeerDiscoveryServer({ force: true, timeout: 0 })
  )

  const { port } = await manager.startLocalPeerDiscoveryServer()

  await manager.stopLocalPeerDiscoveryServer({ force: true })

  const { port: newPort } = await manager.startLocalPeerDiscoveryServer()
  assert.equal(newPort, port, 'Port got reused')
})

/**
 * Generate a deterministic random bytes
 *
 * @param {string} seed
 */
function randomBytesSeed(seed) {
  return createHash('sha256').update(seed).digest()
}
