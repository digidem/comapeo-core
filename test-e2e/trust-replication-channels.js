import test from 'node:test'
import assert from 'node:assert/strict'
import { createManager } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import createTestnet from 'hyperdht/testnet.js'
import { KeyManager } from '@comapeo/crypto'
import { RemoteDiscovery } from '../src/discovery/remote-discovery.js'
import { LocalPeers } from '../src/local-peers.js'
import { pEvent } from 'p-event'
import { getDeviceId } from '../src/utils.js'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import { parseInviteURL } from '../src/invite/invite-urls.js'

/**
 * Create a minimal "fake peer" that can connect to a MapeoManager over
 * remote discovery, exchange device info, and send RPC messages.
 * It does NOT create a project or sync any cores.
 *
 * @param {import('hyperdht/testnet.js').TestNet} testnet
 * @param {number} nodeIndex Which testnet node to use
 * @returns {Promise<{
 *   localPeers: LocalPeers,
 *   remoteDiscovery: RemoteDiscovery,
 *   deviceId: string,
 *   connect: (swarmPublicKey: string) => Promise<void>,
 *   sendRedeem: (deviceId: string, inviteId: Buffer) => Promise<void>,
 *   acceptInvite: (peerId: string, inviteId: Buffer) => Promise<void>,
 *   close: () => Promise<void>,
 * }>}
 */
async function createFakePeer(testnet, nodeIndex) {
  const keyManager = new KeyManager(KeyManager.generateRootKey())
  const deviceId = getDeviceId(keyManager)

  const swarmKey = keyManager.deriveSwarmIdentity(new Date())

  const remoteDiscovery = new RemoteDiscovery({
    identityKeypair: keyManager.getIdentityKeypair(),
    deriveSwarmIdentityKeypair: () => swarmKey,
    swarm: { dht: testnet.nodes[nodeIndex] },
  })

  const localPeers = new LocalPeers()

  // Wire up: when remote discovery gets a connection, hand it to localPeers
  remoteDiscovery.on('connection', (noiseStream) => {
    localPeers.connect(noiseStream, noiseStream.isTrusted)
  })

  /** @param {string} swarmPublicKey Hex-encoded swarm public key to connect to */
  async function connect(swarmPublicKey) {
    await remoteDiscovery.connectPeer(swarmPublicKey, { timeout: 5000 })
  }

  /**
   * Send a RedeemInviteOverInternet message to the given peer.
   * @param {string} peerDeviceId The device ID (noise key hex) of the peer
   * @param {Buffer} inviteId
   */
  async function sendRedeem(peerDeviceId, inviteId) {
    await localPeers.sendRedeemInviteOverInternet(peerDeviceId, { inviteId })
  }

  /**
   * Respond to an invite with ACCEPT.
   * @param {string} peerId The device ID of the peer who sent the invite
   * @param {Buffer} inviteId
   */
  async function acceptInvite(peerId, inviteId) {
    await localPeers.sendInviteResponse(peerId, {
      inviteId,
      decision: InviteResponse_Decision.ACCEPT,
    })
  }

  // Auto-respond to invites with ACCEPT (simplifies the test flow)
  localPeers.on('invite', (peerId, invite) => {
    acceptInvite(peerId, invite.inviteId).catch(() => {})
  })

  async function close() {
    await remoteDiscovery.close()
  }

  return {
    localPeers,
    remoteDiscovery,
    deviceId,
    connect,
    sendRedeem,
    acceptInvite,
    close,
  }
}

