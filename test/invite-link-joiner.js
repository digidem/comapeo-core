import test from 'node:test'
import { TypedEmitter } from 'tiny-typed-emitter'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Transform } from 'streamx'
import { pEvent } from 'p-event'

import { InviteLinkJoiner } from '../src/invite/invite-link-joiner.js'
import { makeInviteURL } from '../src/invite/invite-urls.js'

/** @import { RemoteAuthedNoiseStream } from '../src/discovery/remote-discovery.js' */
/** @import { Invite, InviteApi } from '../src/invite/invite-api.js' */

/**
 * @param {Buffer} handshakePublicKey
 * @returns {RemoteAuthedNoiseStream}
 */
function mockConnection(handshakePublicKey) {
  const connection = /** @type {RemoteAuthedNoiseStream} */ (
    /** @type {unknown} */ (new Transform())
  )
  connection.handshakePublicKey = handshakePublicKey
  connection.isTrusted = true
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

test('happy path: connect, redeem, accept, complete', async () => {
  const swarmPublicKey = randomBytes(32)
  const handshakePublicKey = randomBytes(32)
  const inviteId = randomBytes(32)
  const projectId = randomBytes(20).toString('hex')
  const url = makeInviteURL({
    inviteIdString: inviteId.toString('hex'),
    swarmPublicKey: swarmPublicKey.toString('hex'),
    invitorName: 'invitor',
    projectName: 'project',
    expiresAt: Date.now() + 60_000,
  })

  const connection = mockConnection(handshakePublicKey)
  const inviteApi = new MockInviteApi({ projectId })

  /** @type {string[]} */
  const connectCalls = []
  /** @type {string[]} */
  const disconnectCalls = []
  /** @type {[string, { inviteId: Buffer }][]} */
  const redeemCalls = []

  const joiner = new InviteLinkJoiner({
    connectPeer: async (swarmPublicKeyHex) => {
      connectCalls.push(swarmPublicKeyHex)
      return connection
    },
    disconnectPeer: async (swarmPublicKeyHex) => {
      disconnectCalls.push(swarmPublicKeyHex)
    },
    sendRedeemInviteOverInternet: async (deviceId, redeem) => {
      redeemCalls.push([deviceId, redeem])
    },
    inviteApi: /** @type {InviteApi} */ (/** @type {unknown} */ (inviteApi)),
  })

  /** @type {import('../src/invite/invite-link-joiner.js').JoinRequestUpdate[]} */
  const updates = []
  joiner.on('join-request-update', (update) => updates.push(update))

  const onConnecting = pEvent(joiner, 'join-request-update', {
    timeout: 1000,
    filter: ({ status }) => status === 'connecting',
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

  const joinRequest = joiner.createJoinRequest(url)

  assert.equal(joinRequest.status, 'connecting')
  assert.equal(joinRequest.inviteId, inviteId.toString('hex'))

  // Wait for 'connecting' update if we dont have it yet
  await onConnecting
  assert.equal(updates.length, 2)
  assert.equal(updates[0].status, 'connecting')

  // Verify connectPeer was called
  assert.deepEqual(connectCalls, [swarmPublicKey.toString('hex')])

  // Status should now be 'connected'
  await onConnected
  assert.equal(updates[1].status, 'connected')

  // Verify redeem was sent with correct identity key
  assert.equal(redeemCalls.length, 1)
  assert.equal(
    redeemCalls[0][0],
    handshakePublicKey.toString('hex'),
    'redeem sent to identity key, not swarm key'
  )
  assert.ok(
    redeemCalls[0][1].inviteId.equals(inviteId),
    'redeem sent with correct inviteId'
  )

  // Simulate the inviter sending back the invite
  inviteApi.emit('invite-received', {
    invitorDeviceId: handshakePublicKey.toString('hex'),
    inviteId: inviteId.toString('hex'),
  })

  // Wait for 'accepted' update
  await onAccepted
  assert.equal(updates[2].status, 'accepted')

  // Wait for 'completed' update
  await onCompleted
  assert.equal(updates[3].status, 'completed')
  assert.equal(updates[3].projectId, projectId)

  // Verify join request is removed from pending
  assert.throws(() => joiner.getJoinRequestById(inviteId.toString('hex')), {
    code: 'JOIN_REQUEST_NOT_FOUND_ERROR',
  })

  // Close the connection
  connection.end()
})
