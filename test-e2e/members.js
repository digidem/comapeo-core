import { test } from 'brittle'
import RAM from 'random-access-memory'
import { KeyManager } from '@mapeo/crypto'
import pDefer from 'p-defer'
import { randomBytes } from 'crypto'

import { MapeoManager, kRPC } from '../src/mapeo-manager.js'
import {
  CREATOR_CAPABILITIES,
  DEFAULT_CAPABILITIES,
  MEMBER_ROLE_ID,
  NO_ROLE_CAPABILITIES,
} from '../src/capabilities.js'
import { replicate } from '../tests/helpers/rpc.js'

test('getting yourself after creating project', async (t) => {
  const { manager } = setup()

  await manager.setDeviceInfo({ name: 'mapeo' })
  const project = await manager.getProject(await manager.createProject())
  await project.ready()

  const me = await project.$member.getById(project.deviceId)

  t.alike(
    me,
    {
      deviceId: project.deviceId,
      name: 'mapeo',
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
      name: 'mapeo',
      capabilities: CREATOR_CAPABILITIES,
    },
    'has expected member info with creator capabilities'
  )
})

test('getting yourself after being invited to project (but not yet synced)', async (t) => {
  const { manager } = setup()

  await manager.setDeviceInfo({ name: 'mapeo' })
  const project = await manager.getProject(
    await manager.addProject({
      projectKey: randomBytes(32),
      encryptionKeys: { auth: randomBytes(32) },
    })
  )
  await project.ready()

  const me = await project.$member.getById(project.deviceId)

  t.alike(
    me,
    {
      deviceId: project.deviceId,
      name: 'mapeo',
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
      name: 'mapeo',
      capabilities: NO_ROLE_CAPABILITIES,
    },
    'has expected member info with no role capabilities'
  )
})

test('getting invited member after invite rejected', async (t) => {
  const { manager, simulateMemberInvite } = setup()

  await manager.setDeviceInfo({ name: 'mapeo' })
  const project = await manager.getProject(await manager.createProject())
  await project.ready()

  const invitedDeviceId = await simulateMemberInvite(project, 'reject', {
    deviceInfo: { name: 'member' },
    roleId: MEMBER_ROLE_ID,
  })

  await t.exception(
    () => project.$member.getById(invitedDeviceId),
    'invited member cannot be retrieved'
  )

  const members = await project.$member.getMany()

  t.is(members.length, 1)
  t.absent(
    members.find((m) => m.deviceId === invitedDeviceId),
    'invited member not found'
  )
})

test('getting invited member after invite accepted', async (t) => {
  const { manager, simulateMemberInvite } = setup()

  await manager.setDeviceInfo({ name: 'mapeo' })
  const project = await manager.getProject(await manager.createProject())
  await project.ready()

  const invitedDeviceId = await simulateMemberInvite(project, 'accept', {
    deviceInfo: { name: 'member' },
    roleId: MEMBER_ROLE_ID,
  })

  // Before syncing
  {
    const invitedMember = await project.$member.getById(invitedDeviceId)

    t.alike(
      invitedMember,
      {
        deviceId: invitedDeviceId,
        capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
      },
      'has expected member info with member capabilities'
    )
  }

  {
    const members = await project.$member.getMany()

    t.is(members.length, 2)

    const invitedMember = members.find((m) => m.deviceId === invitedDeviceId)

    t.alike(
      invitedMember,
      {
        deviceId: invitedDeviceId,
        capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
      },
      'has expected member info with member capabilities'
    )
  }

  // TODO: Test that device info of invited member can be read from invitor after syncing
})

function setup() {
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  /**
   *
   * @param {import('../src/mapeo-project.js').MapeoProject} project
   * @param {'accept' | 'reject'} respondWith
   * @param {{ deviceInfo: import('../src/generated/rpc.js').DeviceInfo, roleId: import('../src/capabilities.js').RoleId }} mocked
   *
   */
  async function simulateMemberInvite(
    project,
    respondWith,
    { deviceInfo, roleId }
  ) {
    /** @type {import('p-defer').DeferredPromise<string>} */
    const deferred = pDefer()

    const otherManager = new MapeoManager({
      rootKey: KeyManager.generateRootKey(),
      dbFolder: ':memory:',
      coreStorage: () => new RAM(),
    })

    await otherManager.setDeviceInfo(deviceInfo)

    otherManager.invite.on('invite-received', ({ projectId }) => {
      otherManager.invite[respondWith](projectId).catch(deferred.reject)
    })

    manager[kRPC].on('peers', (peers) => {
      const deviceId = peers[0].deviceId
      project.$member
        .invite(deviceId, { roleId })
        .then(() => deferred.resolve(deviceId))
        .catch(deferred.reject)
    })

    replicate(manager[kRPC], otherManager[kRPC])

    return deferred.promise
  }

  return { manager, simulateMemberInvite }
}
