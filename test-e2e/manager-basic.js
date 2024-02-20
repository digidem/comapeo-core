// @ts-check
import { test } from 'brittle'
import { randomBytes, createHash } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'
import Fastify from 'fastify'
import { getExpectedConfig } from './utils.js'
import { kDataTypes } from '../src/mapeo-project.js'

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

const expectedDefault = await getExpectedConfig(
  'config/defaultConfig.mapeoconfig'
)
const expectedMinimal = await getExpectedConfig(
  'tests/fixtures/config/completeConfig.zip'
)

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
  const project2Id = await manager.createProject({
    name: 'project 2',
  })

  await t.test('initial information from listed projects', async (st) => {
    const listedProjects = await manager.listProjects()

    st.is(listedProjects.length, 2)

    const listedProject1 = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const listedProject2 = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    st.ok(listedProject1)
    st.absent(listedProject1?.name)
    st.ok(listedProject1?.createdAt)
    st.ok(listedProject1?.updatedAt)

    st.ok(listedProject2)
    st.is(listedProject2?.name, 'project 2')
    st.ok(listedProject2?.createdAt)
    st.ok(listedProject2?.updatedAt)
  })

  const project1 = await manager.getProject(project1Id)
  const project2 = await manager.getProject(project2Id)

  t.ok(project1)
  t.ok(project2)

  await t.test(
    'initial settings and default config from project instances',
    async (st) => {
      const settings1 = await project1.$getProjectSettings()
      const settings2 = await project2.$getProjectSettings()

      st.alike(
        settings1,
        { name: undefined, defaultPresets: undefined },
        'undefined name and default presets for project1'
      )
      st.alike(
        settings2,
        { name: 'project 2', defaultPresets: undefined },
        'matched name for project2 with undefined default presets'
      )
    }
  )

  await t.test('after updating project settings', async (st) => {
    await project1.$setProjectSettings({
      name: 'project 1',
    })
    await project2.$setProjectSettings({
      name: 'project 2 updated',
    })

    const settings1 = await project1.$getProjectSettings()
    const settings2 = await project2.$getProjectSettings()

    st.is(settings1.name, 'project 1')

    st.is(settings2.name, 'project 2 updated')

    const listedProjects = await manager.listProjects()

    st.is(listedProjects.length, 2)

    const project1FromListed = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const project2FromListed = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    st.ok(project1FromListed)
    st.is(project1FromListed?.name, 'project 1')
    st.ok(project1FromListed?.createdAt)
    st.ok(project1FromListed?.updatedAt)

    st.ok(project2FromListed)
    st.is(project2FromListed?.name, 'project 2 updated')
    st.ok(project2FromListed?.createdAt)
    st.ok(project2FromListed?.updatedAt)
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
    defaultConfigPath: 'config/defaultConfig.mapeoconfig',
  })
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const projectSettings = await project.$getProjectSettings()

  const projectPresets = await project.preset.getMany()
  await t.test(
    'load default config and check if correctly loaded',
    async (st) => {
      st.is(
        //@ts-ignore
        projectSettings.defaultPresets.point.length,
        expectedDefault.presets.length,
        'the default presets loaded is equal to the number of presets in the default config'
      )

      st.alike(
        projectPresets.map((preset) => preset.name),
        expectedDefault.presets.map((preset) => preset.value.name),
        'project is loading the default presets correctly'
      )

      const projectFields = await project.field.getMany()
      st.alike(
        projectFields.map((field) => field.tagKey),
        expectedDefault.fields.map((field) => field.value.tagKey),
        'project is loading the default fields correctly'
      )

      const projectIcons = await project[kDataTypes].icon.getMany()
      st.alike(
        projectIcons.map((icon) => icon.name),
        expectedDefault.icons.map((icon) => icon.name),
        'project is loading the default icons correctly'
      )
    }
  )

  await t.test(
    'load different config and check if correctly loaded',
    async (st) => {
      const configPath = 'tests/fixtures/config/completeConfig.zip'
      await project.importConfig({ configPath })
      const projectPresets = await project.preset.getMany()
      st.alike(
        projectPresets.map((preset) => preset.name),
        expectedMinimal.presets.map((preset) => preset.value.name),
        'project presets explicitly loaded match expected config'
      )

      const projectFields = await project.field.getMany()
      st.alike(
        projectFields.map((field) => field.tagKey),
        expectedMinimal.fields.map((field) => field.value.tagKey),
        'project fields explicitly loaded match expected config'
      )

      // TODO: since we don't delete icons, this wouldn't match
      // const projectIcons = await project1[kDataTypes].icon.getMany()
      // st.alike(
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
      projectInfo: { name: 'project 1' },
    },
    { waitForSync: false }
  )

  const project2Id = await manager.addProject(
    {
      projectKey: KeyManager.generateProjectKeypair().publicKey,
      encryptionKeys: { auth: randomBytes(32) },
      projectInfo: { name: 'project 2' },
    },
    { waitForSync: false }
  )

  await t.test('initial information from listed projects', async (st) => {
    const listedProjects = await manager.listProjects()

    st.is(listedProjects.length, 2)

    const listedProject1 = listedProjects.find(
      (p) => p.projectId === project1Id
    )

    const listedProject2 = listedProjects.find(
      (p) => p.projectId === project2Id
    )

    st.ok(listedProject1)
    st.is(listedProject1?.name, 'project 1')
    st.absent(listedProject1?.createdAt)
    st.absent(listedProject1?.updatedAt)

    st.ok(listedProject2)
    st.is(listedProject2?.name, 'project 2')
    st.absent(listedProject2?.createdAt)
    st.absent(listedProject2?.updatedAt)
  })

  // TODO: Ideally would use the todo opt but usage in a subtest doesn't work:  https://github.com/holepunchto/brittle/issues/39
  // t.test('initial settings from project instances', async (t) => {
  //   const project1 = await manager.getProject(project1Id)
  //   const project2 = await manager.getProject(project2Id)

  //   t.ok(project1)
  //   t.ok(project2)

  //   const settings1 = await project1.$getProjectSettings()
  //   const settings2 = await project2.$getProjectSettings()

  //   t.alike(settings1, {
  //     name: 'project 1',
  //     defaultPresets: undefined,
  //   })

  //   t.alike(settings2, {
  //     name: 'project 2',
  //     defaultPresets: undefined,
  //   })
  // })
})

test('Managing both created and added projects', async (t) => {
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
      projectInfo: { name: 'added project' },
    },
    { waitForSync: false }
  )

  const listedProjects = await manager.listProjects()

  t.is(listedProjects.length, 2)

  const createdProjectListed = listedProjects.find(
    ({ projectId }) => projectId === createdProjectId
  )
  t.ok(createdProjectListed, 'created project is listed')

  const addedProjectListed = listedProjects.find(
    ({ projectId }) => projectId === addedProjectId
  )
  t.ok(addedProjectListed, 'added project is listed')

  const createdProject = await manager.getProject(createdProjectId)
  t.ok(createdProject)

  const addedProject = await manager.getProject(addedProjectId)
  t.ok(addedProject)
})

test('Manager cannot add project that already exists', async (t) => {
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

  await t.exception(
    async () =>
      manager.addProject({
        projectKey: Buffer.from(existingProjectId, 'hex'),
        encryptionKeys: { auth: randomBytes(32) },
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
        projectInfo: {},
      },
      { waitForSync: false }
    )
    const project = await manager.getProject(projectId)
    // awaiting this ensures that indexing is done, which means that indexer storage is created
    await project.$getOwnRole()
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
