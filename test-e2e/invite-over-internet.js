import test from 'node:test'
import fsPromises from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { createManager, createManagers } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import createTestnet from 'hyperdht/testnet.js'
import { KeyManager } from '@mapeo/crypto'
import { RemoteDiscovery } from '../src/discovery/remote-discovery.js'
import assert from 'node:assert/strict'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from '../src/generated/rpc.js'
import {
  UnknownInviteIDRedeemAttemptError,
  TimeoutError,
  InviteRedeemConnectionClosedError,
  ensureKnownError,
  InviteNotYetRedeemedError,
  InviteDeniedByInviterError,
  JoinProjectCancelledError,
  UnknownInviteIDError,
} from '../src/errors.js'
import { makeInviteURL, parseInviteURL } from '../src/invite/invite-urls.js'
import { temporaryDirectory } from 'tempy'
import { kWaitForInitialSyncWithPeer } from '../src/sync/sync-api.js'
import { LocalPeers } from '../src/local-peers.js'

test('invite over internet and join from URL', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 5000,
  })

  const abortOnFailedJoin = new AbortController()

  const onConnected = pEvent(invitee, 'invite-link-join-connected', {
    signal: abortOnFailedJoin.signal,
    timeout: 5000,
  })
  const onInvited = invitee.joinProjectFromLink(url)

  onInvited.catch((e) => abortOnFailedJoin.abort(e))

  const [connectedURL, [invitedProjectId, deviceId, inviteId]] =
    await Promise.all([
      onConnected,
      /** @type {[string, string, string]} */ (
        /**@type unknown*/ (await onInviteRedeemAttempt)
      ),
    ])

  assert.equal(connectedURL, url)
  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  const onAccepted = pEvent(invitee, 'invite-link-join-accepted', {
    signal: abortOnFailedJoin.signal,
    timeout: 5000,
  })

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const [acceptedURL, reason] = await Promise.all([
    onAccepted,
    project.$member.acceptInviteLinkRequest(inviteId, deviceId),
  ])

  assert.equal(acceptedURL, url)
  assert.equal(reason, InviteResponse_Decision.ACCEPT)

  const gotProjectId = await onInvited

  assert.equal(gotProjectId, projectId, 'joined expected project')

  // Test that initial sync happened by seeing if the auth cores got exchanged
  const inviteeProject = await invitee.getProject(gotProjectId)

  const members = await inviteeProject.$member.getMany()

  assert.equal(members.length, 2, 'Seeing both members after initial sync')
})

test('invite over internet, close, reopen, and join from URL', async (t) => {
  const dbFolder = temporaryDirectory()
  const coreStorage = temporaryDirectory()
  const directories = [dbFolder, coreStorage]
  async function closeDirs() {
    await Promise.all(
      directories.map((dir) =>
        fsPromises.rm(dir, {
          recursive: true,
        })
      )
    )
  }

  t.after(closeDirs)
  let invitor = createManager('invitor', t, {
    coreStorage,
    dbFolder,
  })
  const invitee = createManager('invitee', t)

  await invitor.setDeviceInfo({ name: 'invitor', deviceType: 'desktop' })
  await invitee.setDeviceInfo({ name: 'invitee', deviceType: 'desktop' })

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  let project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  await invitor.close()
  invitor = createManager('invitor', t, {
    coreStorage,
    dbFolder,
  })

  project = await invitor.getProject(projectId)

  const pending = await project.$member.listInviteLinks()

  assert.deepEqual(
    pending.map((p) => p.url),
    [url],
    'Pending internet invites loaded on reload'
  )

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 5000,
  })

  const onInvited = invitee.joinProjectFromLink(url)

  const [invitedProjectId, deviceId, inviteId] =
    /** @type {[string, string, string]} */ (
      /**@type unknown*/ (await onInviteRedeemAttempt)
    )

  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptInviteLinkRequest(
    inviteId,
    deviceId
  )

  assert.equal(reason, InviteResponse_Decision.ACCEPT)

  const gotProjectId = await onInvited

  assert.equal(gotProjectId, projectId, 'joined expected project')
})

