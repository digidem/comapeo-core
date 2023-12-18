// @ts-check
import { test } from 'brittle'
import { randomBytes } from 'crypto'

import {
  COORDINATOR_ROLE_ID,
  CREATOR_CAPABILITIES,
  DEFAULT_CAPABILITIES,
  MEMBER_ROLE_ID,
  NO_ROLE_CAPABILITIES,
} from '../src/capabilities.js'
import {
  connectPeers,
  createManagers,
  disconnectPeers,
  invite,
  waitForPeers,
} from './utils.js'

test('getting yourself after creating project', async (t) => {
  const [manager] = await createManagers(1, t)

  const deviceInfo = await manager.getDeviceInfo()
  const project = await manager.getProject(await manager.createProject())

  const me = await project.$member.getById(project.deviceId)

  t.alike(
    me,
    {
      deviceId: project.deviceId,
      name: deviceInfo.name,
      capabilities: CREATOR_CAPABILITIES,
    },
    'has expected member info with creator capabilities'
  )

  const members = await project.$member.getMany()

  t.is(members.length, 1)
  t.alike(
    members[0],
    {
      deviceId: project.deviceId,
      name: deviceInfo.name,
      capabilities: CREATOR_CAPABILITIES,
    },
    'has expected member info with creator capabilities'
  )
})

test('getting yourself after adding project (but not yet synced)', async (t) => {
  const [manager] = await createManagers(1, t)

  const deviceInfo = await manager.getDeviceInfo()
  const project = await manager.getProject(
    await manager.addProject(
      {
        projectKey: randomBytes(32),
        encryptionKeys: { auth: randomBytes(32) },
      },
      { waitForSync: false }
    )
  )

  const me = await project.$member.getById(project.deviceId)

  t.alike(
    me,
    {
      deviceId: project.deviceId,
      name: deviceInfo.name,
      capabilities: NO_ROLE_CAPABILITIES,
    },
    'has expected member info with no role capabilities'
  )

  const members = await project.$member.getMany()

  t.is(members.length, 1)
  t.alike(
    members[0],
    {
      deviceId: project.deviceId,
      name: deviceInfo.name,
      capabilities: NO_ROLE_CAPABILITIES,
    },
    'has expected member info with no role capabilities'
  )
})

test('getting invited member after invite rejected', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
    reject: true,
  })

  await t.exception(
    () => project.$member.getById(invitee.deviceId),
    'invited member cannot be retrieved'
  )

  const members = await project.$member.getMany()

  t.is(members.length, 1)
  t.absent(
    members.find((m) => m.deviceId === invitee.deviceId),
    'invited member not found'
  )
  await disconnectPeers(managers)
})

test('getting invited member after invite accepted', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const { name: inviteeName } = await invitee.getDeviceInfo()
  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
    roleId: MEMBER_ROLE_ID,
  })

  const members = await project.$member.getMany()

  t.is(members.length, 2)

  const invitedMember = members.find((m) => m.deviceId === invitee.deviceId)

  t.alike(
    invitedMember,
    {
      deviceId: invitee.deviceId,
      name: inviteeName,
      capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    },
    'has expected member info with member capabilities'
  )

  // TODO: Test that device info of invited member can be read from invitor after syncing
  await disconnectPeers(managers)
})

test('invite uses custom role name when provided', async (t) => {
  t.plan(1)
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })

  invitee.invite.on('invite-received', ({ roleName }) => {
    t.is(roleName, 'friend', 'roleName should be equal')
  })

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
    roleName: 'friend',
    reject: true,
  })

  await disconnectPeers(managers)
})

test('invite uses default role name when not provided', async (t) => {
  t.plan(1)
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })

  invitee.invite.on('invite-received', ({ roleName }) => {
    t.is(
      roleName,
      DEFAULT_CAPABILITIES[MEMBER_ROLE_ID].name,
      '`roleName` should use the fallback by deriving `roleId`'
    )
  })

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
    reject: true,
  })

  await disconnectPeers(managers)
})

test('capabilities - creator capabilities and role assignment', async (t) => {
  const [manager] = await createManagers(1, t)

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities,
    CREATOR_CAPABILITIES,
    'Project creator has creator capabilities'
  )

  const deviceId = randomBytes(32).toString('hex')
  await project.$member.assignRole(deviceId, MEMBER_ROLE_ID)

  const member = await project.$member.getById(deviceId)

  t.alike(
    member.capabilities,
    DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    'Can assign capabilities to device'
  )
})

test('capabilities - new device without capabilities', async (t) => {
  const [manager] = await createManagers(1, t)

  const projectId = await manager.addProject(
    {
      projectKey: randomBytes(32),
      encryptionKeys: { auth: randomBytes(32) },
    },
    { waitForSync: false }
  )

  const project = await manager.getProject(projectId)

  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities.sync,
    {
      auth: 'allowed',
      config: 'allowed',
      data: 'blocked',
      blobIndex: 'blocked',
      blob: 'blocked',
    },
    'A new device before sync can sync auth and config namespaces, but not other namespaces'
  )
  await t.exception(async () => {
    const deviceId = randomBytes(32).toString('hex')
    await project.$member.assignRole(deviceId, MEMBER_ROLE_ID)
  }, 'Trying to assign a role without capabilities throws an error')
})

test('capabilities - getMany() on invitor device', async (t) => {
  const [manager] = await createManagers(1, t)

  const creatorDeviceId = manager.deviceId

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)
  const ownCapabilities = await project.$getOwnCapabilities()

  t.alike(
    ownCapabilities,
    CREATOR_CAPABILITIES,
    'Project creator has creator capabilities'
  )

  const deviceId1 = randomBytes(32).toString('hex')
  const deviceId2 = randomBytes(32).toString('hex')
  await project.$member.assignRole(deviceId1, MEMBER_ROLE_ID)
  await project.$member.assignRole(deviceId2, COORDINATOR_ROLE_ID)

  const expected = {
    [deviceId1]: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
    [deviceId2]: DEFAULT_CAPABILITIES[COORDINATOR_ROLE_ID],
    [creatorDeviceId]: CREATOR_CAPABILITIES,
  }

  const allMembers = await project.$member.getMany()

  /** @type {Record<string, import('../src/capabilities.js').Capability>} */
  const allMembersCapabilities = {}

  for (const member of allMembers) {
    allMembersCapabilities[member.deviceId] = member.capabilities
  }

  t.alike(allMembersCapabilities, expected, 'expected capabilities')
})

test('capabilities - getMany() on newly invited device before sync', async (t) => {
  const [manager] = await createManagers(1, t)

  const deviceId = manager.deviceId

  const projectId = await manager.addProject(
    {
      projectKey: randomBytes(32),
      encryptionKeys: { auth: randomBytes(32) },
    },
    { waitForSync: false }
  )
  const project = await manager.getProject(projectId)

  const expected = { [deviceId]: NO_ROLE_CAPABILITIES }

  const allMembers = await project.$member.getMany()

  /** @type {Record<string, import('../src/capabilities.js').Capability>} */
  const allMembersCapabilities = {}

  for (const member of allMembers) {
    allMembersCapabilities[member.deviceId] = member.capabilities
  }

  t.alike(allMembersCapabilities, expected, 'expected capabilities')
})
