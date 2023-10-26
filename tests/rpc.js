// @ts-check
import test from 'brittle'
import {
  LocalPeers,
  PeerDisconnectedError,
  TimeoutError,
  UnknownPeerError,
} from '../src/rpc/index.js'
import FakeTimers from '@sinonjs/fake-timers'
import { once } from 'events'
import { Duplex } from 'streamx'
import { replicate } from './helpers/rpc.js'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'

test('Send invite and accept', async (t) => {
  t.plan(3)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].deviceId, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, LocalPeers.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Send invite immediately', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  replicate(r1, r2, { kp1, kp2 })

  const responsePromise = r1.invite(kp2.publicKey.toString('hex'), {
    projectKey,
    encryptionKeys: { auth: randomBytes(32) },
  })

  const [peerId, invite] = await once(r2, 'invite')

  t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')

  r2.inviteResponse(peerId, {
    projectKey: invite.projectKey,
    decision: LocalPeers.InviteResponse.ACCEPT,
  })

  t.is(await responsePromise, LocalPeers.InviteResponse.ACCEPT)
})

test('Send invite and reject', async (t) => {
  t.plan(3)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].deviceId, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, LocalPeers.InviteResponse.REJECT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.REJECT,
    })
  })

  replicate(r1, r2)
})

test('Invite to unknown peer', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

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
        decision: LocalPeers.InviteResponse.ACCEPT,
      }),
    UnknownPeerError
  )
})

test('Send invite and already on project', async (t) => {
  t.plan(3)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].deviceId, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, LocalPeers.InviteResponse.ALREADY)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.ALREADY,
    })
  })

  replicate(r1, r2)
})

test('Send invite with encryption key', async (t) => {
  t.plan(4)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const encryptionKeys = {
    auth: Buffer.allocUnsafe(32).fill(1),
    data: Buffer.allocUnsafe(32).fill(2),
  }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].deviceId, {
      projectKey,
      encryptionKeys,
    })
    t.is(response, LocalPeers.InviteResponse.ACCEPT)
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
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Send invite with project info', async (t) => {
  t.plan(4)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const projectInfo = { name: 'MyProject' }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    const response = await r1.invite(peers[0].deviceId, {
      projectKey,
      projectInfo,
      encryptionKeys: { auth: randomBytes(32) },
    })
    t.is(response, LocalPeers.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.alike(invite.projectInfo, projectInfo, 'project info is sent with invite')
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Disconnected peer shows in state', async (t) => {
  t.plan(6)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()
  let peerStateUpdates = 0

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1, 'one peer in state')
    if (peers[0].status === 'connected') {
      t.pass('peer appeared as connected')
      t.is(++peerStateUpdates, 1)
      destroy(new Error())
    } else {
      t.pass('peer appeared as disconnected')
      t.is(++peerStateUpdates, 2)
    }
  })

  const destroy = replicate(r1, r2)
})

test('next tick disconnect does not throw', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const destroy = replicate(r1, r2)
  await Promise.resolve()
  destroy(new Error())
  t.pass()
})

test('Disconnect results in rejected invite', async (t) => {
  t.plan(2)
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    if (peers[0].status === 'connected') {
      const invite = r1.invite(peers[0].deviceId, {
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
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()
  const r3 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    if (peers.length < 2) return
    t.pass('connected to two peers')
    const responses = await Promise.all(
      peers.map((peer) =>
        r1.invite(peer.deviceId, {
          projectKey,
          encryptionKeys: { auth: randomBytes(32) },
        })
      )
    )
    t.alike(
      responses.sort(),
      [LocalPeers.InviteResponse.ACCEPT, LocalPeers.InviteResponse.REJECT],
      'One peer accepted, one rejected'
    )
  })

  r2.on('invite', (peerId, invite) => {
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  r3.on('invite', (peerId, invite) => {
    r3.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.REJECT,
    })
  })

  replicate(r1, r2)
  replicate(r2, r3)
  replicate(r3, r1)
})

test('Multiple invites to a peer, only one response', async (t) => {
  t.plan(2)
  let count = 0
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.on('peers', async (peers) => {
    const responses = await Promise.all([
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
      }),
    ])
    const expected = Array(3).fill(LocalPeers.InviteResponse.ACCEPT)
    t.alike(responses, expected)
  })

  r2.on('invite', (peerId, invite) => {
    if (++count < 3) return
    // Only respond to third invite
    t.is(count, 3)
    r2.inviteResponse(peerId, {
      projectKey: invite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
})

test('Default: invites do not timeout', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())
  t.plan(1)

  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.once('peers', async (peers) => {
    r1.invite(peers[0].deviceId, {
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

  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const projectKey = Buffer.allocUnsafe(32).fill(0)

  r1.once('peers', async (peers) => {
    t.exception(
      r1.invite(peers[0].deviceId, {
        projectKey,
        timeout: 1000,
        encryptionKeys: { auth: randomBytes(32) },
      }),
      TimeoutError
    )
    // Not working right now, because of the new async code
    clock.tick(5001)
  })

  replicate(r1, r2)
})

test('Reconnect peer and send invite', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

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
      decision: LocalPeers.InviteResponse.ACCEPT,
    })
  })

  replicate(r1, r2)
  const [peers] = await once(r1, 'peers')
  t.is(r1.peers.length, 1)
  t.is(peers[0].status, 'connected')
  const response = await r1.invite(peers[0].deviceId, {
    projectKey,
    encryptionKeys: { auth: randomBytes(32) },
  })
  t.is(response, LocalPeers.InviteResponse.ACCEPT)
})

test('invalid stream', (t) => {
  const r1 = new LocalPeers()
  const regularStream = new Duplex()
  t.exception(() => r1.connect(regularStream), 'Invalid stream')
})

test('Send device info', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo' }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    r1.sendDeviceInfo(peers[0].deviceId, expectedDeviceInfo)
  })

  replicate(r1, r2)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      t.is(peers[0].name, expectedDeviceInfo.name)
      res(true)
    })
  })
})

test('Send device info immediately', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo' }

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  replicate(r1, r2, { kp1, kp2 })

  r1.sendDeviceInfo(kp2.publicKey.toString('hex'), expectedDeviceInfo)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      t.is(peers[0].name, expectedDeviceInfo.name)
      res(true)
    })
  })
})

test('Reconnect peer and send device info', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo' }

  const destroy = replicate(r1, r2)
  await once(r1, 'peers')
  await destroy()

  t.is(r1.peers.length, 1)
  t.is(r1.peers[0].status, 'disconnected')

  replicate(r1, r2)

  const [r1peers] = await once(r1, 'peers')
  t.is(r1.peers.length, 1)
  t.is(r1peers[0].status, 'connected')

  r1.sendDeviceInfo(r1peers[0].deviceId, expectedDeviceInfo)

  const [r2Peers] = await once(r2, 'peers')
  t.is(r2Peers[0].name, expectedDeviceInfo.name)
})
