import { test, skip } from 'brittle'
import { COORDINATOR_ROLE_ID, MEMBER_ROLE_ID } from '../src/capabilities.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { once } from 'node:events'
import {
  connectPeers,
  createManagers,
  disconnectPeers,
  waitForPeers,
} from './utils.js'

test('member invite accepted', async (t) => {
  const [creator, joiner] = await createManagers(2)
  connectPeers([creator, joiner])
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')
  t.is(invite.projectId, createdProjectId, 'projectId of invite matches')
  t.is(invite.peerId, creator.deviceId, 'deviceId of invite matches')
  t.is(invite.projectName, 'Mapeo', 'project name of invite matches')

  await joiner.invite.accept(invite.projectId)

  t.is(
    await responsePromise,
    InviteResponse_Decision.ACCEPT,
    'correct invite response'
  )

  /// After invite flow has completed...

  t.alike(
    await joiner.listProjects(),
    await creator.listProjects(),
    'project info recorded in joiner successfully'
  )

  const joinerProject = await joiner.getProject(createdProjectId)

  t.alike(
    await joinerProject.$getProjectSettings(),
    await creatorProject.$getProjectSettings(),
    'Project settings match'
  )

  t.alike(
    await creatorProject.$member.getMany(),
    await joinerProject.$member.getMany(),
    'Project members match'
  )

  await disconnectPeers([creator, joiner])
})

test('chain of invites', async (t) => {
  const managers = await createManagers(4)
  const [creator, ...joiners] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })

  let invitor = creator
  for (const joiner of joiners) {
    const invitorProject = await invitor.getProject(createdProjectId)
    const responsePromise = invitorProject.$member.invite(joiner.deviceId, {
      roleId: COORDINATOR_ROLE_ID,
    })
    const [invite] = await once(joiner.invite, 'invite-received')
    await joiner.invite.accept(invite.projectId)
    t.is(
      await responsePromise,
      InviteResponse_Decision.ACCEPT,
      'correct invite response'
    )
  }

  /// After invite flow has completed...

  const creatorProject = await creator.getProject(createdProjectId)
  const expectedProjectSettings = await creatorProject.$getProjectSettings()
  const expectedMembers = await creatorProject.$member.getMany()

  for (const joiner of joiners) {
    const joinerProject = await joiner.getProject(createdProjectId)

    t.alike(
      await joinerProject.$getProjectSettings(),
      expectedProjectSettings,
      'Project settings match'
    )

    const joinerMembers = await joinerProject.$member.getMany()
    t.alike(
      joinerMembers.sort(memberSort),
      expectedMembers.sort(memberSort),
      'Project members match'
    )
  }

  await disconnectPeers(managers)
})

// TODO: Needs fix to inviteApi to check capabilities before sending invite
skip("member can't invite", async (t) => {
  const managers = await createManagers(3)
  const [creator, member, joiner] = managers
  connectPeers(managers)
  await waitForPeers(managers)

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const responsePromise = creatorProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(member.invite, 'invite-received')
  await member.invite.accept(invite.projectId)
  await responsePromise

  /// After invite flow has completed...

  const memberProject = await member.getProject(createdProjectId)

  t.alike(
    await memberProject.$getProjectSettings(),
    await creatorProject.$getProjectSettings(),
    'Project settings match'
  )

  const exceptionPromise = t.exception(() =>
    memberProject.$member.invite(joiner.deviceId, { roleId: MEMBER_ROLE_ID })
  )
  joiner.invite.once('invite-received', () => t.fail('should not send invite'))
  await exceptionPromise

  await disconnectPeers(managers)
})

test('member invite rejected', async (t) => {
  const [creator, joiner] = await createManagers(2)
  connectPeers([creator, joiner])
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')
  t.is(invite.projectId, createdProjectId, 'projectId of invite matches')
  t.is(invite.peerId, creator.deviceId, 'deviceId of invite matches')
  t.is(invite.projectName, 'Mapeo', 'project name of invite matches')

  await joiner.invite.reject(invite.projectId)

  t.is(
    await responsePromise,
    InviteResponse_Decision.REJECT,
    'correct invite response'
  )

  /// After invite flow has completed...

  const joinerListedProjects = await joiner.listProjects()

  t.is(joinerListedProjects.length, 0, 'project not added to joiner')

  await t.exception(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance'
  )

  t.is(
    (await creatorProject.$member.getMany()).length,
    1,
    'Only 1 member in project still'
  )

  await disconnectPeers([creator, joiner])
})

/**
 * @param {import('../src/member-api.js').MemberInfo} a
 * @param {import('../src/member-api.js').MemberInfo} b
 */
function memberSort(a, b) {
  if (a.deviceId < b.deviceId) return -1
  if (a.deviceId > b.deviceId) return 1
  return 0
}
