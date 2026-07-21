# Inviting New Members Over the Internet

## Concepts

## Steps

- Invitor: Set up project
- Invitor: create invite link
- Invitor: send link out of bounds
- Invitor: wait for `invite-link-join-request`
- Invitee: get Invitor name and project name from the link
- Invitee: use invite link to connect and join
  - Creates a join request and listens to `join-request-update` events for progress
  - On `completed` the join request contains the resolved project ID
  - On `failed` the join request contains the error
- Invitor: Get `invite-link-join-request`
- Invitor: Accept invite link request which sends them an invite and follows the usual flow
- **OR** Invitor: Deny invite link request which disconnects and errors them out

## Examples

## Invitor Flow

```JavaScript
manager.on('invite-link-join-request', async (projectId, deviceId, inviteId,) => {
  const project = await manager.getProject(projectId)

  // Reason is same as from invite api
  // Throws if there is an error during the invite proces
  const reason = await project.$member.acceptInviteLinkRequest(inviteId, deviceId)
  // InviteNotYetRedeemedError
  // UnknownInviteIDError
  // PeerDisconnectedSinceRedeemingInviteError
  // InviteAbortedError

  // You can also deny the request
  await project.$member.denyInviteLinkRequest(inviteId, deviceId)
})

// creat a new invite link
const url = await project.$member.createInviteLink({
  roleId: MEMBER_ROLE_ID,
})
// InvalidProjectNameError

// cancel at any time
await project.$member.cancelInviteLink(url)
// InvalidInternetInviteURLError

// get curren list
const [{
  url,
  inviteId,
  roleId,
  createdAt,
  expiresAt,
}] = await project.$member.listInviteLinks(url)
```

## Invitee Flow

```JavaScript
import {parseInviteURL} from '@comapeo/core/invite-urls.js'

const {
	invitorName,
	projectName,
	expiresAt,
	inviteIdString,
} = parseInviteURL(url)

// Listen for join progress updates
// update.status: 'connecting' | 'connected' | 'accepted' | 'completed' | 'failed'
// update.projectId is set on 'completed'
// update.error is set on 'failed'
manager.inviteLinks.on('join-request-update', (update) => {
  switch (update.status) {
    case 'connecting':
      // Showing "waiting to connect" screen
      break
    case 'connected':
      // Connected to the invitor and waiting for accept/deny
      // Show "waiting for accept" screen
      break
    case 'accepted':
      // Invitor has accepted, initial sync in progress
      // Show "joining project" screen
      break
    case 'completed':
      // Join succeeded — update.projectId has the project public ID
      break
    case 'failed':
      // Join failed — update.error has the reason
      break
  }
})

// Start the join (fire-and-forget, returns a JoinRequest synchronously)
const {
  inviteId,
  swarmPublicKey,
  url: originalUrl,
  status,     // 'connecting' | 'connected' | 'accepted' | 'completed' | 'failed'
  error,      // Error | null — set on 'failed'
  projectId,  // string | undefined — set on 'completed'
} = manager.inviteLinks.createJoinRequest(url)
// ExistingJoinRequestError — already joining with this invite ID

// Cancel the join at any time (use inviteId from the URL or joinRequest)
manager.inviteLinks.cancelJoinRequest(inviteIdString)
// JoinRequestNotFoundError — no in-flight join for this invite ID

// You can also list all in-flight join requests
const requests = manager.inviteLinks.getJoinRequests()
```

### Awaiting Join Completion

For a simpler promise-based flow, use `p-event` to wait for the terminal state:

```JavaScript
import {pEvent} from 'p-event'

const {inviteIdString} = parseInviteURL(url)

// Wait for completed or failed status
const update = await pEvent(manager.inviteLinks, 'join-request-update', {
  timeout: 60_000,
  filter: (u) =>
    u.inviteId === inviteIdString &&
    (u.status === 'completed' || u.status === 'failed'),
})

if (update.status === 'completed') {
  const projectId = update.projectId
  // joined!
} else {
  throw update.error
  // InviteRedeemConnectionClosedError — connection lost
  // UnknownInviteIDError — invite expired or invalid
  // InviteDeniedByInviterError — invitor denied the request
  // JoinProjectCancelledError — cancelled by invitee
}

// Start the join (must be set up before awaiting)
manager.inviteLinks.createJoinRequest(url)
```
