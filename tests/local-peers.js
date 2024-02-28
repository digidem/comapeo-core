// @ts-check
import test from 'tape'
import { rejects } from './helpers/assertions.js'
import {
  LocalPeers,
  PeerDisconnectedError,
  TimeoutError,
  UnknownPeerError,
} from '../src/local-peers.js'
import FakeTimers from '@sinonjs/fake-timers'
import { once } from 'events'
import { Duplex } from 'streamx'
import { replicate } from './helpers/local-peers.js'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Protomux from 'protomux'
import { setTimeout as delay } from 'timers/promises'
import { ROLES, MEMBER_ROLE_ID } from '../src/roles.js'

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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
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
    roleName: ROLES[MEMBER_ROLE_ID].name,
    invitorName: 'device0',
  })

  const [peerId, invite] = await once(r2, 'invite')

  t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')

  r2.inviteResponse(peerId, {
    projectKey: invite.projectKey,
    decision: LocalPeers.InviteResponse.ACCEPT,
  })

  t.is(await responsePromise, LocalPeers.InviteResponse.ACCEPT)
})

test('Send invite, duplicate connections', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const invite = {
    projectKey: Buffer.allocUnsafe(32).fill(0),
    encryptionKeys: { auth: randomBytes(32) },
    roleName: ROLES[MEMBER_ROLE_ID].name,
    invitorName: 'device0',
  }

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  const destroy1 = replicate(r1, r2, { kp1, kp2 })
  const [peers1] = await once(r1, 'peers')
  await delay(1) // Ensure that connectedAt is different
  const destroy2 = replicate(r1, r2, { kp1, kp2 })
  const [peers2] = await once(r1, 'peers')

  t.is(peers1.length, 1)
  t.is(peers2.length, 1)
  t.is(peers1[0].connectedAt, peers2[0].connectedAt, 'first connected is used')

  {
    const responsePromise = r1.invite(peers1[0].deviceId, invite)
    const [peerId, receivedInvite] = await once(r2, 'invite')
    t.deepEqual(receivedInvite, invite)

    r2.inviteResponse(peerId, {
      projectKey: receivedInvite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })

    t.is(await responsePromise, LocalPeers.InviteResponse.ACCEPT)
  }

  destroy1()
  const [peers3] = await once(r1, 'peers')

  t.is(peers3.length, 1)
  t.ok(
    peers3[0].connectedAt > peers1[0].connectedAt,
    `later connected peer is not used: ${peers3[0].connectedAt} ${peers1[0].connectedAt}`
  )

  {
    const responsePromise = r1.invite(peers1[0].deviceId, invite)
    const [peerId, receivedInvite] = await once(r2, 'invite')
    t.deepEqual(receivedInvite, invite)

    r2.inviteResponse(peerId, {
      projectKey: receivedInvite.projectKey,
      decision: LocalPeers.InviteResponse.ACCEPT,
    })

    t.is(await responsePromise, LocalPeers.InviteResponse.ACCEPT)
  }

  const now = Date.now()
  destroy2()
  const [peers4] = await once(r1, 'peers')
  t.is(peers4.length, 1)
  t.is(peers4[0].status, 'disconnected')
  t.ok(peers4[0].disconnectedAt >= now, 'most recently disconnected exposed')
})

