import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { compact, concat, map, every, first } from 'iterpal'
import { onTimes } from './helpers/events.js'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import { LocalPeers } from '../src/local-peers.js'
import { InviteApi } from '../src/invite/invite-api.js'
import {
  keyToId,
  projectKeyToProjectInviteId,
  projectKeyToPublicId,
} from '../src/utils.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { pEvent } from 'p-event'
import pTimeout from 'p-timeout'
import FakeTimers from '@sinonjs/fake-timers'
/** @import { InviteResponse } from '../src/generated/rpc.js' */

class MockLocalPeers extends LocalPeers {
  /**
   * @param {string} deviceId
   * @param {InviteResponse} inviteResponse
   */
  async sendInviteResponse(deviceId, inviteResponse) {
    this.emit('invite-response', deviceId, inviteResponse)
  }
}

test('has no invites to start', () => {
  const { rpc } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not be called')
      },
    },
  })

  assert.deepEqual(inviteApi.getMany(), [])
})

test('invite-received event has expected payload', async () => {
  const { rpc, invitorPeerId, projectInviteId } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not be called')
      },
    },
  })

  const invitesReceivedPromise = onTimes(inviteApi, 'invite-received', 3)

  const projectName = 'My Project'
  const bareInvite = {
    inviteId: randomBytes(32),
    projectInviteId,
    projectName,
    invitorName: 'Your Friend',
    sendStats: false,
  }
  rpc.emit('invite', invitorPeerId, bareInvite)

  const partialInvite = {
    ...bareInvite,
    inviteId: randomBytes(32),
    projectColor: '#123456',
    roleDescription: 'Cool Role',
  }
  rpc.emit('invite', invitorPeerId, partialInvite)

  const fullInvite = {
    ...bareInvite,
    inviteId: randomBytes(32),
    roleName: 'Superfan',
    roleDescription: 'This Cool Role',
    projectDescription: 'cool project',
  }
  rpc.emit('invite', invitorPeerId, fullInvite)

  const expectedInvites = [
    {
      inviteId: bareInvite.inviteId.toString('hex'),
      projectInviteId: projectInviteId.toString('hex'),
      invitorDeviceId: invitorPeerId,
      projectName,
      invitorName: 'Your Friend',
      state: 'pending',
      sendStats: false,
    },
    {
      inviteId: partialInvite.inviteId.toString('hex'),
      projectInviteId: projectInviteId.toString('hex'),
      invitorDeviceId: invitorPeerId,
      projectName,
      roleDescription: 'Cool Role',
      invitorName: 'Your Friend',
      projectColor: '#123456',
      state: 'pending',
      sendStats: false,
    },
    {
      inviteId: fullInvite.inviteId.toString('hex'),
      projectInviteId: projectInviteId.toString('hex'),
      invitorDeviceId: invitorPeerId,
      projectName,
      roleName: 'Superfan',
      roleDescription: 'This Cool Role',
      invitorName: 'Your Friend',
      projectDescription: 'cool project',
      state: 'pending',
      sendStats: false,
    },
  ]
  const receivedInvitesArgs = (await invitesReceivedPromise).map(first)
  assertInvitesAlike(
    receivedInvitesArgs,
    expectedInvites,
    'received expected invites'
  )
  assertInvitesAlike(
    inviteApi.getMany(),
    expectedInvites,
    'pending invites are expected'
  )
})

