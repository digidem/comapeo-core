import test from 'node:test'
import fsPromises from 'node:fs/promises'
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
  UnknownInviteIDError,
} from '../src/errors.js'
import crypto from 'node:crypto'
import { temporaryDirectory } from 'tempy'

test('invite over internet and join from URL', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'internet-invite-redeemed',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectOverInternet(url)

  const [deviceId, inviteId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptRedeemedInvite(inviteId)

  assert.equal(reason, InviteResponse_Decision.ACCEPT)

  const gotProjectId = await onInvited

  assert.equal(gotProjectId, projectId, 'joined expected project')

  // TODO: Test that initial sync happened
})

test.only('invite over internet, close, reopen, and join from URL', async (t) => {
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

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  await invitor.close()
  invitor = createManager('invitor', t, {
    coreStorage,
    dbFolder,
  })

  project = await invitor.getProject(projectId)

  const pending = await project.$member.pendingInternetInvites()

  assert.deepEqual(pending, [url], 'Pending internet invites loaded on reload')

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'internet-invite-redeemed',
    { multiArgs: true, timeout: 5000 }
  )

  const onInvited = invitee.joinProjectOverInternet(url)

  const [deviceId, inviteId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptRedeemedInvite(inviteId)

  assert.equal(reason, InviteResponse_Decision.ACCEPT)

  const gotProjectId = await onInvited

  assert.equal(gotProjectId, projectId, 'joined expected project')
})

test('invite over internet errors if invitor deviceID is invalid', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  // Parse and modify the URL to use an invalid device ID
  const urlObj = new URL(url)
  const params = new URLSearchParams(urlObj.hash.slice(1))
  const invalidDeviceId = '0'.repeat(64) // Invalid device ID
  params.set('d', invalidDeviceId)
  urlObj.hash = params.toString()
  const modifiedUrl = urlObj.toString()

  // Try to join with invalid device ID - should fail immediately
  // The invitee won't be able to connect to the non-existent device
  await assert.rejects(
    invitee.joinProjectOverInternet(modifiedUrl, { timeout: 1000 }),
    (err) => ensureKnownError(err).code === TimeoutError.code
  )
})

test('invite over internet errors if inviter closes before accepting', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  const onInviteRedeemAttempt = pEvent(
    project.$member,
    'internet-invite-redeemed',
    { multiArgs: true, timeout: 5000 }
  )

  const onInviteCancelled = pEvent(project.$member, 'internet-invite-cancelled')

  const onInvited = invitee.joinProjectOverInternet(url)

  const [deviceId, attemptedRedeemId] = /** @type {[string, string]} */ (
    /**@type unknown*/ (await onInviteRedeemAttempt)
  )

  assert.equal(deviceId, invitee.deviceId)

  // Close the invitor before accepting
  invitor.close()

  // The invitee's join should fail because the invitor disconnected
  await assert.rejects(
    onInvited,
    (err) =>
      ensureKnownError(err).code === InviteRedeemConnectionClosedError.code
  )

  const cancelledId = await onInviteCancelled
  assert.equal(cancelledId, attemptedRedeemId, 'redeemed invite got cancelled')

  const pending = await project.$member.pendingInternetInvites()

  assert.equal(pending.length, 0, 'Invite got cancelled on fail')

  await assert.rejects(
    () => project.$member.acceptRedeemedInvite(attemptedRedeemId),
    (err) => ensureKnownError(err).code === UnknownInviteIDError.code,
    'Accepting after a disconnect causes an error'
  )
})

test('invite over internet errors if invitee uses random invalid inviteId', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers

  const projectId = await invitor.createProject({
    name: 'Mapeo',
    projectColor: '#123456',
    projectDescription: 'fun project',
  })
  const project = await invitor.getProject(projectId)

  const url = await project.$member.inviteOverInternet({
    roleId: MEMBER_ROLE_ID,
  })

  // Parse and modify the URL to use an invalid invite ID
  const urlObj = new URL(url)
  const params = new URLSearchParams(urlObj.hash.slice(1))
  const invalidInviteId = crypto.randomBytes(32).toString('hex') // Random 32-byte invite ID
  params.set('i', invalidInviteId)
  urlObj.hash = params.toString()
  const modifiedUrl = urlObj.toString()

  // Expect the invitor to emit an error when the invalid invite is attempted
  const onError = pEvent(project.$member, 'internet-invite-redeem-error', {
    timeout: 5000,
    multiArgs: true,
  })

  // Try to join with invalid invite ID
  const joinPromise = invitee.joinProjectOverInternet(modifiedUrl)

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
