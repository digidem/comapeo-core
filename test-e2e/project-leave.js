import test from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import { temporaryDirectory } from 'tempy'

import {
  BLOCKED_ROLE_ID,
  COORDINATOR_ROLE_ID,
  ROLES,
  LEFT_ROLE_ID,
  MEMBER_ROLE_ID,
} from '../src/roles.js'
import { MapeoProject } from '../src/mapeo-project.js'
import {
  ManagerCustodian,
  connectPeers,
  createManager,
  createManagers,
  disconnectPeers,
  getFileSize,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'

test('Creator cannot leave project if they are the only member', async (t) => {
  const [creatorManager] = await createManagers(1, t)

  const projectId = await creatorManager.createProject({ name: 'mapeo' })

  await assert.rejects(async () => {
    await creatorManager.leaveProject(projectId)
  }, 'attempting to leave fails')
})

test('Creator cannot leave project if no other coordinators exist', async (t) => {
  const managers = await createManagers(2, t)

  connectPeers(managers)
  await waitForPeers(managers)

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

  await disconnectPeers(managers)
})

test('Blocked member cannot leave project', async (t) => {
  const managers = await createManagers(2, t)

  connectPeers(managers)
  await waitForPeers(managers)

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

  assert.deepEqual(
    await memberProject.$getOwnRole(),
    ROLES[MEMBER_ROLE_ID],
    'Member is initially a member'
  )

  await creatorProject.$member.assignRole(member.deviceId, BLOCKED_ROLE_ID)

  await waitForSync(projects, 'initial')

  assert.deepEqual(
    await memberProject.$getOwnRole(),
    ROLES[BLOCKED_ROLE_ID],
    'Member is now blocked'
  )

  await assert.rejects(async () => {
    await member.leaveProject(projectId)
  }, 'Member attempting to leave project fails')

  await disconnectPeers(managers)
})

test('Creator can leave project if another coordinator exists', async (t) => {
  const managers = await createManagers(2, t)

  connectPeers(managers)
  await waitForPeers(managers)

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

  assert.deepEqual(
    await creatorProject.$getOwnRole(),
    ROLES[LEFT_ROLE_ID],
    'creator now has LEFT role'
  )

  await waitForSync(projects, 'initial')

  assert.equal(
    (await coordinatorProject.$member.getById(creator.deviceId)).role,
    ROLES[LEFT_ROLE_ID],
    'coordinator can still retrieve info about creator who left'
  )

  await disconnectPeers(managers)
})

test('Member can leave project if creator exists', async (t) => {
  const managers = await createManagers(2, t)

  connectPeers(managers)
  await waitForPeers(managers)

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

  assert.deepEqual(
    await memberProject.$getOwnRole(),
    ROLES[LEFT_ROLE_ID],
    'member now has LEFT role'
  )

  await waitForSync(projects, 'initial')

  assert.equal(
    (await creatorProject.$member.getById(member.deviceId)).role,
    ROLES[LEFT_ROLE_ID],
    'creator can still retrieve info about member who left'
  )

  await disconnectPeers(managers)
})

test('Data access after leaving project', async (t) => {
  const managers = await createManagers(3, t)

  connectPeers(managers)
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

  await memberProject.observation.create({
    schemaName: 'observation',
    attachments: [],
    tags: {},
    refs: [],
    metadata: {},
  })
  assert(
    (await memberProject.observation.getMany()).length >= 1,
    'Test is set up correctly'
  )

  await waitForSync(projects, 'initial')

  await Promise.all([
    coordinator.leaveProject(projectId),
    member.leaveProject(projectId),
  ])

  await waitForSync(projects, 'initial')

  await assert.rejects(async () => {
    await memberProject.observation.create({
      schemaName: 'observation',
      attachments: [],
      tags: {},
      refs: [],
      metadata: {},
    })
  }, 'member cannot create new data after leaving')
  await assert.rejects(
    () => memberProject.observation.getMany(),
    "Shouldn't be able to fetch observations after leaving"
  )

  assert.deepEqual(
    await memberProject.$getProjectSettings(),
    MapeoProject.EMPTY_PROJECT_SETTINGS,
    'member getting project settings returns empty settings'
  )

  assert.deepEqual(
    await coordinatorProject.$getProjectSettings(),
    MapeoProject.EMPTY_PROJECT_SETTINGS,
    'coordinator getting project settings returns empty settings'
  )

  await assert.rejects(async () => {
    await coordinatorProject.$setProjectSettings({ name: 'foo' })
  }, 'coordinator cannot update project settings after leaving')

  await disconnectPeers(managers)
})

test('leaving a project deletes data from disk', async (t) => {
  const memberCoreStorage = temporaryDirectory()
  t.after(() =>
    fs.rm(memberCoreStorage, { recursive: true, force: true, maxRetries: 2 })
  )

  const managers = await Promise.all([
    (async () => {
      const creator = await createManager('creator', t)
      await creator.setDeviceInfo({ name: 'creator' })
      return creator
    })(),
    (async () => {
      const member = await createManager('member', t, {
        coreStorage: memberCoreStorage,
      })
      await member.setDeviceInfo({ name: 'member' })
      return member
    })(),
  ])
  const [creator, member] = managers

  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

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

  const observation = await creatorProject.observation.create({
    schemaName: 'observation',
    attachments: [],
    tags: {},
    refs: [],
    metadata: {},
  })

  creatorProject.$sync.start()
  memberProject.$sync.start()

  await waitForSync(projects, 'full')

  assert(
    await memberProject.observation.getByDocId(observation.docId),
    'Observation made it to other manager; test is set up correctly'
  )

  const sizeBeforeRemoval = await getFileSize(memberCoreStorage)

  await member.leaveProject(projectId)

  const sizeAfterRemoval = await getFileSize(memberCoreStorage)

  assert(
    sizeBeforeRemoval > sizeAfterRemoval,
    'Some data was removed from disk'
  )
})

test('leaving a project while disconnected', async (t) => {
  const managers = await createManagers(2, t)

  let disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  await waitForPeers(managers)

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

test('partly-left projects are cleaned up on startup', async (t) => {
  const custodian = new ManagerCustodian(t)

  const projectId = await custodian.withManagerInSeparateProcess(
    async (manager, LEFT_ROLE_ID) => {
      const projectId = await manager.createProject({ name: 'foo' })
      const project = await manager.getProject(projectId)
      await project.observation.create({
        schemaName: 'observation',
        attachments: [],
        tags: {},
        refs: [],
        metadata: {},
      })
      await project.$member.assignRole(
        manager.getDeviceInfo().deviceId,
        /**
         * This test-only hack assigns the "left" role ID without actually
         * cleaning up the project.
         * @type {any}
         */ (LEFT_ROLE_ID)
      )
      return projectId
    },
    LEFT_ROLE_ID
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

// TODO: Add test for leaving and rejoining a project
