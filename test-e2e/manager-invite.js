import test from 'node:test'
import assert from 'node:assert/strict'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { once } from 'node:events'
import { connectPeers, createManagers, waitForPeers } from './utils.js'
import { roles } from '../src/index.js'

const { COORDINATOR_ROLE_ID, MEMBER_ROLE_ID } = roles

test('member invite accepted', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await assert.rejects(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')
  assert.equal(typeof invite.inviteId, 'string', 'inviteId is string')
  assert(
    Buffer.from(invite.inviteId, 'hex').byteLength >= 32,
    'inviteId has at least 256 bits of entropy'
  )
  assert.equal(invite.projectName, 'Mapeo', 'project name of invite matches')

  const acceptResult = await joiner.invite.accept(invite)

  assert.equal(
    await responsePromise,
    InviteResponse_Decision.ACCEPT,
    'correct invite response'
  )
  assert.equal(acceptResult, createdProjectId, 'accept returns invite ID')

  /// After invite flow has completed...

  assert.deepEqual(
    await joiner.listProjects(),
    await creator.listProjects(),
    'project info recorded in joiner successfully'
  )

  const joinerProject = await joiner.getProject(createdProjectId)

  assert.deepEqual(
    await joinerProject.$getProjectSettings(),
    await creatorProject.$getProjectSettings(),
    'Project settings match'
  )

  assert.deepEqual(
    await creatorProject.$member.getMany(),
    await joinerProject.$member.getMany(),
    'Project members match'
  )
})

test('chain of invites', async (t) => {
  const managers = await createManagers(4, t)
  const [creator, ...joiners] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })

  const invitor = creator
  for (const joiner of joiners) {
    const invitorProject = await invitor.getProject(createdProjectId)
    const responsePromise = invitorProject.$member.invite(joiner.deviceId, {
      roleId: COORDINATOR_ROLE_ID,
    })
    const [invite] = await once(joiner.invite, 'invite-received')
    const acceptResult = await joiner.invite.accept(invite)
    assert.equal(acceptResult, createdProjectId, 'accept returns invite ID')
    assert.equal(
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

    assert.deepEqual(
      await joinerProject.$getProjectSettings(),
      expectedProjectSettings,
      'Project settings match'
    )

    const joinerMembers = await joinerProject.$member.getMany()
    assert.deepEqual(
      joinerMembers.sort(memberSort),
      expectedMembers.sort(memberSort),
      'Project members match'
    )
  }
})

test('generates new invite IDs for each invite', async (t) => {
  const inviteCount = 10

  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  /** @type {Array<string>} */
  const inviteIds = []

  for (let i = 0; i < inviteCount; i++) {
    const inviteReceivedPromise = once(joiner.invite, 'invite-received')
    const invitePromise = creatorProject.$member.invite(joiner.deviceId, {
      roleId: MEMBER_ROLE_ID,
    })
    const [invite] = await inviteReceivedPromise
    inviteIds.push(invite.inviteId)
    await joiner.invite.reject(invite)
    await invitePromise
  }

  assert.equal(
    new Set(inviteIds).size,
    inviteCount,
    `got ${inviteCount} unique invite IDs`
  )
})

// TODO: Needs fix to inviteApi to check role before sending invite
test("member can't invite", { skip: true }, async (t) => {
  const managers = await createManagers(3, t)
  const [creator, member, joiner] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const responsePromise = creatorProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(member.invite, 'invite-received')
  await member.invite.accept(invite)
  await responsePromise

  /// After invite flow has completed...

  const memberProject = await member.getProject(createdProjectId)

  assert.deepEqual(
    await memberProject.$getProjectSettings(),
    await creatorProject.$getProjectSettings(),
    'Project settings match'
  )

  const exceptionPromise = assert.throws(() =>
    memberProject.$member.invite(joiner.deviceId, {
      roleId: MEMBER_ROLE_ID,
    })
  )
  joiner.invite.once('invite-received', () =>
    assert.fail('should not send invite')
  )
  await exceptionPromise
})

test('member invite rejected', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  await assert.rejects(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')

  await joiner.invite.reject(invite)

  assert.equal(
    await responsePromise,
    InviteResponse_Decision.REJECT,
    'correct invite response'
  )

  /// After invite flow has completed...

  const joinerListedProjects = await joiner.listProjects()

  assert.equal(joinerListedProjects.length, 0, 'project not added to joiner')

  await assert.rejects(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance'
  )

  assert.equal(
    (await creatorProject.$member.getMany()).length,
    1,
    'Only 1 member in project still'
  )
})

test('cancelation', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const inviteReceivedPromise = once(joiner.invite, 'invite-received')
  const inviteRemovedPromise = once(joiner.invite, 'invite-removed')

  const invitePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const inviteAbortedAssertionPromise = assert.rejects(
    invitePromise,
    {
      message: /Invite aborted/,
    },
    'should throw after being aborted'
  )

  const [invite] = await inviteReceivedPromise

  creatorProject.$member.requestCancelInvite(joiner.deviceId)
  await inviteAbortedAssertionPromise

  const [canceledInvite, removalReason] = await inviteRemovedPromise

  assert.deepEqual(
    invite.inviteId,
    canceledInvite.inviteId,
    'removed invite has correct ID'
  )
  assert.equal(removalReason, 'canceled')
})

test('canceling nothing', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  assert.doesNotThrow(() => {
    creatorProject.$member.requestCancelInvite(joiner.deviceId)
    creatorProject.$member.requestCancelInvite(joiner.deviceId)
    creatorProject.$member.requestCancelInvite(joiner.deviceId)
  })
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
