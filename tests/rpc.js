// @ts-check
import test from 'brittle'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { MapeoRPC, PeerDisconnectedError } from '../lib/rpc/index.js'
import { keyToId } from '../lib/utils.js'

test('Send invite and accept', async t => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async peers => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT
    })
  })

  replicate(r1, r2)
})

test('Send invite and reject', async t => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async peers => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey })
    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.REJECT
    })
  })

  replicate(r1, r2)
})

test('Send invite and already on project', async t => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async peers => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey })
    t.is(response, MapeoRPC.InviteResponse.ALREADY)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ALREADY
    })
  })

  replicate(r1, r2)
})

test('Send invite with encryption key', async t => {
  t.plan(4)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const encryptionKey = Buffer.allocUnsafe(32).fill(1)

  r1.on('peers', async peers => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, { projectKey, encryptionKey })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.ok(
      invite.encryptionKey?.equals(encryptionKey),
      'invite encryption key correct'
    )
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT
    })
  })

  replicate(r1, r2)
})

test('Disconnected peer shows in state', async t => {
  t.plan(6)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()
  let peerStateUpdates = 0

  r1.on('peers', async peers => {
    t.is(peers.length, 1, 'one peer in state')
    if (peers[0].status === 'connected') {
      t.pass('peer appeared as connected')
      t.is(++peerStateUpdates, 1)
      destroy()
    } else {
      t.pass('peer appeared as disconnected')
      t.is(++peerStateUpdates, 2)
    }
  })

  const destroy = replicate(r1, r2)
})

test('Disconnect results in rejected invite', async t => {
  t.plan(2)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async peers => {
    if (peers[0].status === 'connected') {
      const invite = r1.invite(peers[0].id, { projectKey })
      await t.exception(
        invite,
        PeerDisconnectedError,
        'invite rejected with PeerDisconnectedError'
      )
    } else {
      t.pass('Peer disconnected')
    }
  })

  r2.on('invite', () => {
    destroy()
  })

  const destroy = replicate(r1, r2)
})

test('Invite to multiple peers', async t => {
  // This is catches not tracking invites by peer
  t.plan(2)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()
  const r3 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async peers => {
    if (peers.length < 2) return
    t.pass('connected to two peers')
    const responses = await Promise.all(
      peers.map(peer => r1.invite(peer.id, { projectKey }))
    )
    t.alike(
      responses.sort(),
      [MapeoRPC.InviteResponse.ACCEPT, MapeoRPC.InviteResponse.REJECT],
      'One peer accepted, one rejected'
    )
  })

  r2.on('invite', (peerId, invite) => {
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT
    })
  })

  r3.on('invite', (peerId, invite) => {
    r3.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.REJECT
    })
  })

  replicate(r1, r2)
  replicate(r2, r3)
  replicate(r3, r1)
})

function replicate (rpc1, rpc2) {
  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  rpc1.connect(n1)
  rpc2.connect(n2)

  return async function destroy () {
    return Promise.all([
      new Promise(res => {
        n1.on('close', res)
        n1.destroy()
      }),
      new Promise(res => {
        n2.on('close', res)
        n2.destroy()
      })
    ])
  }
}
