import { test } from 'brittle'
import RAM from 'random-access-memory'
import { KeyManager } from '@mapeo/crypto'
import pDefer from 'p-defer'

import { MapeoManager, kRPC } from '../src/mapeo-manager.js'
import {
  CREATOR_CAPABILITIES,
  DEFAULT_CAPABILITIES,
  MEMBER_ROLE_ID,
} from '../src/capabilities.js'
import { replicate } from '../tests/helpers/rpc.js'

test('getting yourself', async (t) => {
  const { manager } = setup()

  await manager.setDeviceInfo({ name: 'mapeo' })
  const project = await manager.getProject(await manager.createProject())
  await project.ready()

  const me = await project.$member.getById(project.deviceId)

  t.alike(me, {
    deviceId: project.deviceId,
    name: 'mapeo',
    capabilities: CREATOR_CAPABILITIES,
  })

  const members = await project.$member.getMany()

  t.is(members.length, 1)

  t.alike(members[0], me)
})

// TODO: Fails. Needs MemberApi.invite() to be updated to write device info record of invited peer
test('getting others after invite', { todo: true }, async (t) => {
  t.test('when invite rejected', async (st) => {
    const { manager, simulateMemberInvite } = setup()

    await manager.setDeviceInfo({ name: 'mapeo' })
    const project = await manager.getProject(await manager.createProject())
    await project.ready()

    const invitedDeviceId = await simulateMemberInvite(project, 'reject', {
      deviceInfo: { name: 'member' },
      roleId: MEMBER_ROLE_ID,
    })

    await st.exception(() => project.$member.getById(invitedDeviceId))

    const members = await project.$member.getMany()

    st.is(members.length, 1)
    st.absent(members.find((m) => m.deviceId === invitedDeviceId))
  })

  t.test('when invite accepted', { todo: true }, async (st) => {
    const { manager, simulateMemberInvite } = setup()

    await manager.setDeviceInfo({ name: 'mapeo' })
    const project = await manager.getProject(await manager.createProject())
    await project.ready()

    const invitedDeviceId = await simulateMemberInvite(project, 'accept', {
      deviceInfo: { name: 'member' },
      roleId: MEMBER_ROLE_ID,
    })

    {
      const member = await project.$member.getById(invitedDeviceId)

      st.alike(member, {
        deviceId: invitedDeviceId,
        name: 'member',
        capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
      })
    }

    {
      const members = await project.$member.getMany()

      st.is(members.length, 2)

      const member = members.find((m) => m.deviceId === invitedDeviceId)

      st.alike(member, {
        deviceId: invitedDeviceId,
        name: 'member',
        capabilities: DEFAULT_CAPABILITIES[MEMBER_ROLE_ID],
      })
    }
  })
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
      const deviceId = peers[0].id
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
