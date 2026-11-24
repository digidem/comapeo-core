import test from 'node:test'
import { TypedEmitter } from 'tiny-typed-emitter'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Transform } from 'streamx'
import { pEvent } from 'p-event'

import { InviteLinkJoiner } from '../src/invite/invite-link-joiner.js'
import { makeInviteURL } from '../src/invite/invite-urls.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import { MockInviteLinkRPC } from './helpers/invite-link-rpc.js'
import {
  InviteExpiredError,
  ExistingJoinRequestError,
  JoinProjectCancelledError,
} from '../src/errors.js'

/** @import { RemoteAuthedNoiseStream } from '../src/discovery/remote-discovery.js' */
/** @import { Invite, InviteApi } from '../src/invite/invite-api.js' */
/** @import { JoinRequestUpdate } from '../src/invite/invite-link-joiner.js' */
/** @import { KnownError } from '../src/errors.js' */

/**
 * @param {Buffer} authenticatedPublicKey
 * @returns {RemoteAuthedNoiseStream}
 */
function mockConnection(authenticatedPublicKey) {
  const connection = /** @type {RemoteAuthedNoiseStream} */ (
    /** @type {unknown} */ (new Transform())
  )
  connection.authenticatedPublicKey = authenticatedPublicKey
  connection.remotePublicKey = randomBytes(32)
  return connection
}

/**
 * @typedef {object} MockInviteApiOptions
 * @property {string} [projectId] Project ID returned by accept (default: random)
 */

class MockInviteApi extends TypedEmitter {
  /** @type {string} */
  #projectId

  /**
   * @param {MockInviteApiOptions} [opts]
   */
  constructor({ projectId = randomBytes(20).toString('hex') } = {}) {
    super()
    this.#projectId = projectId
  }

  /**
   * @param {Pick<Invite, 'inviteId'>} _invite
   * @returns {Promise<string>}
   */
  async accept(_invite) {
    return this.#projectId
  }
}

/**
 * @returns {{
 *   swarmPublicKey: Buffer,
 *   authenticatedPublicKey: Buffer,
 *   inviteId: Buffer,
 *   projectId: string,
 *   url: string,
 *   connection: RemoteAuthedNoiseStream,
 * }}
 */
function makeTestContext() {
  const swarmPublicKey = randomBytes(32)
  const authenticatedPublicKey = randomBytes(32)
  const inviteId = randomBytes(32)
  const projectId = randomBytes(20).toString('hex')
  const url = makeInviteURL({
    inviteIdString: inviteId.toString('hex'),
    swarmPublicKey: swarmPublicKey.toString('hex'),
    invitorName: 'invitor',
    projectName: 'project',
    expiresAt: Date.now() + 60_000,
    roleId: MEMBER_ROLE_ID,
  })
  const connection = mockConnection(authenticatedPublicKey)
  return {
    swarmPublicKey,
    authenticatedPublicKey,
    inviteId,
    projectId,
    url,
    connection,
  }
}