test('Duplicate connections with immediate disconnect', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const invite = {
    projectKey: Buffer.allocUnsafe(32).fill(0),
    encryptionKeys: { auth: randomBytes(32) },
    roleName: ROLES[MEMBER_ROLE_ID].name,
    invitorName: 'device0',
  }

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  replicate(r1, r2, { kp1, kp2 })
  const destroy2 = replicate(r1, r2, { kp1, kp2 })
  destroy2()

  const responsePromise = r1.invite(kp2.publicKey.toString('hex'), invite)
  const [peerId, receivedInvite] = await once(r2, 'invite')
  t.deepEqual(receivedInvite, invite)

  r2.inviteResponse(peerId, {
    projectKey: receivedInvite.projectKey,
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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
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
  await rejects(
    t,
    r1.invite(unknownPeerId, {
      projectKey,
      encryptionKeys: { auth: randomBytes(32) },
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
    }),
    UnknownPeerError
  )
  await rejects(
    t,
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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
    })
    t.is(response, LocalPeers.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.deepEqual(
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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
    })
    t.is(response, LocalPeers.InviteResponse.ACCEPT)
  })

  r2.on('invite', (peerId, invite) => {
    t.ok(invite.projectKey.equals(projectKey), 'invite project key correct')
    t.deepEqual(
      invite.projectInfo,
      projectInfo,
      'project info is sent with invite'
    )
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
        roleName: ROLES[MEMBER_ROLE_ID].name,
        invitorName: 'device0',
      })
      await rejects(
        t,
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
          roleName: ROLES[MEMBER_ROLE_ID].name,
          invitorName: 'device0',
        })
      )
    )
    t.deepEqual(
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
  const inviteFields = {
    roleName: ROLES[MEMBER_ROLE_ID].name,
    invitorName: 'device0',
  }
  r1.on('peers', async (peers) => {
    const responses = await Promise.all([
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
        ...inviteFields,
      }),
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
        ...inviteFields,
      }),
      r1.invite(peers[0].deviceId, {
        projectKey,
        encryptionKeys: { auth: randomBytes(32) },
        ...inviteFields,
      }),
    ])
    const expected = Array(3).fill(LocalPeers.InviteResponse.ACCEPT)
    t.deepEqual(responses, expected)
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
      roleName: ROLES[MEMBER_ROLE_ID].name,
      invitorName: 'device0',
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
    rejects(
      t,
      () =>
        r1.invite(peers[0].deviceId, {
          projectKey,
          timeout: 5000,
          encryptionKeys: { auth: randomBytes(32) },
          roleName: ROLES[MEMBER_ROLE_ID].name,
          invitorName: 'device0',
        }),
      TimeoutError
    )
    clock.tickAsync(5005)
  })

  replicate(r1, r2)
})

test('Send invite to non-existent peer', async (t) => {
  const r1 = new LocalPeers()
  const projectKey = Buffer.allocUnsafe(32).fill(0)
  const deviceId = Buffer.allocUnsafe(32).fill(0).toString('hex')

  await rejects(
    t,
    () =>
      r1.invite(deviceId, {
        projectKey,
        timeout: 1000,
        encryptionKeys: { auth: randomBytes(32) },
        roleName: ROLES[MEMBER_ROLE_ID].name,
        invitorName: 'device0',
      }),
    UnknownPeerError
  )
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
    roleName: ROLES[MEMBER_ROLE_ID].name,
    invitorName: 'device0',
  })
  t.is(response, LocalPeers.InviteResponse.ACCEPT)
})

test('invalid stream', (t) => {
  const r1 = new LocalPeers()
  const regularStream = new Duplex()
  rejects(
    t,
    () =>
      // @ts-expect-error
      r1.connect(regularStream),
    'Invalid stream'
  )
  t.end()
})

test('Send device info', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo', deviceType: 'mobile' }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    r1.sendDeviceInfo(peers[0].deviceId, expectedDeviceInfo)
  })

  replicate(r1, r2)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      t.is(peers[0].name, expectedDeviceInfo.name)
      t.is(peers[0].deviceType, expectedDeviceInfo.deviceType)
      res(true)
    })
  })
})

test('Send device info immediately', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo', deviceType: 'mobile' }

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  replicate(r1, r2, { kp1, kp2 })

  r1.sendDeviceInfo(kp2.publicKey.toString('hex'), expectedDeviceInfo)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      t.is(peers[0].name, expectedDeviceInfo.name)
      t.is(peers[0].deviceType, expectedDeviceInfo.deviceType)
      res(true)
    })
  })
})

test('Reconnect peer and send device info', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = { name: 'mapeo', deviceType: 'mobile' }

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
  t.is(r2Peers[0].deviceType, expectedDeviceInfo.deviceType)
})

test('connected peer has protomux instance', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()
  replicate(r1, r2)
  const [[peer]] = await once(r1, 'peers')
  t.is(peer.status, 'connected')
  t.ok(Protomux.isProtomux(peer.protomux))
})