test('invite over internet can be redeemed by multiple peers', async (t) => {
  const managers = await createManagers(3, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee1, invitee2] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  // First invitee joins
  const onFirstInviteRedeemAttempt = pEvent(
    invitor,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )
  const onFirstInvited = invitee1.joinProjectFromLink(url)

  const [firstProjectId, firstDeviceId, firstInviteId] =
    /** @type {[String, string, string]} */ (
      /**@type unknown*/ (await onFirstInviteRedeemAttempt)
    )
  assert.equal(firstProjectId, projectId)
  assert.equal(firstDeviceId, invitee1.deviceId)
  const firstReason = await project.$member.acceptInviteLinkRequest(
    firstInviteId,
    firstDeviceId
  )
  assert.equal(firstReason, InviteResponse_Decision.ACCEPT)
  await onFirstInvited

  // Second invitee joins via the same URL
  const onSecondInviteRedeemAttempt = pEvent(
    invitor,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )
  const onSecondInvited = invitee2.joinProjectFromLink(url)

  const [secondProjectId, secondDeviceId, secondInviteId] =
    /** @type {[String, string, string]} */ (
      /**@type unknown*/ (await onSecondInviteRedeemAttempt)
    )
  assert.equal(secondProjectId, projectId)
  assert.equal(
    secondDeviceId,
    invitee2.deviceId,
    'Second invitee redeemed successfully'
  )
  assert.equal(secondInviteId, firstInviteId, 'Invite ID is the same for both')
  const secondReason = await project.$member.acceptInviteLinkRequest(
    secondInviteId,
    secondDeviceId
  )
  assert.equal(secondReason, InviteResponse_Decision.ACCEPT)
  await onSecondInvited

  // Verify invite is still pending for future redeemers
  const pending = await project.$member.listInviteLinks()
  assert.deepEqual(
    pending.map((p) => p.url),
    [url],
    'Invite still pending after two redeems'
  )
})

test('invite over internet errors if invitor deviceID is invalid', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const parsed = parseInviteURL(url)
  const modifiedUrl = makeInviteURL({
    ...parsed,
    swarmPublicKey: randomBytes(32).toString('hex'),
  })

  // Try to join with invalid device ID - should fail immediately
  // The invitee won't be able to connect to the non-existent device
  await assert.rejects(
    invitee.joinProjectFromLink(modifiedUrl, { timeout: 1000 }),
    (err) => ensureKnownError(err).code === TimeoutError.code
  )
})

test('invite over internet errors if inviter closes before accepting', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 50000,
  })

  const onInvited = invitee.joinProjectFromLink(url)

  const [invitedProjectId, deviceId, attemptedRedeemId] =
    /** @type {[string, string, string]} */ (
      /**@type unknown*/ (await onInviteRedeemAttempt)
    )

  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  await Promise.all([
    // The invitee's join should fail because the invitor disconnected
    assert.rejects(
      onInvited,
      (err) =>
        ensureKnownError(err).code === InviteRedeemConnectionClosedError.code
    ),
    // Close the invitor before accepting
    invitor.close(),
  ])

  await assert.rejects(
    () =>
      project.$member.acceptInviteLinkRequest(
        attemptedRedeemId,
        invitee.deviceId
      ),
    (err) => ensureKnownError(err).code === InviteNotYetRedeemedError.code,
    'Accepting after a disconnect causes an error'
  )
})

test('invite over internet can be denied by inviter', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 5000,
  })

  const onInvited = invitee.joinProjectFromLink(url)

  const [invitedProjectId, deviceId, inviteId] =
    /** @type {[string, string, string]} */ (
      /**@type unknown*/ (await onInviteRedeemAttempt)
    )

  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  // Deny the invite and wait for invitee's join to fail simultaneously
  await Promise.all([
    assert.rejects(
      onInvited,
      (err) => ensureKnownError(err).code === InviteDeniedByInviterError.code
    ),
    project.$member.denyInviteLinkRequest(inviteId, deviceId),
  ])
})

test('invite over internet can be cancelled by invitee', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 5000,
  })

  const onInvited = invitee.joinProjectFromLink(url)

  const [invitedProjectId, deviceId, inviteId] =
    /** @type {[string, string, string]} */ (
      /**@type unknown*/ (await onInviteRedeemAttempt)
    )

  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  // Cancel the join and wait for invitee's join to fail simultaneously
  await Promise.all([
    assert.rejects(
      onInvited,
      (err) => ensureKnownError(err).code === JoinProjectCancelledError.code
    ),
    invitee.cancelJoinProjectFromLink(url),
  ])

  // Accepting after the invitee disconnected should also fail
  await assert.rejects(
    () => project.$member.acceptInviteLinkRequest(inviteId, deviceId),
    (err) => ensureKnownError(err).code === InviteNotYetRedeemedError.code,
    'Accepting after cancel causes an error'
  )
})

test('invite over internet errors if invitee uses invalid inviteId', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const parsed = parseInviteURL(url)
  const modifiedUrl = makeInviteURL({
    ...parsed,
    inviteIdString: randomBytes(32).toString('hex'),
  })

  // Expect the invitor to emit an error when the invalid invite is attempted
  const onError = /** @type {Promise<[Error, string, string]>} */ (
    /**@type unknown*/ (
      pEvent(invitor, 'invite-link-join-request-error', {
        timeout: 5000,
        multiArgs: true,
      })
    )
  )

  // We need to listen to both promises at the same time to avoid warnings
  await Promise.all([
    onError.then(([error, peerId]) => {
      // The invitor should receive the redeem attempt with an error
      assert.equal(
        ensureKnownError(error).code,
        UnknownInviteIDRedeemAttemptError.code,
        'Expected UnknownInviteIDRedeemAttemptError'
      )
      assert.equal(peerId, invitee.deviceId, 'Error from expected peer ID')
    }),
    assert.rejects(
      // Try to join with invalid invite ID
      invitee.joinProjectFromLink(modifiedUrl),
      (err) => ensureKnownError(err).code === UnknownInviteIDError.code
    ),
  ])
})