test('expired: throws InviteExpiredError without connecting', () => {
  const expiredUrl = makeInviteURL({
    inviteIdString: randomBytes(32).toString('hex'),
    swarmPublicKey: randomBytes(32).toString('hex'),
    invitorName: 'invitor',
    projectName: 'project',
    expiresAt: Date.now() - 60_000,
    roleId: MEMBER_ROLE_ID,
  })

  let connectCalled = false
  const inviteApi = new MockInviteApi()
  const mockRpc = new MockInviteLinkRPC({ inviteApi })
  const joiner = new InviteLinkJoiner({
    connectPeer: async () => {
      connectCalled = true
      throw new Error('connectPeer should not be called')
    },
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  assert.throws(() => joiner.createJoinRequest(expiredUrl), InviteExpiredError)
  assert.equal(connectCalled, false)
  assert.deepEqual(joiner.getJoinRequests(), [])
})

test('happy path: connect, redeem, accept, complete', async () => {
  const ctx = makeTestContext()
  const identityKey = ctx.authenticatedPublicKey.toString('hex')
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({ inviteApi })

  const joiner = new InviteLinkJoiner({
    connectPeer: async (swarmPublicKeyHex) => {
      assert.equal(swarmPublicKeyHex, ctx.swarmPublicKey.toString('hex'))
      return ctx.connection
    },
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  /** @type {JoinRequestUpdate[]} */
  const updates = []
  /** @type {KnownError|undefined} */
  let lastError
  joiner.on('join-request-update', (update) => {
    updates.push(update)
  })
  joiner.on('join-request-error', (error) => {
    lastError = error
  })

  const onConnected = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'connected',
  })
  const onAccepted = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'accepted',
  })
  const onCompleted = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'completed',
  })

  const joinRequest = joiner.createJoinRequest(ctx.url)

  assert.equal(joinRequest.status, 'connecting')
  assert.equal(joinRequest.inviteId, ctx.inviteId.toString('hex'))

  await onConnected
  await onAccepted
  await onCompleted

  // Verify status transitions in order
  assert.deepEqual(
    updates.map((u) => u.status),
    ['connecting', 'connected', 'accepted', 'completed']
  )

  // No error is emitted as a separate parameter
  assert.equal(lastError, undefined)
  assert.equal(updates[3].projectId, ctx.projectId)

  // Verify waitForPeer was called with identity key (not swarm key)
  assert.deepEqual(mockRpc.waitForPeerCalls, [identityKey])

  // Verify redeem was called with inviteId and identity key
  assert.equal(mockRpc.redeemCalls.length, 1)
  assert.equal(mockRpc.redeemCalls[0].name, 'invitee')
  assert.ok(mockRpc.redeemCalls[0].inviteId.equals(ctx.inviteId))
  assert.equal(mockRpc.redeemCalls[0].deviceId, identityKey)

  // Verify markReady was called with identity key
  assert.deepEqual(mockRpc.markReadyCalls, [identityKey])

  // Verify acceptAck was called with inviteId and identity key
  assert.equal(mockRpc.acceptAckCalls.length, 1)
  assert.ok(mockRpc.acceptAckCalls[0].inviteId.equals(ctx.inviteId))
  assert.equal(mockRpc.acceptAckCalls[0].deviceId, identityKey)

  // Verify disconnect was NOT called on happy path
  assert.equal(mockRpc.disconnectCalls.length, 0)

  // Completed requests persist in pending until the next createJoinRequest
  const completed = joiner.getJoinRequestById(ctx.inviteId.toString('hex'))
  assert.equal(completed.status, 'completed')
  assert.equal(completed.projectId, ctx.projectId)
  assert.equal(joiner.getJoinRequests().length, 1)
  assert.equal(joiner.getJoinRequests()[0].status, 'completed')

  ctx.connection.end()
})

