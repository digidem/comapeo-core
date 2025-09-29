import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import { MapeoProject } from '../src/mapeo-project.js'
import Fastify from 'fastify'
import { getExpectedConfig } from './utils.js'
import { defaultConfigPath } from '../test/helpers/default-config.js'
import { kDataTypes } from '../src/mapeo-project.js'
import { hashObject } from '../src/utils.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('Managing created projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

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

test('Consistent loading of config', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
    defaultConfigPath,
  })

  const expectedDefault = await getExpectedConfig(defaultConfigPath)
  const expectedMinimal = await getExpectedConfig(
    'test/fixtures/config/completeConfig.zip'
  )
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const projectSettings = await project.$getProjectSettings()

  const projectPresets = await project.preset.getMany()
  await t.test(
    'load default config and check if correctly loaded',
    async () => {
      assert.equal(
        //@ts-ignore
        projectSettings.defaultPresets.point.length,
        expectedDefault.presets.length,
        'the default presets loaded is equal to the number of presets in the default config'
      )

      assert.deepEqual(
        projectPresets.map((preset) => preset.name),
        expectedDefault.presets.map((preset) => preset.value.name),
        'project is loading the default presets correctly'
      )

      const projectFields = await project.field.getMany()
      assert.deepEqual(
        projectFields.map((field) => field.tagKey),
        expectedDefault.fields.map((field) => field.value.tagKey),
        'project is loading the default fields correctly'
      )

      const projectIcons = await project[kDataTypes].icon.getMany()
      assert.deepEqual(
        projectIcons.map((icon) => icon.name),
        expectedDefault.icons.map((icon) => icon.name),
        'project is loading the default icons correctly'
      )
    }
  )

  await t.test('loading non-default config when creating project', async () => {
    const configPath = 'test/fixtures/config/completeConfig.zip'
    const projectId = await manager.createProject({ configPath })

    const project = await manager.getProject(projectId)

    const projectSettings = await project.$getProjectSettings()
    assert.equal(
      projectSettings.defaultPresets?.point.length,
      expectedMinimal.presets.length,
      'the default presets loaded is equal to the number of presets in the default config'
    )

    const projectPresets = await project.preset.getMany()
    assert.deepEqual(
      projectPresets.map((preset) => preset.name),
      expectedMinimal.presets.map((preset) => preset.value.name),
      'project is loading the default presets correctly'
    )

    const projectFields = await project.field.getMany()
    assert.deepEqual(
      projectFields.map((field) => field.tagKey),
      expectedMinimal.fields.map((field) => field.value.tagKey),
      'project is loading the default fields correctly'
    )

    const projectIcons = await project[kDataTypes].icon.getMany()
    assert.deepEqual(
      projectIcons.map((icon) => icon.name),
      expectedMinimal.icons.map((icon) => icon.name),
      'project is loading the default icons correctly'
    )
  })

  await t.test(
    'load different config and check if correctly loaded',
    async () => {
      const configPath = 'test/fixtures/config/completeConfig.zip'
      await project.importConfig({ configPath })
      const projectPresets = await project.preset.getMany()
      assert.deepEqual(
        projectPresets.map((preset) => preset.name),
        expectedMinimal.presets.map((preset) => preset.value.name),
        'project presets explicitly loaded match expected config'
      )

      const projectFields = await project.field.getMany()
      assert.deepEqual(
        projectFields.map((field) => field.tagKey),
        expectedMinimal.fields.map((field) => field.value.tagKey),
        'project fields explicitly loaded match expected config'
      )

      // TODO: since we don't delete icons, this wouldn't match
      // const projectIcons = await project1[kDataTypes].icon.getMany()
      // assert.deepEqual(
      //   projectIcons.map((icon) => icon.name),
      //   loadedIcons.map((icon) => icon.name)
      // )
    }
  )
})

test('Managing added projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

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

test('Managing both created and added projects', async () => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

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

test('Manager cannot add project that already exists', async () => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

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

test('Consistent storage folders', async () => {
  /** @type {string[]} */
  const storageNames = []
  const manager = new MapeoManager({
    rootKey: randomBytesSeed('root_key').subarray(0, 16),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    fastify: Fastify(),
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

test('Reusing port after start/stop of discovery', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify: Fastify(),
  })

  t.after(() => manager.stopLocalPeerDiscoveryServer())

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