test('invite over internet can be cancelled before connection to non-existing peer', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  // Modify the URL to point to a non-existing peer
  const parsed = parseInviteURL(url)
  const modifiedUrl = makeInviteURL({
    ...parsed,
    swarmPublicKey: randomBytes(32).toString('hex'),
  })

  // Start join — it will try to connect to the non-existing peer
  const onInvited = invitee.joinProjectFromLink(modifiedUrl)

  // Give the connection attempt a moment to start, then cancel
  await new Promise((resolve) => setTimeout(resolve, 200))

  await Promise.all([
    assert.rejects(
      onInvited,
      (err) => ensureKnownError(err).code === JoinProjectCancelledError.code
    ),
    invitee.cancelJoinProjectFromLink(modifiedUrl),
  ])
})

test('invite over the internet removes project and removes member when failing to sync', async (t) => {
  const managers = await createManagers(2, t, 'device_type_unspecified', {
    useTestnet: true,
  })
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const origSyncWithPeer = project.$sync[kWaitForInitialSyncWithPeer]

  project.$sync[kWaitForInitialSyncWithPeer] = async () => {
    await new Promise((resolve) => setTimeout(resolve, 200))
    throw new Error('Unexpected error!')
  }

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(invitor, 'invite-link-join-request', {
    multiArgs: true,
    rejectionEvents: ['invite-link-join-request-error'],
    timeout: 5000,
  })

  const onInvited = invitee.joinProjectFromLink(url)

  const [invitedProjectId, deviceId, inviteId] =
    /** @type {[string, string, string]} */ (
      /**@type unknown*/ (await onInviteRedeemAttempt)
    )

  assert.equal(invitedProjectId, projectId)
  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const onInviteeAccepted = project.$member.acceptInviteLinkRequest(
    inviteId,
    deviceId
  )

  await Promise.all([
    assert.rejects(onInvited),
    assert.rejects(onInviteeAccepted),
  ])

  const members = await project.$member.getMany()

  assert.equal(members.length, 1, 'only invitor exists')

  const projects = await invitee.listProjects()

  assert.equal(projects.length, 0, 'invitee no longer in a project')

  project.$sync[kWaitForInitialSyncWithPeer] = origSyncWithPeer

  invitor.on('invite-link-join-request', (_projectId, deviceId, inviteId) => {
    project.$member.acceptInviteLinkRequest(inviteId, deviceId)
  })

  const gotProjectId = await invitee.joinProjectFromLink(url)

  assert.equal(gotProjectId, projectId, 'Invited to project')
})

test('untrusted peer is disconnected after untrustedTimeout', async (t) => {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
  })
  const testnet = await createTestnet(2)
  t.after(() => testnet.destroy())

  const UNTRUSTED_TIMEOUT = 1000

  const manager = createManager('invitor', t, {
    swarm: { dht: testnet.nodes[0] },
    untrustedTimeout: UNTRUSTED_TIMEOUT,
  })

  await manager.setDeviceInfo({ name: 'invitor', deviceType: 'desktop' })

  const projectId = await manager.createProject({
    name: 'Test Project',
  })
  const project = await manager.getProject(projectId)

  const url = await project.$member.createInviteLink({
    roleId: MEMBER_ROLE_ID,
  })

  const { swarmPublicKey } = parseInviteURL(url)

  // Create a separate RemoteDiscovery to connect as an untrusted peer
  const identityKeypair = new KeyManager(
    Buffer.alloc(16, 99)
  ).getIdentityKeypair()
  const swarmKeypair = new KeyManager(
    Buffer.alloc(16, 100)
  ).getIdentityKeypair()

  const remoteDiscovery = new RemoteDiscovery({
    identityKeypair,
    deriveSwarmIdentityKeypair: () => swarmKeypair,
    swarm: { dht: testnet.nodes[0] },
  })
  t.after(() => remoteDiscovery.close())

  const localPeers = new LocalPeers()

  await remoteDiscovery.start()

  // Connect to the manager's swarm key (inbound on manager side → isTrusted = false)
  const connection = await remoteDiscovery.connectPeer(swarmPublicKey, {
    timeout: 10000,
  })

  // Set up protomux connection
  localPeers.connect(connection, true)

  // Connection should close within untrustedTimeout + small buffer
  await pEvent(connection, 'close', { timeout: UNTRUSTED_TIMEOUT + 2000 })
})