test('deny: inviter denies the invite', async () => {
  const ctx = makeTestContext()
  const identityKey = ctx.authenticatedPublicKey.toString('hex')
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({
    inviteApi,
    denyReason: 'invitor_denied',
  })

  const joiner = new InviteLinkJoiner({
    connectPeer: async () => ctx.connection,
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  /** @type {JoinRequestUpdate[]} */
  const updates = []
  /** @type {KnownError|undefined} */
  let lastError
  joiner.on('join-request-update', (update) => {
    updates.push(update)
  })
  joiner.on('join-request-error', (error) => {
    lastError = error
  })

  const onFailed = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'failed',
  })

  joiner.createJoinRequest(ctx.url)

  await onFailed

  // Status transitions: connecting → connected → failed
  assert.deepEqual(
    updates.map((u) => u.status),
    ['connecting', 'connected', 'failed']
  )

  // Verify denyAck was called with inviteId and identity key
  assert.equal(mockRpc.denyAckCalls.length, 1)
  assert.ok(mockRpc.denyAckCalls[0].inviteId.equals(ctx.inviteId))
  assert.equal(mockRpc.denyAckCalls[0].deviceId, identityKey)

  // Verify disconnect was called with identity key
  assert.deepEqual(mockRpc.disconnectCalls, [identityKey])

  // Verify markReady was called (happens before the deny race)
  assert.deepEqual(mockRpc.markReadyCalls, [identityKey])

  // Verify acceptAck was NOT called
  assert.equal(mockRpc.acceptAckCalls.length, 0)

  // Verify the error
  const failedUpdate = updates.find((u) => u.status === 'failed')
  assert.ok(failedUpdate)
  assert.ok(failedUpdate.error)
  assert.equal(failedUpdate.error, 'INVITE_DENIED_BY_INVITER_ERROR')

  // Error is also emitted as a separate parameter (the full KnownError)
  assert.ok(lastError)
  assert.equal(lastError.code, failedUpdate.error)
  assert.equal(lastError.code, 'INVITE_DENIED_BY_INVITER_ERROR')

  // Failed requests persist in pending until the next createJoinRequest
  const failed = joiner.getJoinRequestById(ctx.inviteId.toString('hex'))
  assert.equal(failed.status, 'failed')
  assert.ok(failed.error)
  assert.equal(joiner.getJoinRequests().length, 1)

  ctx.connection.end()
})

test('connection close: peer disconnects before invite arrives', async () => {
  const ctx = makeTestContext()
  const identityKey = ctx.authenticatedPublicKey.toString('hex')
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({ inviteApi, noResponse: true })

  const joiner = new InviteLinkJoiner({
    connectPeer: async () => ctx.connection,
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  /** @type {JoinRequestUpdate[]} */
  const updates = []
  /** @type {KnownError|undefined} */
  let lastError
  joiner.on('join-request-update', (update) => {
    updates.push(update)
  })
  joiner.on('join-request-error', (error) => {
    lastError = error
  })

  const onFailed = pEvent(joiner, 'join-request-update', {
    timeout: 2000,
    filter: ({ status }) => status === 'failed',
  })

  joiner.createJoinRequest(ctx.url)

  // Let the joiner reach the Promise.race, then close the connection
  await new Promise((resolve) => setImmediate(resolve))
  ctx.connection.destroy()

  await onFailed

  // Status transitions: connecting → connected → failed
  assert.deepEqual(
    updates.map((u) => u.status),
    ['connecting', 'connected', 'failed']
  )

  // Verify redeem was called
  assert.equal(mockRpc.redeemCalls.length, 1)
  assert.equal(mockRpc.redeemCalls[0].deviceId, identityKey)

  // Verify disconnect was called with identity key
  assert.deepEqual(mockRpc.disconnectCalls, [identityKey])

  // Verify markReady was called (happens before the close race)
  assert.deepEqual(mockRpc.markReadyCalls, [identityKey])

  // Verify the error is wrapped as InviteConnectionError
  const failedUpdate = updates.find((u) => u.status === 'failed')
  assert.ok(failedUpdate)
  assert.ok(failedUpdate.error)
  assert.equal(failedUpdate.error, 'INVITE_CONNECTION_ERROR')

  // Error is also emitted as a separate parameter (the full KnownError)
  assert.ok(lastError)
  assert.equal(lastError.code, failedUpdate.error)
  assert.equal(lastError.code, 'INVITE_CONNECTION_ERROR')
})

test('finished requests are kept when a new invite starts', async () => {
  const ctxA = makeTestContext()
  const ctxB = makeTestContext()
  const connections = new Map([
    [ctxA.swarmPublicKey.toString('hex'), ctxA.connection],
    [ctxB.swarmPublicKey.toString('hex'), ctxB.connection],
  ])
  const inviteApi = new MockInviteApi({ projectId: ctxB.projectId })
  const mockRpc = new MockInviteLinkRPC({ inviteApi })

  const joiner = new InviteLinkJoiner({
    connectPeer: async (swarmHex) => {
      const c = connections.get(swarmHex)
      assert.ok(c)
      return c
    },
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  const inviteIdA = ctxA.inviteId.toString('hex')
  const inviteIdB = ctxB.inviteId.toString('hex')

  // Request A completes and stays in pending
  const onCompletedA = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: (u) => u.inviteId === inviteIdA && u.status === 'completed',
  })
  joiner.createJoinRequest(ctxA.url)
  await onCompletedA
  assert.ok(
    joiner
      .getJoinRequests()
      .some((r) => r.inviteId === inviteIdA && r.status === 'completed')
  )

  // Request B (different invite) starts without clearing the finished A
  const onCompletedB = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: (u) => u.inviteId === inviteIdB && u.status === 'completed',
  })
  joiner.createJoinRequest(ctxB.url)

  assert.ok(
    joiner
      .getJoinRequests()
      .some((r) => r.inviteId === inviteIdA && r.status === 'completed')
  )
  assert.ok(
    joiner
      .getJoinRequests()
      .some((r) => r.inviteId === inviteIdB && r.status === 'connecting')
  )

  await onCompletedB
  assert.deepEqual(
    joiner.getJoinRequests().map((r) => r.inviteId),
    [inviteIdA, inviteIdB]
  )
})

