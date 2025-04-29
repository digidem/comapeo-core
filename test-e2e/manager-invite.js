import test from 'node:test'
import assert from 'node:assert/strict'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { once } from 'node:events'
import { connectPeers, createManagers, waitForPeers } from './utils.js'
import { roles } from '../src/index.js'
import { pEvent } from 'p-event'
import FakeTimers from '@sinonjs/fake-timers'
import { randomBytes } from 'node:crypto'
import { noop } from '../src/utils.js'

const { COORDINATOR_ROLE_ID, CREATOR_ROLE_ID, MEMBER_ROLE_ID } = roles

test('member invite accepted & invite states', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const creatorProject = await creator.getProject(createdProjectId)

  await assert.rejects(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )
  const inviteStates = new Set()
  const expectedInviteStates = ['responding', 'joining', 'joined']
  joiner.invite.on('invite-updated', (invite) => {
    inviteStates.add(invite.state)
  })

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const invite = await pEvent(joiner.invite, 'invite-received')
  assert.equal(invite.state, 'pending', 'invite is in pending state')
  assert.equal(typeof invite.inviteId, 'string', 'inviteId is string')
  assert(
    Buffer.from(invite.inviteId, 'hex').byteLength >= 32,
    'inviteId has at least 256 bits of entropy'
  )
  assert.equal(invite.projectName, 'Mapeo', 'project name of invite matches')
  assert.equal(
    invite.projectColor,
    '#123456',
    'project color of invite matches'
  )
  assert.equal(
    invite.projectDescription,
    'fun project',
    'project description of invite matches'
  )

  const acceptPromise = joiner.invite.accept(invite)

  const inviteJoining = await pEvent(
    joiner.invite,
    'invite-updated',
    (invite) => invite.state === 'joining'
  )
  assert.equal(inviteJoining.state, 'joining', 'invite is now in joining state')

  const acceptResult = await acceptPromise

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

  assert.deepEqual(
    joiner.invite.getMany(),
    [{ ...invite, state: 'joined' }],
    'Invite is now in joined state'
  )

  assert.deepEqual(
    [...inviteStates],
    expectedInviteStates,
    'invite was updated with expected states'
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
    const invite = await pEvent(joiner.invite, 'invite-received')
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

    assert.deepEqual(
      joiner.invite.getMany().map((i) => i.state),
      ['joined'],
      'Invite is now in joined state'
    )
  }
})

test('Two invites to same project, accepting first responds "already" to other', async (t) => {
  const managers = await createManagers(3, t)
  const [creator, coord, member] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  // Test setup: add coordinator to the project
  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)
  creatorProject.$member.invite(coord.deviceId, {
    roleId: COORDINATOR_ROLE_ID,
  })
  const invite = await pEvent(coord.invite, 'invite-received')
  await coord.invite.accept(invite)
  const coordProject = await coord.getProject(createdProjectId)

  const creatorInvitePromise = creatorProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const receivedCreatorInvite = await pEvent(member.invite, 'invite-received')
  const coordInvitePromise = coordProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const receivedCoordInvite = await pEvent(member.invite, 'invite-received')

  assert.equal(member.invite.getMany().length, 2, 'member has two invites')
  assert.ok(
    member.invite.getMany().every((i) => i.state === 'pending'),
    'both invites are pending'
  )

  const acceptResult = await member.invite.accept(receivedCreatorInvite)
  assert.equal(acceptResult, createdProjectId, 'accept returns project ID')

  assert.equal(
    member.invite.getById(receivedCreatorInvite.inviteId).state,
    'joined'
  )
  assert.equal(
    member.invite.getById(receivedCoordInvite.inviteId).state,
    'respondedAlready'
  )

  assert.equal(
    await creatorInvitePromise,
    'ACCEPT',
    'Expected response to invite on invitor'
  )
  assert.equal(
    await coordInvitePromise,
    'ALREADY',
    'Expected response to invite on invitor'
  )
})

