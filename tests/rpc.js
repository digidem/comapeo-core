// @ts-check
import test from 'brittle'
import {
  MapeoRPC,
  PeerDisconnectedError,
  TimeoutError,
  UnknownPeerError,
} from '../src/rpc/index.js'
import FakeTimers from '@sinonjs/fake-timers'
import { once } from 'events'
import { Duplex } from 'streamx'
import { replicate } from './helpers/rpc.js'
import { randomBytes } from 'node:crypto'

test('Send invite and accept', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Send invite and reject', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, MapeoRPC.InviteResponse.REJECT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.REJECT,
    })
  })

  replicate(r1, r2)
})

test('Invite to unknown peer', async (t) => {
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const unknownPeerId = Buffer.allocUnsafe(32).fill(1).toString('hex')
  replicate(r1, r2)

  await once(r1, 'peers')
  await t.exception(
    r1.invite(unknownPeerId, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    }),
    UnknownPeerError
  )
  await t.exception(
    () =>
      r2.inviteResponse(unknownPeerId, {
        projectKey,
        decision: MapeoRPC.InviteResponse.ACCEPT,
      }),
    UnknownPeerError
  )
})

test('Send invite and already on project', async (t) => {
  t.plan(3)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, MapeoRPC.InviteResponse.ALREADY)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ALREADY,
    })
  })

  replicate(r1, r2)
})

test('Send invite with encryption key', async (t) => {
  t.plan(4)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const encryptionKeys = {
    auth: Buffer.allocUnsafe(32).fill(1),
    data: Buffer.allocUnsafe(32).fill(2),
  }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys,
    })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.alike(
      invite.encryptionKeys,
      encryptionKeys,
      'invite encryption keys correct'
    )
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Send invite with project info', async (t) => {
  t.plan(4)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const projectInfo = { name: 'MyProject' }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].id, {
      projectKey,
      projectInfo,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, MapeoRPC.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.alike(invite.projectInfo, projectInfo, 'project info is sent with invite')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Disconnected peer shows in state', async (t) => {
  t.plan(6)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()
  let peerStateUpdates = 0

  r1.on('peers', async (peers) => {
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

test('Disconnect results in rejected invite', async (t) => {
  t.plan(2)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    if (peers[0].status === 'connected') {
      const invite = r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      })
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

test('Invite to multiple peers', async (t) => {
  // This is catches not tracking invites by peer
  t.plan(2)
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()
  const r3 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    if (peers.length < 2) return
    t.pass('connected to two peers')
    const responses = await Promise.all(
      peers.map((peer) =>
        r1.invite(peer.id, {
          projectKey,
          encryptionKeys: { auth: randomBytes(32) },
        })
      )
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
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  r3.on('invite', (peerId, invite) => {
    r3.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.REJECT,
    })
  })

  replicate(r1, r2)
  replicate(r2, r3)
  replicate(r3, r1)
})

test('Multiple invites to a peer, only one response', async (t) => {
  t.plan(2)
  let count = 0
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    const responses = await Promise.all([
      r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      r1.invite(peers[0].id, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
    ])
    const expected = Array(3).fill(MapeoRPC.InviteResponse.ACCEPT)
    t.alike(responses, expected)
  })

  r2.on('invite', (peerId, invite) => {
    if (++count < 3) return
    // Only respond to third invite
    t.is(count, 3)
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Default: invites do not timeout', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())
  t.plan(1)

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.once('peers', async (peers) => {
    r1.invite(peers[0].id, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    }).then(
      () => t.fail('invite promise should not resolve'),
      () => t.fail('invite promise should not reject')
    )
    await clock.tickAsync('01:00') // Advance 1 hour
    t.pass('Waited 1 hour without invite timing out')
  })

  replicate(r1, r2)
})

test('Invite timeout', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())
  t.plan(1)

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.once('peers', async (peers) => {
    t.exception(
      r1.invite(peers[0].id, {
        projectKey,
        timeout: 5000,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      TimeoutError
    )
    clock.tick(5001)
  })

  replicate(r1, r2)
})

test('Reconnect peer and send invite', async (t) => {
  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  const destroy = replicate(r1, r2)
  await once(r1, 'peers')
  await destroy()

  t.is(r1.peers.length, 1)
  t.is(r1.peers[0].status, 'disconnected')

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: MapeoRPC.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
  const [peers] = await once(r1, 'peers')
  t.is(r1.peers.length, 1)
  t.is(peers[0].status, 'connected')
  const response = await r1.invite(peers[0].id, {
    projectKey,
    encryptionKeys: { auth: randomBytes(32) },
  })
  t.is(response, MapeoRPC.InviteResponse.ACCEPT)
})

test('invalid stream', (t) => {
  const r1 = new MapeoRPC()
  const regularStream = new Duplex()
  // @ts-expect-error
  t.exception(() => r1.connect(regularStream), 'Invalid stream')
})

test('Send device info', async (t) => {
  t.plan(3)

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo' }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    r1.sendDeviceInfo(peers[0].id, expectedDeviceInfo)
  })

  r2.on('device-info', ({ deviceId, ...deviceInfo }) => {
    t.ok(deviceId)
    t.alike(deviceInfo, expectedDeviceInfo)
  })

  replicate(r1, r2)
})

test('Reconnect peer and send device info', async (t) => {
  t.plan(6)

  const r1 = new MapeoRPC()
  const r2 = new MapeoRPC()

  const expectedDeviceInfo = { name: 'mapeo' }

  const destroy = replicate(r1, r2)
  await once(r1, 'peers')
  await destroy()

  t.is(r1.peers.length, 1)
  t.is(r1.peers[0].status, 'disconnected')

  r2.on('device-info', ({ deviceId, ...deviceInfo }) => {
    t.ok(deviceId)
    t.alike(deviceInfo, expectedDeviceInfo)
  })

  replicate(r1, r2)

  const [peers] = await once(r1, 'peers')
  t.is(r1.peers.length, 1)
  t.is(peers[0].status, 'connected')

  r1.sendDeviceInfo(peers[0].id, expectedDeviceInfo)
})
