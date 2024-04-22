// @ts-check
import test from 'brittle'
import { keyToId, projectKeyToPublicId } from '../src/utils.js'
import { LocalPeers, UnknownPeerError } from '../src/local-peers.js'
import { once } from 'events'
import { Duplex } from 'streamx'
import { replicate } from './helpers/local-peers.js'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { KeyManager } from '@mapeo/crypto'
import Protomux from 'protomux'
import { InviteResponse_Decision } from '../src/generated/rpc.js'

test('sending and receiving invites', async (t) => {
  t.plan(2)

  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const validInvite = {
    inviteId: testInviteId(),
    projectPublicId: testProjectPublicId(),
    projectName: 'Mapeo Project',
    invitorName: 'device0',
  }
  const invalidInvites = [
    { ...validInvite, inviteId: testInviteId().slice(0, 31) },
    { ...validInvite, projectPublicId: '' },
    { ...validInvite, projectName: '' },
  ]

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    await Promise.all(
      invalidInvites.map((i) => r1.sendInvite(peers[0].deviceId, i))
    )
    await r1.sendInvite(peers[0].deviceId, validInvite)
  })

  r2.on('invite', (_peerId, receivedInvite) => {
    t.alike(receivedInvite, validInvite, 'received invite')
  })

  replicate(r1, r2)
})

test('sending and receiving invite responses', async (t) => {
  t.plan(2)

  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const validInviteResponse = {
    inviteId: testInviteId(),
    decision: InviteResponse_Decision.ACCEPT,
  }
  const invalidInviteResponse = {
    ...validInviteResponse,
    inviteId: testInviteId().slice(0, 31),
  }

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    await r1.sendInviteResponse(peers[0].deviceId, invalidInviteResponse)
    await r1.sendInviteResponse(peers[0].deviceId, validInviteResponse)
  })

  r2.on('invite-response', (_peerId, receivedResponse) => {
    t.alike(receivedResponse, validInviteResponse, 'received invite response')
  })

  replicate(r1, r2)
})

test('sending and receiving project join details', async (t) => {
  t.plan(2)

  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const validProjectJoinDetails = {
    inviteId: testInviteId(),
    projectKey: testProjectKey(),
    encryptionKeys: { auth: randomBytes(16) },
  }
  const invalidProjectJoinDetails = [
    { ...validProjectJoinDetails, inviteId: testInviteId().slice(0, 31) },
    { ...validProjectJoinDetails, projectKey: Buffer.alloc(0) },
    { ...validProjectJoinDetails, encryptionKeys: { auth: Buffer.alloc(0) } },
  ]

  r1.on('peers', async (peers) => {
    t.is(peers.length, 1)
    await Promise.all(
      invalidProjectJoinDetails.map((d) =>
        r1.sendProjectJoinDetails(peers[0].deviceId, d)
      )
    )
    await r1.sendProjectJoinDetails(peers[0].deviceId, validProjectJoinDetails)
  })

  r2.on('got-project-details', (_peerId, details) => {
    t.alike(details, validProjectJoinDetails, 'received project join details')
  })

  replicate(r1, r2)
})

test('messages to unknown peers', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const unknownPeerId = keyToId(randomBytes(16))

  const oncePeersPromise = once(r1, 'peers')

  replicate(r1, r2)

  await oncePeersPromise

  await t.exception(
    r1.sendInvite(unknownPeerId, {
      inviteId: testInviteId(),
      projectPublicId: testProjectPublicId(),
      projectName: 'Mapeo Project',
      invitorName: 'device0',
    }),
    UnknownPeerError
  )
  await t.exception(
    r1.sendInviteResponse(unknownPeerId, {
      inviteId: testInviteId(),
      decision: InviteResponse_Decision.ACCEPT,
    }),
    UnknownPeerError
  )
  await t.exception(
    r1.sendProjectJoinDetails(unknownPeerId, {
      inviteId: testInviteId(),
      projectKey: testProjectKey(),
      encryptionKeys: { auth: randomBytes(16) },
    }),
    UnknownPeerError
  )
  await t.exception(
    r1.sendDeviceInfo(unknownPeerId, {
      name: 'mapeo',
      deviceType: 'mobile',
    }),
    UnknownPeerError
  )
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

test('invalid stream', (t) => {
  const r1 = new LocalPeers()
  const regularStream = new Duplex()
  t.exception(
    () =>
      // @ts-expect-error
      r1.connect(regularStream),
    'Invalid stream'
  )
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

function testInviteId() {
  return randomBytes(32)
}

function testProjectKey() {
  return KeyManager.generateProjectKeypair().publicKey
}

function testProjectPublicId() {
  const projectKey = testProjectKey()
  return projectKeyToPublicId(projectKey)
}