test('Two invites to same project, accepting second responds "already" to other', async (t) => {
  const managers = await createManagers(3, t)
  const [creator, coord, member] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)
  await waitForPeers(managers)

  // Test setup: add coordinator to the project
  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)
  creatorProject.$member.invite(coord.deviceId, {
    roleId: COORDINATOR_ROLE_ID,
  })
  const invite = await pEvent(coord.invite, 'invite-received')
  await coord.invite.accept(invite)
  const coordProject = await coord.getProject(createdProjectId)

  const creatorInvitePromise = creatorProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const receivedCreatorInvite = await pEvent(member.invite, 'invite-received')
  const coordInvitePromise = coordProject.$member.invite(member.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const receivedCoordInvite = await pEvent(member.invite, 'invite-received')

  assert.equal(member.invite.getMany().length, 2, 'member has two invites')
  assert.ok(
    member.invite.getMany().every((i) => i.state === 'pending'),
    'both invites are pending'
  )

  const acceptResult = await member.invite.accept(receivedCoordInvite)
  assert.equal(acceptResult, createdProjectId, 'accept returns project ID')

  assert.equal(
    member.invite.getById(receivedCreatorInvite.inviteId).state,
    'respondedAlready'
  )
  assert.equal(
    member.invite.getById(receivedCoordInvite.inviteId).state,
    'joined'
  )

  assert.equal(
    await creatorInvitePromise,
    'ALREADY',
    'Expected response to invite on invitor'
  )
  assert.equal(
    await coordInvitePromise,
    'ACCEPT',
    'Expected response to invite on invitor'
  )
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

  const inviteStates = new Set()
  const expectedInviteStates = ['responding', 'rejected']
  joiner.invite.on('invite-updated', (invite) => {
    inviteStates.add(invite.state)
  })

  await assert.rejects(
    async () => joiner.getProject(createdProjectId),
    'joiner cannot get project instance before being invited and added to project'
  )

  const responsePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const [invite] = await once(joiner.invite, 'invite-received')

  const onInviteUpdated = pEvent(joiner.invite, 'invite-updated', (invite) =>
    ['rejected', 'error'].includes(invite.state)
  )

  await joiner.invite.reject(invite)

  await onInviteUpdated

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

  assert.deepEqual(
    joiner.invite.getMany(),
    [{ ...invite, state: 'rejected' }],
    'Invite is in rejected state'
  )

  assert.deepEqual(
    [...inviteStates],
    expectedInviteStates,
    'invite was updated with expected states'
  )
})

test('cancelation (before response)', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const inviteStates = new Set()
  const expectedInviteStates = ['canceled']
  joiner.invite.on('invite-updated', (invite) => {
    inviteStates.add(invite.state)
  })

  const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const inviteCanceledPromise = pEvent(
    joiner.invite,
    'invite-updated',
    (invite) => invite.state === 'canceled'
  )

  const invitePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const inviteAbortedAssertionPromise = assert.rejects(
    invitePromise,
    {
      message: /Invite Aborted/,
      name: 'InviteAbortedError',
    },
    'should throw after being aborted'
  )

  const invite = await inviteReceivedPromise

  creatorProject.$member.requestCancelInvite(joiner.deviceId)
  await inviteAbortedAssertionPromise

  const canceledInvite = await inviteCanceledPromise

  assert.deepEqual(
    invite.inviteId,
    canceledInvite.inviteId,
    'removed invite has correct ID'
  )
  assert.equal(canceledInvite.state, 'canceled')
  assert.deepEqual(
    [...inviteStates],
    expectedInviteStates,
    'invite was updated with expected states'
  )
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

test('canceling, then re-inviting', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const invite1ReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const invite1Promise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const invite1AbortedPromise = assert.rejects(invite1Promise)
  const invite1 = await invite1ReceivedPromise
  creatorProject.$member.requestCancelInvite(joiner.deviceId)
  await invite1AbortedPromise

  assert.deepEqual(
    await joiner.listProjects(),
    [],
    "joiner doesn't have project yet"
  )

  const invite2Promise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const invite2 = await pEvent(joiner.invite, 'invite-received')
  await joiner.invite.accept(invite2)

  assert.equal(
    await invite2Promise,
    InviteResponse_Decision.ACCEPT,
    'correct invite response'
  )
  assert.deepEqual(
    await joiner.listProjects(),
    await creator.listProjects(),
    'project info recorded in joiner successfully'
  )
  assert.deepEqual(
    joiner.invite.getMany(),
    [
      { ...invite1, state: 'canceled' },
      { ...invite2, state: 'joined' },
    ],
    'Canceled and joined invites in state'
  )
})

test('rejecting, then accepting', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(disconnectPeers)
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const invite1ReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const invite1Promise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const invite1 = await invite1ReceivedPromise
  await joiner.invite.reject(invite1)
  assert.equal(
    await invite1Promise,
    InviteResponse_Decision.REJECT,
    'correct response for invite 1'
  )

  assert.deepEqual(
    await joiner.listProjects(),
    [],
    "joiner doesn't have project yet"
  )

  const invite2ReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const invite2Promise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  const invite2 = await invite2ReceivedPromise
  await joiner.invite.accept(invite2)

  assert.equal(
    await invite2Promise,
    InviteResponse_Decision.ACCEPT,
    'correct invite response'
  )
  assert.deepEqual(
    await joiner.listProjects(),
    await creator.listProjects(),
    'project info recorded in joiner successfully'
  )
  assert.deepEqual(
    joiner.invite.getMany(),
    [
      { ...invite1, state: 'rejected' },
      { ...invite2, state: 'joined' },
    ],
    'Rejected and joined invites in state'
  )
})