test('discovery keys flow to peer only after trust', async (t) => {
  const testnet = await createTestnet(2)
  t.after(() => testnet.destroy())

  // Manager (invitor) with a project
  const manager = createManager('invitor', t, {
    swarm: { dht: testnet.nodes[0] },
  })
  await manager.setDeviceInfo({ name: 'invitor', deviceType: 'desktop' })

  const projectId = await manager.createProject({
    name: 'Test Project',
    projectColor: '#123456',
    projectDescription: 'testing trust channels',
  })
  const project = await manager.getProject(projectId)

  // Create an invite link (this starts the remote discovery listener)
  const url = await project.$member.createInviteLink({ roleId: MEMBER_ROLE_ID })
  const { inviteIdString: inviteId } = parseInviteURL(url)

  // Create the fake peer (use same DHT node as manager, like existing tests)
  const fakePeer = await createFakePeer(testnet, 0)
  t.after(() => fakePeer.close())

  // Collect discovery keys received by the fake peer (register before connect
  // to avoid a race where a key is emitted between connect and listener setup)
  /** @type {Buffer[]} */
  const discoveryKeys = []
  /** @param {Buffer} discoveryKey */
  const onDiscoveryKey = (discoveryKey) => {
    discoveryKeys.push(discoveryKey)
  }
  fakePeer.localPeers.on('discovery-key', onDiscoveryKey)

  // Connect the fake peer to the manager via the swarm public key from the URL
  const { swarmPublicKey } = parseInviteURL(url)
  await fakePeer.connect(swarmPublicKey)

  // Before trust: no discovery keys should have been sent
  assert.equal(
    discoveryKeys.length,
    0,
    'no discovery keys sent to untrusted peer'
  )

  // Set up to catch the invite-link-join-request event
  const onRedeemAttempt = pEvent(manager, 'invite-link-join-request', {
    multiArgs: true,
    timeout: 5000,
  })

  // Fake peer sends the redeem request
  await fakePeer.sendRedeem(manager.deviceId, Buffer.from(inviteId, 'hex'))

  // Manager detected the redeem attempt
  /** @type {[string, string, string]} */
  const [, deviceId, redeemInviteId] = /** @type {any} */ (
    await onRedeemAttempt
  )
  assert.equal(deviceId, fakePeer.deviceId)

  // Now accept the invite - this triggers trustPeer() which triggers replicate()
  // The invite will fail initial sync (fake peer has no project), but we don't care
  const acceptPromise = project.$member
    .acceptInviteLinkRequest(redeemInviteId, deviceId)
    .catch((e) => e) // InitialSyncFailedError is expected

  // Wait for discovery keys to arrive at the fake peer
  await pEvent(fakePeer.localPeers, 'discovery-key', { timeout: 5000 })

  // We should have received at least one discovery key (the creator core)
  assert.ok(
    discoveryKeys.length >= 1,
    `expected at least 1 discovery key after trust, got ${discoveryKeys.length}`
  )

  // Let the accept promise settle (it will fail with InitialSyncFailedError)
  const error = await acceptPromise
  assert.ok(error, 'invite should fail (fake peer has no project to sync)')
  assert.equal(
    error.code,
    'INITIAL_SYNC_FAILED_ERROR',
    'expected InitialSyncFailedError'
  )

  fakePeer.localPeers.off('discovery-key', onDiscoveryKey)
})

test('discovery key received matches project creator core', async (t) => {
  const testnet = await createTestnet(2)
  t.after(() => testnet.destroy())

  const manager = createManager('invitor3', t, {
    swarm: { dht: testnet.nodes[0] },
  })
  await manager.setDeviceInfo({ name: 'invitor3', deviceType: 'desktop' })

  const projectId = await manager.createProject({
    name: 'Key Check Project',
    projectColor: '#111111',
    projectDescription: 'verifying discovery key matches core',
  })
  const project = await manager.getProject(projectId)

  // Get the creator core's discovery key from the project internals
  const { kCoreManager } = await import('../src/mapeo-project.js')
  const creatorCoreDiscoveryKey = /** @type {any} */ (project)[kCoreManager]
    .creatorCore.discoveryKey
  assert.ok(creatorCoreDiscoveryKey, 'creator core has a discovery key')

  const url = await project.$member.createInviteLink({ roleId: MEMBER_ROLE_ID })
  const { inviteIdString: inviteId, swarmPublicKey } = parseInviteURL(url)

  const fakePeer = await createFakePeer(testnet, 0)
  t.after(() => fakePeer.close())

  // Collect discovery keys (register before connect to avoid race)
  /** @type {Buffer[]} */
  const receivedKeys = []
  fakePeer.localPeers.on('discovery-key', (dk) =>
    receivedKeys.push(/** @type {Buffer} */ (dk))
  )

  await fakePeer.connect(swarmPublicKey)

  assert.equal(receivedKeys.length, 0, 'no discovery keys before trust')

  const onRedeemAttempt = pEvent(manager, 'invite-link-join-request', {
    multiArgs: true,
    timeout: 5000,
  })

  await fakePeer.sendRedeem(manager.deviceId, Buffer.from(inviteId, 'hex'))
  /** @type {[string, string, string]} */
  const [, deviceId2, redeemInviteId2] = /** @type {any} */ (
    await onRedeemAttempt
  )

  const acceptPromise = project.$member
    .acceptInviteLinkRequest(redeemInviteId2, deviceId2)
    .catch((e) => e)

  // Wait for the first discovery key
  await pEvent(fakePeer.localPeers, 'discovery-key', { timeout: 5000 })

  // The first discovery key should be the creator core's discovery key
  assert.ok(receivedKeys.length >= 1, 'received at least one discovery key')
  assert.deepEqual(
    receivedKeys[0],
    creatorCoreDiscoveryKey,
    'first discovery key matches the project creator core'
  )

  const error2 = await acceptPromise
  assert.equal(
    error2.code,
    'INITIAL_SYNC_FAILED_ERROR',
    'expected InitialSyncFailedError'
  )
})
