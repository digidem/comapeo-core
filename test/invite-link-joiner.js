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
import { ensureKnownError } from '../src/errors.js'

/** @import { RemoteAuthedNoiseStream } from '../src/discovery/remote-discovery.js' */
/** @import { Invite, InviteApi } from '../src/invite/invite-api.js' */
/** @import { JoinRequestUpdate } from '../src/invite/invite-link-joiner.js' */

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
  joiner.on('join-request-update', (update) => updates.push(update))

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

  // Verify join request is removed from pending
  assert.throws(() => joiner.getJoinRequestById(ctx.inviteId.toString('hex')), {
    code: 'JOIN_REQUEST_NOT_FOUND_ERROR',
  })

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
  joiner.on('join-request-update', (update) => updates.push(update))

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
  assert.equal(
    ensureKnownError(failedUpdate.error).code,
    'INVITE_DENIED_BY_INVITER_ERROR'
  )

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
  joiner.on('join-request-update', (update) => updates.push(update))

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
  assert.equal(
    ensureKnownError(failedUpdate.error).code,
    'INVITE_CONNECTION_ERROR'
  )
})