test('Accept invite', async () => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    projectPublicId,
    encryptionKeys,
  } = setup()

  /** @type {Array<Buffer>} */
  const projectKeysFound = []

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async ({ projectKey }) => {
        projectKeysFound.push(projectKey)
        return projectKeyToPublicId(projectKey)
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')
  const inviteJoinedPromise = onceInviteState(inviteApi, 'joined')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  assertInvitesAlike(
    inviteApi.getMany(),
    [inviteExternal],
    'has one pending invite'
  )

  // Invitor: prepare to share project join details upon acceptance

  rpc.once('invite-response', (peerId, inviteResponse) => {
    assert.equal(
      peerId,
      invitorPeerId,
      'received an invite response from the correct peer'
    )
    assert.deepEqual(
      inviteResponse.inviteId,
      invite.inviteId,
      'received an invite response to this invite'
    )
    assert.equal(
      inviteResponse.decision,
      InviteResponse_Decision.ACCEPT,
      'received an accept'
    )

    rpc.emit('got-project-details', invitorPeerId, {
      inviteId: invite.inviteId,
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: accept

  const acceptResult = await inviteApi.accept(inviteExternal)

  assert.equal(
    acceptResult,
    projectPublicId,
    'accept returns project public ID'
  )
  assert(
    projectKeysFound.some((k) => k.equals(projectKey)),
    'added to project'
  )

  const removedInvite = await inviteJoinedPromise
  assert.equal(removedInvite.state, 'joined')
  assert.deepEqual(getPending(inviteApi), [], 'no pending invites remain')
  assert(inviteApi.getMany().every((invite) => invite.state === 'joined'))
})

test('Reject invite', async () => {
  const { rpc, invitorPeerId, invite, inviteExternal } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not add project')
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  assertInvitesAlike(
    getPending(inviteApi),
    [inviteExternal],
    'has one pending invite'
  )

  // Invitor: prepare to receive response

  const inviteResponseEventPromise = once(rpc, 'invite-response')

  // Invitee: reject

  const inviteRejectedPromise = onceInviteState(inviteApi, 'rejected')

  inviteApi.reject(inviteExternal)

  const rejectedInvite = await inviteRejectedPromise
  assertInvitesAlike(
    rejectedInvite,
    { ...inviteExternal, state: 'rejected' },
    'expected invite state'
  )
  assert.equal(rejectedInvite.state, 'rejected')
  assertInvitesAlike(getPending(inviteApi), [], 'pending invites removed')

  // Invitor: check rejection

  const [inviteResponsePeerId, inviteResponse] =
    await inviteResponseEventPromise
  assert.equal(
    inviteResponsePeerId,
    invitorPeerId,
    'got response from right peer'
  )
  assert.deepEqual(
    inviteResponse.inviteId,
    invite.inviteId,
    'got response for the right invite'
  )
  assert.equal(
    inviteResponse.decision,
    InviteResponse_Decision.REJECT,
    'got rejection'
  )
})

test('Receiving invite for project that peer already belongs to', async (t) => {
  await t.test('was member prior to connection', async () => {
    const { rpc, invitorPeerId, projectPublicId, projectInviteId, invite } =
      setup()

    const inviteApi = new InviteApi({
      rpc,
      queries: {
        getProjectByInviteId: (p) =>
          p === projectInviteId
            ? { projectPublicId, hasLeftProject: false }
            : undefined,
        addProject: async () => {
          assert.fail('should not add project')
        },
      },
    })

    inviteApi.on('invite-received', () => {
      assert.fail('should not emit a received invite')
    })

    // Invitor: prepare to receive response

    const inviteResponseEventPromise = once(rpc, 'invite-response')

    // Invitor: send the invite

    rpc.emit('invite', invitorPeerId, invite)

    assert.deepEqual(getPending(inviteApi), [], 'has no pending invites')

    // Invitor: check invite response

    const [inviteResponsePeerId, inviteResponse] =
      await inviteResponseEventPromise
    assert.equal(
      inviteResponsePeerId,
      invitorPeerId,
      'got response from right peer'
    )
    assert.deepEqual(
      inviteResponse.inviteId,
      invite.inviteId,
      'got response to right invite'
    )
    assert.equal(
      inviteResponse.decision,
      InviteResponse_Decision.ALREADY,
      'got "already" response'
    )

    assert.deepEqual(getPending(inviteApi), [], 'has no pending invites')
  })

  await t.test(
    'became member (somehow!) between receiving invite and accepting',
    async () => {
      const { rpc, invitorPeerId, invite, inviteExternal, projectPublicId } =
        setup()

      let isMember = false

      const inviteApi = new InviteApi({
        rpc,
        queries: {
          getProjectByInviteId: () =>
            isMember ? { projectPublicId, hasLeftProject: false } : undefined,
          addProject: async () => {
            assert.fail('should not add project')
          },
        },
      })

      const inviteReceivedPromise = once(inviteApi, 'invite-received')

      // Invitor: send the invite

      rpc.emit('invite', invitorPeerId, invite)

      // Invitee: receive the invite, then get (somehow) added

      await inviteReceivedPromise

      assertInvitesAlike(
        getPending(inviteApi),
        [inviteExternal],
        'has a pending invite'
      )

      isMember = true

      // Invitor: prepare to receive response

      const inviteResponseEventPromise = once(rpc, 'invite-response')

      // Invitee: attempt accept, which should send a rejection

      const inviteRespondedAlready = onceInviteState(
        inviteApi,
        'respondedAlready'
      )

      await assert.rejects(
        () => inviteApi.accept(inviteExternal),
        { message: 'Already joining or in project' },
        'accepting rejects with an error'
      )

      const respondedAlreadyInvite = await inviteRespondedAlready
      assert.equal(respondedAlreadyInvite.state, 'respondedAlready')
      assertInvitesAlike(getPending(inviteApi), [], 'has no pending invites')

      // Invitor: check invite response

      const [inviteResponsePeerId, inviteResponse] =
        await inviteResponseEventPromise
      assert.equal(inviteResponsePeerId, invitorPeerId)
      assert.deepEqual(inviteResponse.inviteId, invite.inviteId)
      assert.equal(inviteResponse.decision, InviteResponse_Decision.ALREADY)
    }
  )

  await t.test('became member from accepting another invite', async () => {
    const {
      rpc,
      invitorPeerId: invitor1PeerId,
      invite,
      inviteExternal,
      projectKey,
      encryptionKeys,
    } = setup()

    /** @type {undefined | Buffer} */
    let projectKeyAdded
    const inviteApi = new InviteApi({
      rpc,
      queries: {
        getProjectByInviteId: () => undefined,
        addProject: async ({ projectKey }) => {
          assert(!projectKeyAdded, 'only adds one project')
          projectKeyAdded = projectKey
          return projectKeyToPublicId(projectKey)
        },
      },
    })

    const invitesReceivedPromise = onTimes(inviteApi, 'invite-received', 6)

    // Invitor 1: send two invites to the project

    rpc.emit('invite', invitor1PeerId, invite)

    const secondInviteFromPeer1 = { ...invite, inviteId: randomBytes(32) }
    const secondInviteExternalFromPeer1 = {
      ...inviteExternal,
      inviteId: secondInviteFromPeer1.inviteId.toString('hex'),
    }
    rpc.emit('invite', invitor1PeerId, secondInviteFromPeer1)

    // Invitor 2: send two invites to the project

    const { invitorPeerId: invitor2PeerId } = setup()
    const firstInviteFromPeer2 = { ...invite, inviteId: randomBytes(32) }
    const firstInviteExternalFromPeer2 = {
      ...inviteExternal,
      invitorDeviceId: invitor2PeerId,
      inviteId: firstInviteFromPeer2.inviteId.toString('hex'),
    }
    const secondInviteFromPeer2 = { ...invite, inviteId: randomBytes(32) }
    const secondInviteExternalFromPeer2 = {
      ...inviteExternal,
      invitorDeviceId: invitor2PeerId,
      inviteId: secondInviteFromPeer2.inviteId.toString('hex'),
    }
    rpc.emit('invite', invitor2PeerId, firstInviteFromPeer2)
    rpc.emit('invite', invitor2PeerId, secondInviteFromPeer2)

    // Invitor 3: send one invite to the project and another to a different project

    const {
      invitorPeerId: invitor3PeerId,
      invite: unrelatedInvite,
      inviteExternal: unrelatedInviteExternal,
    } = setup()
    const firstInviteFromPeer3 = { ...invite, inviteId: randomBytes(32) }
    const firstInviteExternalFromPeer3 = {
      ...inviteExternal,
      invitorDeviceId: invitor3PeerId,
      inviteId: firstInviteFromPeer3.inviteId.toString('hex'),
    }
    rpc.emit('invite', invitor3PeerId, firstInviteFromPeer3)
    rpc.emit('invite', invitor3PeerId, unrelatedInvite)

    // Invitee: receive the invites

    await invitesReceivedPromise

    assertInvitesAlike(
      getPending(inviteApi),
      [
        inviteExternal,
        secondInviteExternalFromPeer1,
        firstInviteExternalFromPeer2,
        secondInviteExternalFromPeer2,
        firstInviteExternalFromPeer3,
        unrelatedInviteExternal,
      ],
      'has six pending invites'
    )

    // Invitors: handle invite responses

    /** @type {Set<{ peerId: string, inviteResponse: InviteResponse }>} */
    const responses = new Set()
    rpc.on('invite-response', (peerId, inviteResponse) => {
      responses.add({ peerId, inviteResponse })
      if (
        peerId === invitor1PeerId &&
        inviteResponse.inviteId.equals(invite.inviteId)
      ) {
        assert.equal(inviteResponse.decision, InviteResponse_Decision.ACCEPT)
        rpc.emit('got-project-details', invitor1PeerId, {
          inviteId: invite.inviteId,
          projectKey,
          encryptionKeys,
        })
      } else {
        assert.equal(inviteResponse.decision, InviteResponse_Decision.ALREADY)
      }
    })

    // Invitee: accept an invite

    const invitesDonePromise = pEvent(inviteApi, 'invite-updated', () => {
      const invites = inviteApi.getMany()
      const joinedCount = invites.filter((i) => i.state === 'joined').length
      const respondedAlreadyCount = invites.filter(
        (i) => i.state === 'respondedAlready'
      ).length
      return joinedCount === 1 && respondedAlreadyCount === 4
    })

    await inviteApi.accept(inviteExternal)

    assert.deepEqual(
      responses,
      new Set([
        {
          peerId: invitor1PeerId,
          inviteResponse: {
            inviteId: invite.inviteId,
            decision: InviteResponse_Decision.ACCEPT,
          },
        },
        {
          peerId: invitor1PeerId,
          inviteResponse: {
            inviteId: secondInviteFromPeer1.inviteId,
            decision: InviteResponse_Decision.ALREADY,
          },
        },
        {
          peerId: invitor2PeerId,
          inviteResponse: {
            inviteId: firstInviteFromPeer2.inviteId,
            decision: InviteResponse_Decision.ALREADY,
          },
        },
        {
          peerId: invitor2PeerId,
          inviteResponse: {
            inviteId: secondInviteFromPeer2.inviteId,
            decision: InviteResponse_Decision.ALREADY,
          },
        },
        {
          peerId: invitor3PeerId,
          inviteResponse: {
            inviteId: firstInviteFromPeer3.inviteId,
            decision: InviteResponse_Decision.ALREADY,
          },
        },
      ]),
      'got expected responses'
    )

    await invitesDonePromise

    assert.equal(
      inviteApi.getById(unrelatedInviteExternal.inviteId).state,
      'pending'
    )
    assert.equal(
      inviteApi.getById(invite.inviteId.toString('hex')).state,
      'joined'
    )
  })
})

test('trying to accept or reject non-existent invite throws', async () => {
  const { rpc, inviteExternal } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should never be called')
      },
    },
  })

  inviteApi.on('invite-received', () => {
    assert.fail('should not emit an "added" event')
  })
  inviteApi.on('invite-updated', () => {
    assert.fail('should not emit an "invite-updated" event')
  })

  await assert.rejects(() => inviteApi.accept(inviteExternal))
  assert.throws(() => inviteApi.reject(inviteExternal))

  assertInvitesAlike(inviteApi.getMany(), [], 'has no invites')
})

