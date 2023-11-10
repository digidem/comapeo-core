import { test } from 'brittle'
import { randomBytes, createHash } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import { MapeoManager } from '../src/mapeo-manager.js'

test('Managing created projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const project1Id = await manager.createProject()
  const project2Id = await manager.createProject({
    name: 'project 2',
  })

  t.test('initial information from listed projects', async (st) => {
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

  t.test('initial settings from project instances', async (st) => {
    const settings1 = await project1.$getProjectSettings()
    const settings2 = await project2.$getProjectSettings()

    st.alike(settings1, {
      name: undefined,
      defaultPresets: undefined,
    })

    st.alike(settings2, {
      name: 'project 2',
      defaultPresets: undefined,
    })
  })

  t.test('after updating project settings', async (st) => {
    await project1.$setProjectSettings({
      name: 'project 1',
    })
    await project2.$setProjectSettings({
      name: 'project 2 updated',
    })

    const settings1 = await project1.$getProjectSettings()
    const settings2 = await project2.$getProjectSettings()

    st.alike(settings1, {
      name: 'project 1',
      defaultPresets: undefined,
    })

    st.alike(settings2, {
      name: 'project 2 updated',
      defaultPresets: undefined,
    })

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

test('Managing added projects', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
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

  t.test('initial information from listed projects', async (st) => {
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
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
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
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
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
    dbFolder: ':memory:',
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
    await manager.getProject(projectId)
  }

  // @ts-ignore snapshot() is missing from typedefs
  t.snapshot(storageNames.sort())
})

test('manager.start() and manager.stop()', async (t) => {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  await manager.start()
  await manager.start()
  await manager.stop()

  await manager.start()
  await manager.stop()

  t.pass('start() and stop() life cycle runs without issues')
})

/**
 * Generate a deterministic random bytes
 *
 * @param {string} seed
 */
function randomBytesSeed(seed) {
  return createHash('sha256').update(seed).digest()
}
