# Inviting New Mebers Over the Internet

## Concepts

## Steps

- Invitor: Set up project
- Invitor: create invite link
- Invitor: send link out of bounds
- Invitor: wait for invite-link-join-request
- Invitee: get Invitor name and project name from the link
- Invitee: use invite link to connect and join
  - On accept gets a regular project invite and auto accepts/joins it
	- resolves to new project id
	- rejects if you can't connect
	- rejects if you get denied
	- rejects if you disconnect part way through
	- rejects if you cancel the join
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
	inviteIdString
} = parseInviteURL(url)

manager.on('invite-link-join-connected', (url) => {
  // Connected to the invitor and waiting to join or get denied
  // Show waiting for accept screen
})

manager.on('invite-link-join-accepted', (url) => {
  // Invitor has accepted us and we're now joining
  // Show now joining screen
})

// Connect to the invitor, send request, join project with initial sync
// Show Waiting to connect screen until we get the connected event or react to the errors
// Once resolved show joined screen
const projectId = await manager.joinProjectFromLink(url)
// InviteRedeemConnectionClosedError => Connection error page
// UnknownInviteIDError => Invite has expried page
// InviteDeniedByInviterError => Request denied page

await manager.cancelJoinProjectFromLink(url)
// InvalidInternetInviteURLError
```