test('throws when quickly double-accepting the same invite', async () => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  } = setup()

  /** @type {Array<Buffer>} */
  const projectKeysFound = []
  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async ({ projectKey }) => {
        projectKeysFound.push(projectKey)
        return projectKeyToPublicId(projectKey)
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  // Invitor: prepare to share project join details upon acceptance

  let inviteResponseCount = 0
  rpc.on('invite-response', (_peerId, inviteResponse) => {
    inviteResponseCount++

    assert.deepEqual(
      inviteResponse.inviteId,
      invite.inviteId,
      'responds to the correct invite'
    )

    rpc.emit('got-project-details', invitorPeerId, {
      inviteId: invite.inviteId,
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: accept twice

  const firstAcceptPromise = inviteApi.accept(inviteExternal)

  await assert.rejects(
    () => inviteApi.accept(inviteExternal),
    'second accept fails'
  )

  await firstAcceptPromise
  assert(
    projectKeysFound.some((k) => k.equals(projectKey)),
    'added to project'
  )
  assert.equal(inviteResponseCount, 1, 'only sent one invite response')
})

test('throws when quickly accepting and then rejecting an invite', async () => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  } = setup()

  /** @type {Array<Buffer>} */
  const projectKeysFound = []
  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async ({ projectKey }) => {
        projectKeysFound.push(projectKey)
        return projectKeyToPublicId(projectKey)
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  // Invitor: prepare to share project join details upon acceptance

  rpc.on('invite-response', () => {
    rpc.emit('got-project-details', invitorPeerId, {
      inviteId: invite.inviteId,
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: accept then reject

  const acceptPromise = inviteApi.accept(inviteExternal)

  assert.throws(() => inviteApi.reject(inviteExternal), 'reject fails')

  await acceptPromise
})

test('throws when quickly accepting two invites for the same project', async () => {
  const {
    rpc,
    invitorPeerId,
    invite: invite1,
    inviteExternal: invite1External,
    projectKey,
    encryptionKeys,
  } = setup()
  const invite2External = {
    ...invite1External,
    inviteId: randomBytes(32).toString('hex'),
  }

  /** @type {Array<Buffer>} */
  const projectKeysFound = []
  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async ({ projectKey }) => {
        projectKeysFound.push(projectKey)
        return projectKeyToPublicId(projectKey)
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite1)

  // Invitee: receive the invite

  await inviteReceivedPromise

  // Invitor: prepare to share project join details upon acceptance

  let inviteResponseCount = 0
  rpc.on('invite-response', (_peerId, inviteResponse) => {
    inviteResponseCount++

    assert.deepEqual(
      inviteResponse.inviteId,
      invite1.inviteId,
      'responds to the correct invite'
    )

    rpc.emit('got-project-details', invitorPeerId, {
      inviteId: invite1.inviteId,
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: accept twice

  const firstAcceptPromise = inviteApi.accept(invite1External)

  await assert.rejects(
    () => inviteApi.accept(invite2External),
    'second accept fails'
  )

  await firstAcceptPromise
  assert(
    projectKeysFound.some((k) => k.equals(projectKey)),
    'added to project'
  )
  assert.equal(inviteResponseCount, 1, 'only sent one invite response')
})

test('receiving project join details from an unknown peer is a no-op', async (t) => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  } = setup()
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not be called')
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  assertInvitesAlike(
    inviteApi.getMany(),
    [inviteExternal],
    'has one pending invite'
  )

  // Invitor: prepare to share project join details with the wrong invite ID

  rpc.once('invite-response', () => {
    const { invitorPeerId: bogusPeerId } = setup()
    rpc.emit('got-project-details', bogusPeerId, {
      inviteId: invite.inviteId,
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: try to accept

  const acceptPromise = inviteApi.accept(inviteExternal)

  // Send and reject another invite

  const { invite: invite2, inviteExternal: invite2External } = setup()
  const invite2ReceivedPromise = once(inviteApi, 'invite-received')
  rpc.emit('invite', invitorPeerId, invite2)
  await invite2ReceivedPromise
  const invite2RemovedPromise = pEvent(
    inviteApi,
    'invite-updated',
    (invite) => {
      return (
        invite.inviteId === invite2External.inviteId &&
        invite.state === 'rejected'
      )
    }
  )
  inviteApi.reject(invite2External)
  await invite2RemovedPromise

  // The original invite should still be around

  assert.equal(
    inviteApi.getById(inviteExternal.inviteId).state,
    'joining',
    'has original invite in joining state'
  )

  const assertAcceptTimeoutPromise = assert.rejects(() => acceptPromise, {
    message: 'Timed out waiting for project details',
  })
  clock.runAll()
  await assertAcceptTimeoutPromise
})

test('receiving project join details for an unknown invite ID is a no-op', async (t) => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  } = setup()
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not be called')
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  assertInvitesAlike(
    inviteApi.getMany(),
    [inviteExternal],
    'has one pending invite'
  )

  // Invitor: prepare to share project join details with the wrong invite ID

  rpc.once('invite-response', () => {
    rpc.emit('got-project-details', invitorPeerId, {
      inviteId: randomBytes(32),
      projectKey,
      encryptionKeys,
    })
  })

  // Invitee: try to accept

  const acceptPromise = inviteApi.accept(inviteExternal)

  // Send and reject another invite

  const { invite: invite2, inviteExternal: invite2External } = setup()
  const invite2ReceivedPromise = once(inviteApi, 'invite-received')
  rpc.emit('invite', invitorPeerId, invite2)
  await invite2ReceivedPromise
  const invite2RemovedPromise = pEvent(
    inviteApi,
    'invite-updated',
    (invite) => {
      return (
        invite.inviteId === invite2External.inviteId &&
        invite.state === 'rejected'
      )
    }
  )
  inviteApi.reject(invite2External)
  await invite2RemovedPromise

  // The original invite should still be around

  assert.equal(
    inviteApi.getById(inviteExternal.inviteId).state,
    'joining',
    'has original invite still in joining state'
  )

  const assertAcceptTimeoutPromise = assert.rejects(() => acceptPromise, {
    message: 'Timed out waiting for project details',
  })
  clock.runAll()
  await assertAcceptTimeoutPromise
})

test('ignores duplicate invite IDs', async () => {
  const { rpc, invitorPeerId, invite } = setup()
  const { invite: invite2 } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not be called')
      },
    },
  })

  const twoInvitesPromise = onTimes(inviteApi, 'invite-received', 2)

  for (let i = 0; i < 100; i++) rpc.emit('invite', invitorPeerId, invite)
  rpc.emit('invite', invitorPeerId, invite2)

  await twoInvitesPromise

  const invites = inviteApi.getMany()
  assert.equal(invites.length, 2, 'two invites')
  const inviteIds = invites.map((i) => i.inviteId)
  assert.notDeepEqual(inviteIds[0], inviteIds[1], 'got different invite IDs')
})

test('failures to send acceptances cause accept to reject, no project to be added, and invite to be in error state', async () => {
  const { rpc, invitorPeerId, invite, inviteExternal } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not try to add project if could not accept')
      },
    },
  })

  let acceptsAttempted = 0
  rpc.sendInviteResponse = async (deviceId, inviteResponse) => {
    assert.equal(deviceId, invitorPeerId)
    assert.equal(inviteResponse.decision, InviteResponse_Decision.ACCEPT)
    acceptsAttempted++
    throw new Error('Failed to accept invite')
  }

  const inviteReceivedPromise = pEvent(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive and try to accept the invite

  await inviteReceivedPromise

  assertInvitesAlike(
    inviteApi.getMany(),
    [inviteExternal],
    'has a pending invite'
  )

  await assert.rejects(
    () => inviteApi.accept(inviteExternal),
    'fails to accept'
  )

  assert.equal(acceptsAttempted, 1)
  const inviteFinal = inviteApi.getById(inviteExternal.inviteId)
  assert.equal(inviteFinal.state, 'error')
  assert.equal(inviteFinal.error.message, 'Failed to accept invite')
})

test('failures to send rejections are ignored, but invite ends in error state', async () => {
  const { rpc, invitorPeerId, invite, inviteExternal } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        assert.fail('should not add project')
      },
    },
  })

  let rejectionsAttempted = 0
  rpc.sendInviteResponse = async (deviceId, inviteResponse) => {
    assert.equal(deviceId, invitorPeerId)
    assert.equal(inviteResponse.decision, InviteResponse_Decision.REJECT)
    rejectionsAttempted++
    throw new Error('Failed to reject invite')
  }

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive and reject the invite

  const inviteErroredPromise = pEvent(
    inviteApi,
    'invite-updated',
    (invite) =>
      invite.inviteId === inviteExternal.inviteId && invite.state === 'error'
  )

  await inviteReceivedPromise
  assert.doesNotThrow(() => inviteApi.reject(inviteExternal))

  assert.equal(rejectionsAttempted, 1)

  const erroredInvite = await inviteErroredPromise
  assert.equal(erroredInvite.state, 'error')
  assert.equal(erroredInvite.error.message, 'Failed to reject invite')
})