test('a new join request is allowed for the same invite after a previous failure', async () => {
  const ctx = makeTestContext()
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({
    inviteApi,
    denyReason: 'invitor_denied',
  })

  const joiner = new InviteLinkJoiner({
    connectPeer: async () => ctx.connection,
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  const inviteId = ctx.inviteId.toString('hex')

  const onFailed = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'failed',
  })
  joiner.createJoinRequest(ctx.url)
  await onFailed
  assert.equal(joiner.getJoinRequestById(inviteId).status, 'failed')

  // Re-clicking the same link now starts a fresh request instead of throwing
  const fresh = joiner.createJoinRequest(ctx.url)
  assert.equal(fresh.status, 'connecting')
  assert.equal(fresh.inviteId, inviteId)

  joiner.cancelJoinRequest(inviteId)
  ctx.connection.end()
})

test('an in-flight request for the same invite is not cleared', async () => {
  const ctx = makeTestContext()
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({ inviteApi, noResponse: true })

  const joiner = new InviteLinkJoiner({
    connectPeer: async () => ctx.connection,
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  const inviteId = ctx.inviteId.toString('hex')

  // Stays in-flight because the mock never responds
  const onConnected = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'connected',
  })
  joiner.createJoinRequest(ctx.url)
  await onConnected

  // Only failed/completed are cleared, so the in-flight one is still guarded
  assert.throws(
    () => joiner.createJoinRequest(ctx.url),
    ExistingJoinRequestError
  )
  assert.equal(joiner.getJoinRequestById(inviteId).status, 'connected')

  ctx.connection.destroy()
})

test('cancel leaves the request in the list as failed', async () => {
  const ctx = makeTestContext()
  const inviteApi = new MockInviteApi({ projectId: ctx.projectId })
  const mockRpc = new MockInviteLinkRPC({ inviteApi, noResponse: true })

  const joiner = new InviteLinkJoiner({
    connectPeer: async () => ctx.connection,
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
    inviteLinkRPC: /** @type {any} */ (mockRpc),
    getDeviceInfo: async () => ({ name: 'invitee' }),
  })

  const inviteId = ctx.inviteId.toString('hex')

  const onConnected = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'connected',
  })
  joiner.createJoinRequest(ctx.url)
  await onConnected

  const onFailed = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'failed',
  })
  joiner.cancelJoinRequest(inviteId)
  await onFailed

  // The cancelled request lingers in the list as failed (it is not removed)
  const cancelled = joiner.getJoinRequestById(inviteId)
  assert.equal(cancelled.status, 'failed')
  assert.equal(cancelled.error, JoinProjectCancelledError.code)

  ctx.connection.end()
})
