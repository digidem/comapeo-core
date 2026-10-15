import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { InviteLinkRPC } from '../src/invite/invite-link-rpc.js'
import { keyToId } from '../src/utils.js'
import { pEvent } from 'p-event'

function testInviteId() {
  return randomBytes(32)
}

const timeout = 100

/**
 * Connect two InviteLinkRPC instances over a piped duplex noise stream.
 *
 * @param {InviteLinkRPC} rpc1
 * @param {InviteLinkRPC} rpc2
 * @returns {{
 *   open: Promise<void>,
 *   deviceId1: string,
 *   deviceId2: string,
 *   destroy: () => Promise<void>
 * }}
 */
function replicate(rpc1, rpc2) {
  const kp1 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(0))
  const kp2 = NoiseSecretStream.keyPair(Buffer.allocUnsafe(32).fill(1))
  const n1 = new NoiseSecretStream(true, undefined, { keyPair: kp1 })
  const n2 = new NoiseSecretStream(false, undefined, { keyPair: kp2 })

  // @ts-expect-error - pipe raw streams together
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  // peerIdFromNoise uses the remote's public key
  const deviceId1 = keyToId(kp1.publicKey)
  const deviceId2 = keyToId(kp2.publicKey)

  const open = (async () => {
    // Test streams aren't fully "authed", so cast past the type
    await Promise.all([
      rpc1.handleConnection(/** @type {any} */ (n1)),
      rpc2.handleConnection(/** @type {any} */ (n2)),
    ])
  })()

  return {
    open,
    deviceId1,
    deviceId2,
    destroy: async () => {
      await Promise.all([n1.destroy(), n2.destroy()])
    },
  }
}

test('accept round trip over duplex streams', async () => {
  const rpc1 = new InviteLinkRPC()
  const rpc2 = new InviteLinkRPC()
  const { open, deviceId1, deviceId2, destroy } = replicate(rpc1, rpc2)
  await open

  const inviteId = testInviteId()
  const rpc2Accepted = pEvent(rpc2, 'accepted', { timeout })

  // When rpc2 receives the accept, ack it so rpc1.accept resolves
  const onAckSent = rpc2Accepted.then(() => rpc2.acceptAck(inviteId, deviceId1))

  await rpc1.accept(inviteId, deviceId2)

  const msg = await rpc2Accepted
  assert.deepEqual(msg.inviteId, inviteId, 'rpc2 received the accept')

  await onAckSent

  await destroy()
})

test('deny round trip over duplex streams', async () => {
  const rpc1 = new InviteLinkRPC()
  const rpc2 = new InviteLinkRPC()
  const { open, deviceId1, deviceId2, destroy } = replicate(rpc1, rpc2)
  await open

  const inviteId = testInviteId()
  const rpc2Denied = pEvent(rpc2, 'denied', { timeout })

  // Ack the deny so rpc1.deny can proceed to disconnect
  const onAckSent = rpc2Denied.then(() => rpc2.denyAck(inviteId, deviceId1))

  await rpc1.deny(inviteId, deviceId2)

  const msg = await rpc2Denied
  assert.deepEqual(msg.inviteId, inviteId, 'rpc2 received the deny')

  await onAckSent

  await destroy()
})

test('redeem round trip over duplex streams', async () => {
  const rpc1 = new InviteLinkRPC()
  const rpc2 = new InviteLinkRPC()
  const { open, deviceId1, deviceId2, destroy } = replicate(rpc1, rpc2)
  await open

  const inviteId = testInviteId()
  const rpc1Redeemed = pEvent(rpc1, 'redeemed', { timeout })

  // When rpc1 receives the redeem, ack it so rpc2.redeem resolves
  const onAckSent = rpc1Redeemed.then(() => rpc1.redeemAck(inviteId, deviceId2))

  await rpc2.redeem(inviteId, deviceId1)

  const msg = await rpc1Redeemed
  assert.deepEqual(msg.inviteId, inviteId, 'rpc1 received the redeem')

  await onAckSent

  await destroy()
})