test('failures to add project cause accept() to reject and invite to be in error state', async () => {
  const {
    rpc,
    invitorPeerId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  } = setup()

  const inviteApi = new InviteApi({
    rpc,
    queries: {
      getProjectByInviteId: () => undefined,
      addProject: async () => {
        throw new Error('Failed to add project')
      },
    },
  })

  const inviteReceivedPromise = once(inviteApi, 'invite-received')

  // Invitor: send the invite

  rpc.emit('invite', invitorPeerId, invite)

  // Invitee: receive the invite

  await inviteReceivedPromise

  // Invitor: prepare to share project join details upon acceptance

  rpc.once('invite-response', (peerId, inviteResponse) => {
    if (
      peerId === invitorPeerId &&
      inviteResponse.inviteId.equals(invite.inviteId) &&
      inviteResponse.decision === InviteResponse_Decision.ACCEPT
    ) {
      rpc.emit('got-project-details', invitorPeerId, {
        inviteId: invite.inviteId,
        projectKey,
        encryptionKeys,
      })
    }
  })

  // Invitee: try to accept

  const inviteErroredPromise = pEvent(
    inviteApi,
    'invite-updated',
    (invite) =>
      invite.inviteId === inviteExternal.inviteId && invite.state === 'error'
  )

  await assert.rejects(
    () => inviteApi.accept(inviteExternal),
    'accept should fail'
  )

  const erroredInvite = await inviteErroredPromise
  assert.equal(erroredInvite.state, 'error')
  assert.equal(erroredInvite.error.message, 'Failed to add project')
})

