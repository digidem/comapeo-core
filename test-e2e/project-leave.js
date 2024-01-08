import { test } from 'brittle'

import {
  BLOCKED_ROLE_ID,
  COORDINATOR_ROLE_ID,
  DEFAULT_CAPABILITIES,
  LEFT_ROLE_ID,
  MEMBER_ROLE_ID,
} from '../src/capabilities.js'
import { MapeoProject } from '../src/mapeo-project.js'
import {
  connectPeers,
  createManagers,
  disconnectPeers,
  invite,
  waitForPeers,
  waitForSync,
} from './utils.js'

test('Creator cannot leave project if they are the only member', async (t) => {
  const [creatorManager] = await createManagers(1, t)

  const projectId = await creatorManager.createProject({ name: 'mapeo' })

  const project = await creatorManager.getProject(projectId)

  await t.exception(async () => {
    await project.$leave()
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

  t.ok(
    await Promise.all([
      creatorProject.$member.getById(member.deviceId),
      memberProject.$member.getById(creator.deviceId),
    ]),
    'member successfully added'
  )

  await t.exception(async () => {
    await creatorProject.$leave()
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

  t.alike(
    await memberProject.$getOwnCapabilities(),
    DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    'Member is initially a member'
  )

  await creatorProject.$member.assignRole(member.deviceId, BLOCKED_ROLE_ID)

  await waitForSync(projects, 'initial')

  t.alike(
    await memberProject.$getOwnCapabilities(),
    DEFAULT_CAPABILITIES[BLOCKED_ROLE_ID],
    'Member is now blocked'
  )

  await t.exception(async () => {
    await memberProject.$leave()
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

  t.ok(
    await Promise.all([
      creatorProject.$member.getById(coordinator.deviceId),
      coordinatorProject.$member.getById(creator.deviceId),
    ]),
    'coordinator successfully added'
  )

  await creatorProject.$leave()

  t.alike(
    await creatorProject.$getOwnCapabilities(),
    DEFAULT_CAPABILITIES[LEFT_ROLE_ID],
    'creator now has LEFT role id and capabilities'
  )

  await waitForSync(projects, 'initial')

  t.is(
    (await coordinatorProject.$member.getById(creator.deviceId)).capabilities,
    DEFAULT_CAPABILITIES[LEFT_ROLE_ID],
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

  t.ok(
    await Promise.all([
      creatorProject.$member.getById(member.deviceId),
      memberProject.$member.getById(creator.deviceId),
    ]),
    'member successfully added'
  )

  await memberProject.$leave()

  t.alike(
    await memberProject.$getOwnCapabilities(),
    DEFAULT_CAPABILITIES[LEFT_ROLE_ID],
    'member now has LEFT role id and capabilities'
  )

  await waitForSync(projects, 'initial')

  t.is(
    (await creatorProject.$member.getById(member.deviceId)).capabilities,
    DEFAULT_CAPABILITIES[LEFT_ROLE_ID],
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

  await Promise.all([coordinatorProject.$leave(), memberProject.$leave()])

  await waitForSync(projects, 'initial')

  await t.exception(async () => {
    await memberProject.observation.create({
      schemaName: 'observation',
      attachments: [],
      tags: {},
      refs: [],
      metadata: {},
    })
  }, 'member cannot create new data after leaving')

  t.alike(
    await memberProject.$getProjectSettings(),
    MapeoProject.EMPTY_PROJECT_SETTINGS,
    'Member getting project settings return empty value'
  )

  t.alike(
    await coordinatorProject.$getProjectSettings(),
    MapeoProject.EMPTY_PROJECT_SETTINGS,
    'Coordinator getting project settings return empty value'
  )

  await t.exception(async () => {
    await coordinatorProject.$setProjectSettings({ name: 'foo' })
  }, 'coordinator cannot update project settings after leaving')

  await disconnectPeers(managers)
})