test('disconnect before invite accept', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(() => disconnectPeers())
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const invitePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  let inviteHasResolved = false
  invitePromise
    .then(() => {
      inviteHasResolved = true
    })
    .catch(() => {})
  const invite = await inviteReceivedPromise
  await disconnectPeers()
  await assert.rejects(
    () => joiner.invite.accept(invite),
    {
      name: 'PeerDisconnectedError',
      message: 'Peer disconnected before sending invite response',
    },
    'accepting invite rejects when peer is disconnected'
  )
  assert.equal(
    joiner.invite.getById(invite.inviteId).state,
    'error',
    'Invite ends in error state'
  )
  assert(!inviteHasResolved, 'invite promise has not resolved')
  creatorProject.$member.requestCancelInvite(joiner.deviceId)
  await assert.rejects(
    invitePromise,
    {
      name: 'InviteAbortedError',
      message: 'Invite Aborted',
    },
    'invite promise rejects after being aborted'
  )
})

// TODO: It's not possible in e2e tests to disconnect peers at the right moment.
// This test is flaky, and sometimes the project details are sent before the
// peers disconnect, so can't expect specific errors.
test('disconnect before sending project join details', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(() => disconnectPeers())
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
  const invitePromise = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  // Specific error can be different due to race conditions
  const assertInviteRejectsPromise = assert.rejects(
    invitePromise,
    'invite promise rejects when peer disconnects'
  )
  const invite = await inviteReceivedPromise
  const assertAcceptRejectsPromise = assert.rejects(
    () => joiner.invite.accept(invite),
    'accepting invite rejects when project details are not received'
  )
  await disconnectPeers()
  // Run down the timeout waiting for project details
  clock.runAll()
  await Promise.all([assertInviteRejectsPromise, assertAcceptRejectsPromise])

  const members = (await creatorProject.$member.getMany()).filter(({ role }) =>
    // @ts-ignore - TS2345
    [MEMBER_ROLE_ID, COORDINATOR_ROLE_ID, CREATOR_ROLE_ID].includes(role.roleId)
  )

  assert.equal(members.length, 1, 'Member did not get added after fail')

  const disconnectPeers2 = connectPeers([creator, joiner])
  t.after(() => disconnectPeers2())
  await waitForPeers([creator, joiner])

  const inviteReceivedPromise2 = pEvent(joiner.invite, 'invite-received')
  const invitePromise2 = creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })

  const invite2 = await inviteReceivedPromise2
  await joiner.invite.accept(invite2)

  await invitePromise2

  const members2 = (await creatorProject.$member.getMany()).filter(({ role }) =>
    // @ts-ignore - TS2345
    [MEMBER_ROLE_ID, COORDINATOR_ROLE_ID, CREATOR_ROLE_ID].includes(role.roleId)
  )

  assert.equal(members2.length, 2, 'Member got added after retry')
})

test('Attempting to accept unknown inviteId throws', async (t) => {
  const [creator, joiner] = await createManagers(2, t)
  const disconnectPeers = connectPeers([creator, joiner])
  t.after(() => disconnectPeers())
  await waitForPeers([creator, joiner])

  const createdProjectId = await creator.createProject({ name: 'Mapeo' })
  const creatorProject = await creator.getProject(createdProjectId)

  const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
  creatorProject.$member.invite(joiner.deviceId, {
    roleId: MEMBER_ROLE_ID,
  })
  await inviteReceivedPromise
  await assert.rejects(
    () => joiner.invite.accept({ inviteId: randomBytes(32).toString('hex') }),
    {
      name: 'NotFoundError',
      message: /Cannot find invite/,
    },
    'accepting unknown inviteId throws'
  )
})