function setup() {
  const encryptionKeys = { auth: randomBytes(32) }
  const projectKey = KeyManager.generateProjectKeypair().publicKey

  const projectPublicId = projectKeyToPublicId(projectKey)
  const projectInviteId = projectKeyToProjectInviteId(projectKey)
  const invitorPeerId = keyToId(randomBytes(16))

  const invite = {
    inviteId: randomBytes(32),
    projectInviteId,
    projectName: 'Mapeo Project',
    roleName: 'Superfan',
    invitorName: 'Host',
    sendStats: false,
  }
  const inviteExternal = {
    ...invite,
    invitorDeviceId: invitorPeerId,
    state: 'pending',
    inviteId: invite.inviteId.toString('hex'),
    projectInviteId: projectInviteId.toString('hex'),
    sendStats: false,
  }

  const rpc = new MockLocalPeers()

  return {
    rpc,
    invitorPeerId,
    projectPublicId,
    projectInviteId,
    invite,
    inviteExternal,
    projectKey,
    encryptionKeys,
  }
}

/**
 * Assert that invites are alike, with two special cases for "received at"
 * timestamps:
 *
 * 1. They are are ignored during equality comparison
 * 2. If present, the timestamps must be within the last 30 seconds
 *
 * @param {unknown} actual
 * @param {unknown} expected
 * @param {string} message
 * @returns {void}
 */
