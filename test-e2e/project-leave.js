import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { temporaryDirectory } from 'tempy'

import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import {
  COORDINATOR_ROLE_ID,
  LEFT_ROLE_ID,
  MEMBER_ROLE_ID,
} from '../src/roles.js'
import {
  ManagerCustodian,
  connectPeers,
  createManager,
  createManagers,
  createOldManager,
  getDiskUsage,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'

test("Creator cannot leave project if they're the only coordinator", async (t) => {
  const managers = await createManagers(2, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const [creator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const [creatorProject, memberProject] = projects

  assert(
    await creatorProject.$member.getById(member.deviceId),
    'member successfully added from creator perspective'
  )

  assert(
    await memberProject.$member.getById(creator.deviceId),
    'creator successfully added from member perspective'
  )

  await assert.rejects(async () => {
    await creator.leaveProject(projectId)
  }, 'creator attempting to leave project with no other coordinators fails')
})

test('leaving a project as the only member', async (t) => {
  const [manager] = await createManagers(1, t)

  const projectId = await manager.createProject({ name: 'mapeo' })
  const creatorProject = await manager.getProject(projectId)

  await manager.leaveProject(projectId)

  assert.equal(
    (await creatorProject.$getOwnRole()).roleId,
    LEFT_ROLE_ID,
    'creator now has LEFT role'
  )
})

test('Creator can leave project if another coordinator exists', async (t) => {
  const managers = await createManagers(2, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const [creator, coordinator] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [coordinator],
    projectId,
    roleId: COORDINATOR_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const [creatorProject, coordinatorProject] = projects

  assert(
    await creatorProject.$member.getById(coordinator.deviceId),
    'coordinator successfully added from creator perspective'
  )

  assert(
    await coordinatorProject.$member.getById(coordinator.deviceId),
    'creator successfully added from creator perspective'
  )

  await waitForSync(projects, 'initial')

  await creator.leaveProject(projectId)

  assert.equal(
    (await creatorProject.$getOwnRole()).roleId,
    LEFT_ROLE_ID,
    'creator now has LEFT role'
  )

  await waitForSync(projects, 'initial')

  assert.equal(
    (await coordinatorProject.$member.getById(creator.deviceId)).role.roleId,
    LEFT_ROLE_ID,
    'coordinator can still retrieve info about creator who left'
  )
})

test('Member can leave project if creator exists', async (t) => {
  const managers = await createManagers(2, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const [creator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const [creatorProject, memberProject] = projects

  assert(
    await creatorProject.$member.getById(member.deviceId),
    'member successfully added from creator perspective'
  )

  assert(
    await memberProject.$member.getById(creator.deviceId),
    'creator successfully added from member perspective'
  )

  await waitForSync(projects, 'initial')

  await member.leaveProject(projectId)

  assert.equal(
    (await memberProject.$getOwnRole()).roleId,
    LEFT_ROLE_ID,
    'member now has LEFT role'
  )

  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    LEFT_ROLE_ID,
    'creator can still retrieve info about member who left'
  )

  const list = await member.listProjects()

  assert.equal(list.length, 0, 'member has no projects after leaving')
})

test('Data access after leaving project', async (t) => {
  const managers = await createManagers(3, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  const [creator, coordinator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await Promise.all([
    invite({
      invitor: creator,
      invitees: [coordinator],
      projectId,
      roleId: COORDINATOR_ROLE_ID,
    }),
    invite({
      invitor: creator,
      invitees: [member],
      projectId,
      roleId: MEMBER_ROLE_ID,
    }),
  ])

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const [, coordinatorProject, memberProject] = projects

  await memberProject.observation.create(valueOf(generate('observation')[0]))
  assert(
    (await memberProject.observation.getMany()).length >= 1,
    'Test is set up correctly'
  )

  await waitForSync(projects, 'initial')

  await Promise.all([
    coordinator.leaveProject(projectId),
    member.leaveProject(projectId),
  ])

  await assert.rejects(async () => {
    await memberProject.observation.create(valueOf(generate('observation')[0]))
  }, 'member cannot create new data after leaving')
  await assert.rejects(
    () => memberProject.observation.getMany(),
    "Shouldn't be able to fetch observations after leaving"
  )

  assert.deepEqual(
    await memberProject.$getProjectSettings(),
    { name: 'mapeo', sendStats: false },
    'member can still get name and sendStats after leaving'
  )

  assert.deepEqual(
    await coordinatorProject.$getProjectSettings(),
    { name: 'mapeo', sendStats: false },
    'coordinator can still get name and sendStats after leaving'
  )

  await assert.rejects(async () => {
    await coordinatorProject.$setProjectSettings({ name: 'foo' })
  }, 'coordinator cannot update project settings after leaving')
})

test('leaving a project deletes data from disk', async (t) => {
  const memberCoreStorage = temporaryDirectory()
  t.after(() =>
    fs.rm(memberCoreStorage, { recursive: true, force: true, maxRetries: 2 })
  )

  const managers = await Promise.all([
    (async () => {
      const creator = await createManager('creator', t)
      await creator.setDeviceInfo({ name: 'creator', deviceType: 'mobile' })
      return creator
    })(),
    (async () => {
      const member = await createManager('member', t, {
        coreStorage: memberCoreStorage,
      })
      await member.setDeviceInfo({ name: 'member', deviceType: 'mobile' })
      return member
    })(),
  ])
  const [creator, member] = managers

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [creatorProject, memberProject] = projects

  const observation = await creatorProject.observation.create(
    valueOf(generate('observation')[0])
  )

  creatorProject.$sync.start()
  memberProject.$sync.start()

  await waitForSync(projects, 'full')

  assert(
    await memberProject.observation.getByDocId(observation.docId),
    'Observation made it to other manager; test is set up correctly'
  )

  const sizeBeforeRemoval = await getDiskUsage(memberCoreStorage)

  await member.leaveProject(projectId)

  const sizeAfterRemoval = await getDiskUsage(memberCoreStorage)

  assert(
    sizeBeforeRemoval > sizeAfterRemoval,
    'Some data was removed from disk'
  )
})

test('leaving a project while disconnected', async (t) => {
  const managers = await createManagers(2, t)

  let disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const [creator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [creatorProject] = projects

  await disconnectPeers()

  await member.leaveProject(projectId)

  assert(
    await creatorProject.$member.getById(member.deviceId),
    'creator still thinks member is part of project'
  )

  disconnectPeers = connectPeers(managers)
  await waitForPeers(managers)

  await waitForSync(projects, 'initial')

  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role.roleId,
    LEFT_ROLE_ID,
    'creator no longer thinks member is part of project'
  )
})

// NB: This test was checked to fail by temporarily commenting out the
// `if (projectKeysTableResult.hasLeftProject) { await project[kClearData()] }`
// block in MapeoManager#getProject.
test('partly-left projects are cleaned up on startup', async (t) => {
  const custodian = new ManagerCustodian(t)

  const projectId = await custodian.withManagerInSeparateProcess(
    async (manager, { observation }) => {
      const projectId = await manager.createProject({ name: 'foo' })
      const project = await manager.getProject(projectId)
      await project.observation.create(observation)
      manager.leaveProject(projectId)
      // Exit the process before the async clear project data has completed
      setImmediate(() => {
        process.exit(0)
      })
      return projectId
    },
    {
      observation: valueOf(generate('observation')[0]),
    }
  )

  const couldGetObservations = await custodian.withManagerInSeparateProcess(
    async (manager, projectId) => {
      const project = await manager.getProject(projectId)
      return project.observation
        .getMany()
        .then(() => true)
        .catch(() => false)
    },
    projectId
  )

  assert(
    !couldGetObservations,
    "Shouldn't be able to fetch observations after leaving"
  )
})

test('leaving a project before PR#1125 persists after PR#1125', async (t) => {
  const dbFolder = temporaryDirectory()
  const coreStorage = temporaryDirectory()
  t.after(() => fs.rm(dbFolder, { recursive: true }))
  t.after(() => fs.rm(coreStorage, { recursive: true }))

  const manager4_1_4 = await createOldManager('4.1.4', 'a', {
    dbFolder,
    coreStorage,
  })

  const projectId = await manager4_1_4.createProject({ name: 'foo' })
  const project = await manager4_1_4.getProject(projectId)
  await manager4_1_4.leaveProject(projectId)
  await project.close()

  const managerNew = await createManager('a', t, { dbFolder, coreStorage })

  const projectsList = await managerNew.listProjects()
  assert.equal(projectsList.length, 0, 'no projects listed')
})

test('Member can join project again after leaving', async (t) => {
  const managers = await createManagers(2, t)

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const [creator, member] = managers
  const projectId = await creator.createProject({ name: 'mapeo' })

  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )

  const [creatorProject, memberProject] = projects

  assert(
    await creatorProject.$member.getById(member.deviceId),
    'member successfully added from creator perspective'
  )

  assert(
    await memberProject.$member.getById(member.deviceId),
    'creator successfully added from creator perspective'
  )

  await waitForSync(projects, 'initial')

  await member.leaveProject(projectId)

  // The project will auto close when we get a new invite
  await invite({
    invitor: creator,
    invitees: [member],
    projectId,
    roleId: MEMBER_ROLE_ID,
  })

  // We need to re-get the project since it was closed
  const reMemberProject = await member.getProject(projectId)

  assert.notEqual(reMemberProject, memberProject, 'new project on rejoin')

  await waitForSync([creatorProject, reMemberProject], 'initial')

  assert(
    await creatorProject.$member.getById(member.deviceId),
    'member successfully added from creator perspective'
  )

  assert(
    await reMemberProject.$member.getById(member.deviceId),
    'creator successfully added from creator perspective'
  )
})