test('Attempting to accept or reject an invite not in pending state throws', async (t) => {
  for (const action of /** @type {const} */ (['accept', 'reject'])) {
    await t.test(action + 'ing a canceled invite throws', async (t) => {
      const [creator, joiner] = await createManagers(2, t)
      const disconnectPeers = connectPeers([creator, joiner])
      t.after(() => disconnectPeers())
      await waitForPeers([creator, joiner])

      const createdProjectId = await creator.createProject({ name: 'Mapeo' })
      const creatorProject = await creator.getProject(createdProjectId)

      const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
      creatorProject.$member
        .invite(joiner.deviceId, {
          roleId: MEMBER_ROLE_ID,
        })
        // This will throw when canceled, but we're not interested in that here
        .catch(noop)
      const invite = await inviteReceivedPromise
      creatorProject.$member.requestCancelInvite(joiner.deviceId)
      await pEvent(
        joiner.invite,
        'invite-updated',
        (i) => i.state === 'canceled'
      )
      await assert.rejects(
        async () => joiner.invite[action](invite),
        {
          name: 'InviteSendError',
          message: /Cannot send/,
        },
        action + 'ing a canceled invite throws'
      )
    })
    await t.test(action + 'ing a rejected invite throws', async (t) => {
      const [creator, joiner] = await createManagers(2, t)
      const disconnectPeers = connectPeers([creator, joiner])
      t.after(() => disconnectPeers())
      await waitForPeers([creator, joiner])

      const createdProjectId = await creator.createProject({ name: 'Mapeo' })
      const creatorProject = await creator.getProject(createdProjectId)

      const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
      creatorProject.$member.invite(joiner.deviceId, {
        roleId: MEMBER_ROLE_ID,
      })
      const invite = await inviteReceivedPromise
      await joiner.invite.reject(invite)
      await assert.rejects(
        async () => joiner.invite[action](invite),
        {
          name: 'InviteSendError',
          message: /Cannot send/,
        },
        action + 'ing a rejected invite throws'
      )
    })
    await t.test(
      action + 'ing an already-responded invite throws',
      async (t) => {
        const managers = await createManagers(3, t)
        const [creator, coord, member] = managers
        const disconnectPeers = connectPeers(managers)
        t.after(disconnectPeers)
        await waitForPeers(managers)

        // Test setup: add coordinator to the project
        const createdProjectId = await creator.createProject({ name: 'Mapeo' })
        const creatorProject = await creator.getProject(createdProjectId)
        creatorProject.$member.invite(coord.deviceId, {
          roleId: COORDINATOR_ROLE_ID,
        })
        const invite = await pEvent(coord.invite, 'invite-received')
        await coord.invite.accept(invite)
        const coordProject = await coord.getProject(createdProjectId)

        creatorProject.$member.invite(member.deviceId, {
          roleId: MEMBER_ROLE_ID,
        })
        const receivedCreatorInvite = await pEvent(
          member.invite,
          'invite-received'
        )
        coordProject.$member.invite(member.deviceId, {
          roleId: MEMBER_ROLE_ID,
        })
        const receivedCoordInvite = await pEvent(
          member.invite,
          'invite-received'
        )

        await member.invite.accept(receivedCreatorInvite)

        assert.equal(
          member.invite.getById(receivedCoordInvite.inviteId).state,
          'respondedAlready'
        )

        await assert.rejects(
          async () => member.invite[action](receivedCoordInvite),
          {
            name: 'InviteSendError',
            message: /Cannot send/,
          },
          action + 'ing an already-responded invite throws'
        )
      }
    )
    await t.test(action + 'ing a joined invite throws', async (t) => {
      const [creator, joiner] = await createManagers(2, t)
      const disconnectPeers = connectPeers([creator, joiner])
      t.after(() => disconnectPeers())
      await waitForPeers([creator, joiner])

      const createdProjectId = await creator.createProject({ name: 'Mapeo' })
      const creatorProject = await creator.getProject(createdProjectId)

      const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
      creatorProject.$member.invite(joiner.deviceId, {
        roleId: MEMBER_ROLE_ID,
      })
      const invite = await inviteReceivedPromise
      await joiner.invite.accept(invite)

      await assert.rejects(
        async () => joiner.invite[action](invite),
        {
          name: 'InviteSendError',
          message: /Cannot send/,
        },
        action + 'ing an already-joined invite throws'
      )
    })
    for (const interruptState of /** @type {const} */ ([
      'responding',
      'joining',
    ])) {
      await t.test(
        `${action}ing an invite in ${interruptState} state throws`,
        async (t) => {
          const [creator, joiner] = await createManagers(2, t)
          const disconnectPeers = connectPeers([creator, joiner])
          t.after(() => disconnectPeers())
          await waitForPeers([creator, joiner])

          const createdProjectId = await creator.createProject({
            name: 'Mapeo',
          })
          const creatorProject = await creator.getProject(createdProjectId)

          const inviteReceivedPromise = pEvent(joiner.invite, 'invite-received')
          creatorProject.$member.invite(joiner.deviceId, {
            roleId: MEMBER_ROLE_ID,
          })
          const invite = await inviteReceivedPromise
          const inviteRespondingPromise = pEvent(
            joiner.invite,
            'invite-updated',
            (i) => i.state === interruptState
          )
          const inviteAcceptPromise = joiner.invite.accept(invite)
          await inviteRespondingPromise
          await assert.rejects(
            async () => joiner.invite[action](invite),
            {
              name: 'InviteSendError',
              message: new RegExp(
                `Cannot send.*in state ${interruptState}`,
                'i'
              ),
            },
            `${action}ing an invite in ${interruptState} state throws`
          )
          await inviteAcceptPromise
        }
      )
    }
  }
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
