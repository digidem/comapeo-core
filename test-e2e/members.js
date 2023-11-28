// @ts-check
import { test } from 'brittle'
import { randomBytes } from 'crypto'

import {
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
  const [manager] = await createManagers(1)

  const deviceInfo = await manager.getDeviceInfo()
  const project = await manager.getProject(await manager.createProject())
  await project.ready()

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
  const [manager] = await createManagers(1)

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
  await project.ready()

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
  const managers = await createManagers(2)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const projectId = await invitor.createProject()
  const project = await invitor.getProject(projectId)
  await project.ready()

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
  const managers = await createManagers(2)
  const [invitor, invitee] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const { name: inviteeName } = await invitee.getDeviceInfo()
  const projectId = await invitor.createProject()
  const project = await invitor.getProject(projectId)
  await project.ready()

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
