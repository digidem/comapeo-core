import test from 'node:test'
import { createManagers } from './utils.js'
import { MEMBER_ROLE_ID } from '../src/roles.js'
import assert from 'node:assert/strict'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from '../src/generated/rpc.js'

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

  const [deviceId, inviteId] = await onInviteRedeemAttempt

  assert.equal(deviceId, invitee.deviceId)

  // Show the user the device ID and their name and have them verify the invitee sees the same device ID
  // We should either take the first 4-8 bytes from the deviceID or derive something visual like emoji
  const reason = await project.$member.acceptRedeemedInvite(inviteId)

  assert.equal(reason, InviteResponse_Decision.ACCEPT)

  const gotProjectId = await onInvited

  assert.equal(gotProjectId, projectId, 'joined expected project')

  // TODO: Test that initial sync happened
})