function assertInvitesAlike(actual, expected, message) {
  assert.deepEqual(
    removeReceivedAt(actual),
    removeReceivedAt(expected),
    message
  )

  const allReceivedAts = concat(
    getReceivedAts(actual),
    getReceivedAts(expected)
  )
  const now = Date.now()
  assert(
    every(
      allReceivedAts,
      (receivedAt) => receivedAt > now - 30_000 && receivedAt <= now
    ),
    message
  )
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function removeReceivedAt(value) {
  if (typeof value !== 'object' || !value) return value

  if (Array.isArray(value)) return value.map(removeReceivedAt)

  if (value instanceof Set) return new Set(map(value, removeReceivedAt))

  if ('receivedAt' in value) {
    const { receivedAt: _, ...result } = value
    return result
  }

  return value
}

/**
 * @param {unknown} value
 * @returns {Iterable<number>}
 */
function getReceivedAts(value) {
  const asIterable =
    Array.isArray(value) || value instanceof Set ? value : [value]
  const recievedAts = map(asIterable, getReceivedAt)
  return compact(recievedAts)
}

/**
 * @param {unknown} value
 * @returns {null | number}
 */
function getReceivedAt(value) {
  return typeof value === 'object' &&
    value &&
    'receivedAt' in value &&
    typeof value.receivedAt === 'number'
    ? value.receivedAt
    : null
}

/**
 * @param {InviteApi} inviteApi
 */
function getPending(inviteApi) {
  return inviteApi.getMany().filter((i) => i.state === 'pending')
}

/**
 *
 * @param {InviteApi} inviteApi
 * @param {import('../src/invite/invite-api.js').Invite['state']} state
 * @returns
 */
function onceInviteState(inviteApi, state) {
  return pTimeout(
    pEvent(inviteApi, 'invite-updated', (invite) => invite.state === state),
    { milliseconds: 1000 }
  )
}
