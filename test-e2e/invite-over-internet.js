import test from 'node:test'
import fsPromises from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { createManager, createManagers } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
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
  InviteAbortedError,
  JoinProjectCancelledError,
} from '../src/errors.js'
import { makeInviteURL, parseInviteURL } from '../src/invite/invite-urls.js'
import { temporaryDirectory } from 'tempy'

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

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectFromLink(url)

  const [inviteId, deviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptInviteLinkRequest({
    inviteId,
    deviceId,
  })

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

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectFromLink(url)

  const [inviteId, deviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptInviteLinkRequest({
    inviteId,
    deviceId,
  })

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
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )
  const onFirstInvited = invitee1.joinProjectFromLink(url)

  const [firstInviteId, firstDeviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onFirstInviteRedeemAttempt)
  )
  assert.equal(firstDeviceId, invitee1.deviceId)
  const firstReason = await project.$member.acceptInviteLinkRequest({
    inviteId: firstInviteId,
    deviceId: firstDeviceId,
  })
  assert.equal(firstReason, InviteResponse_Decision.ACCEPT)
  await onFirstInvited

  // Second invitee joins via the same URL
  const onSecondInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )
  const onSecondInvited = invitee2.joinProjectFromLink(url)

  const [secondInviteId, secondDeviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onSecondInviteRedeemAttempt)
  )
  assert.equal(
    secondDeviceId,
    invitee2.deviceId,
    'Second invitee redeemed successfully'
  )
  assert.equal(secondInviteId, firstInviteId, 'Invite ID is the same for both')
  const secondReason = await project.$member.acceptInviteLinkRequest({
    inviteId: secondInviteId,
    deviceId: secondDeviceId,
  })
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

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 50000 }
  )

  const onInvited = invitee.joinProjectFromLink(url)

  const [attemptedRedeemId, deviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

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
      project.$member.acceptInviteLinkRequest({
        inviteId: attemptedRedeemId,
        deviceId: invitee.deviceId,
      }),
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

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectFromLink(url)

  const [inviteId, deviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )
  assert.equal(deviceId, invitee.deviceId)

  // Deny the invite and wait for invitee's join to fail simultaneously
  await Promise.all([
    project.$member.denyInviteLinkRequest({
      inviteId,
      deviceId,
    }),
    assert.rejects(
      onInvited,
      (err) => ensureKnownError(err).code === InviteDeniedByInviterError.code
    ),
  ])
})

test.only('invite over internet can be cancelled by invitee', async (t) => {
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

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'invite-link-join-request',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectFromLink(url)

  const [inviteId, deviceId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )
  assert.equal(deviceId, invitee.deviceId)

  // Cancel the join and wait for invitee's join to fail simultaneously
  await Promise.all([
    invitee.cancelJoinProjectFromLink(url),
    assert.rejects(
      onInvited,
      (err) => ensureKnownError(err).code === JoinProjectCancelledError.code
    ),
  ])

  // Accepting after the invitee disconnected should also fail
  await assert.rejects(
    () =>
      project.$member.acceptInviteLinkRequest({
        inviteId,
        deviceId,
      }),
    (err) => ensureKnownError(err).code === InviteAbortedError.code,
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
  const onError = pEvent(project.$member, 'internet-invite-redeem-error', {
    timeout: 5000,
    multiArgs: true,
  })

  // Try to join with invalid invite ID
  const joinPromise = invitee.joinProjectFromLink(modifiedUrl)

  // The invitor should receive the redeem attempt with an error
  const [error, peerId] = /** @type {[Error, string]} */ (
    /**@type unknown*/ (await onError)
  )
  assert.equal(
    ensureKnownError(error).code,
    UnknownInviteIDRedeemAttemptError.code,
    'Expected UnknownInviteIDRedeemAttemptError'
  )
  assert.equal(peerId, invitee.deviceId, 'Error from expected peer ID')

  // The invitee's join should fail because the connection closes when the invite is invalid
  await assert.rejects(
    joinPromise,
    (err) =>
      ensureKnownError(err).code === InviteRedeemConnectionClosedError.code
  )
})
