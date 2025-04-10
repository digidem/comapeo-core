import test from 'node:test'
import assert from 'node:assert/strict'
import { keyToId, projectKeyToProjectInviteId } from '../src/utils.js'
import {
  LocalPeers,
  UnknownPeerError,
  kTestOnlySendRawInvite,
} from '../src/local-peers.js'
import { on, once } from 'events'
import { Duplex } from 'streamx'
import { replicate } from './helpers/local-peers.js'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { KeyManager } from '@mapeo/crypto'
import Protomux from 'protomux'
import {
  DeviceInfo_RPCFeatures,
  InviteResponse_Decision,
} from '../src/generated/rpc.js'
import { pEvent } from 'p-event'

test('sending and receiving invites', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').Invite} */
  const validInvite = {
    inviteId: testInviteId(),
    projectInviteId: testProjectInviteId(),
    projectName: 'Mapeo Project',
    invitorName: 'device0',
  }
  const invalidInvites = [
    { ...validInvite, inviteId: testInviteId().slice(0, 31) },
    { ...validInvite, projectPublicId: '' },
    { ...validInvite, projectName: '' },
  ]

  const r1PeersPromise = once(r1, 'peers')
  const r2InvitePromise = once(r2, 'invite')

  replicate(r1, r2)

  const [peers] = await r1PeersPromise
  assert.equal(peers.length, 1)
  await Promise.all(
    invalidInvites.map((i) => r1.sendInvite(peers[0].deviceId, i))
  )
  await r1.sendInvite(peers[0].deviceId, validInvite)

  const [_, receivedInvite] = await r2InvitePromise
  assert.deepEqual(receivedInvite, validInvite, 'received invite')
})

test('sending and receiving invite responses', async () => {
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

  const r1PeersPromise = once(r1, 'peers')
  const r2InviteResponsePromise = once(r2, 'invite-response')

  replicate(r1, r2)

  const [peers] = await r1PeersPromise
  assert.equal(peers.length, 1)
  await r1.sendInviteResponse(peers[0].deviceId, invalidInviteResponse)
  await r1.sendInviteResponse(peers[0].deviceId, validInviteResponse)

  const [_, receivedResponse] = await r2InviteResponsePromise
  assert.deepEqual(
    receivedResponse,
    validInviteResponse,
    'received invite response'
  )
})

test('sending and receiving project join details', async () => {
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

  const r1PeersPromise = once(r1, 'peers')
  const r2GotProjectDetailsPromise = once(r2, 'got-project-details')

  replicate(r1, r2)

  const [peers] = await r1PeersPromise
  assert.equal(peers.length, 1)
  await Promise.all(
    invalidProjectJoinDetails.map((d) =>
      r1.sendProjectJoinDetails(peers[0].deviceId, d)
    )
  )
  await r1.sendProjectJoinDetails(peers[0].deviceId, validProjectJoinDetails)

  const [_, details] = await r2GotProjectDetailsPromise
  assert.deepEqual(
    details,
    validProjectJoinDetails,
    'received project join details'
  )
})

test('messages to unknown peers', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const unknownPeerId = keyToId(randomBytes(16))

  const oncePeersPromise = once(r1, 'peers')

  replicate(r1, r2)

  await oncePeersPromise

  await assert.rejects(
    r1.sendInvite(unknownPeerId, {
      inviteId: testInviteId(),
      projectInviteId: testProjectInviteId(),
      projectName: 'Mapeo Project',
      invitorName: 'device0',
    }),
    UnknownPeerError
  )
  await assert.rejects(
    r1.sendInviteResponse(unknownPeerId, {
      inviteId: testInviteId(),
      decision: InviteResponse_Decision.ACCEPT,
    }),
    UnknownPeerError
  )
  await assert.rejects(
    r1.sendProjectJoinDetails(unknownPeerId, {
      inviteId: testInviteId(),
      projectKey: testProjectKey(),
      encryptionKeys: { auth: randomBytes(16) },
    }),
    UnknownPeerError
  )
  await assert.rejects(
    r1.sendDeviceInfo(unknownPeerId, {
      name: 'mapeo',
      deviceType: 'mobile',
      features: [],
    }),
    UnknownPeerError
  )
})

test('handles invalid invites', async (t) => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  r1.once('peers', async ([peer]) => {
    await r1[kTestOnlySendRawInvite](peer.deviceId, Buffer.from([1, 2, 3]))
  })

  r2.on('invite', () => {
    assert.fail('should not receive invite')
  })

  const r2FailedToHandleMessagePromise = once(r2, 'failed-to-handle-message')

  const destroy = replicate(r1, r2)
  t.after(() => {
    destroy()
  })

  const [messageType] = await r2FailedToHandleMessagePromise
  assert.equal(messageType, 'Invite')
})

test('Disconnected peer shows in state', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()
  let peerStateUpdates = 0

  const destroy = replicate(r1, r2)

  for await (const [peers] of on(r1, 'peers')) {
    assert.equal(peers.length, 1, 'one peer in state')
    if (peers[0].status === 'connected') {
      assert.equal(++peerStateUpdates, 1)
      destroy(new Error())
      break
    } else {
      assert.equal(++peerStateUpdates, 2)
    }
  }
})

test('next tick disconnect does not throw', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  const destroy = replicate(r1, r2)
  await Promise.resolve()
  destroy(new Error())
})

test('invalid stream', () => {
  const r1 = new LocalPeers()
  const regularStream = new Duplex()
  assert.throws(
    () =>
      // @ts-expect-error
      r1.connect(regularStream),
    { message: 'Invalid stream' }
  )
})

test('Send device info', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = {
    name: 'mapeo',
    deviceType: 'mobile',
    features: [DeviceInfo_RPCFeatures.ack],
  }

  r1.on('peers', async (peers) => {
    assert.equal(peers.length, 1)
    r1.sendDeviceInfo(peers[0].deviceId, expectedDeviceInfo)
  })

  replicate(r1, r2)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      assert.equal(peers[0].name, expectedDeviceInfo.name)
      assert.equal(peers[0].deviceType, expectedDeviceInfo.deviceType)
      res(true)
    })
  })
})

test('Send device info immediately', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = {
    name: 'mapeo',
    deviceType: 'mobile',
    features: [],
  }

  const kp1 = NoiseSecretStream.keyPair()
  const kp2 = NoiseSecretStream.keyPair()

  replicate(r1, r2, { kp1, kp2 })

  r1.sendDeviceInfo(kp2.publicKey.toString('hex'), expectedDeviceInfo)

  await new Promise((res) => {
    r2.on('peers', (peers) => {
      if (!(peers.length === 1 && peers[0].name)) return
      assert.equal(peers[0].name, expectedDeviceInfo.name)
      assert.equal(peers[0].deviceType, expectedDeviceInfo.deviceType)
      res(true)
    })
  })
})

test('Reconnect peer and send device info', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = {
    name: 'mapeo',
    deviceType: 'mobile',
    features: [],
  }

  const destroy = replicate(r1, r2)
  await once(r1, 'peers')
  await destroy()

  assert.equal(r1.peers.length, 1)
  assert.equal(r1.peers[0].status, 'disconnected')

  replicate(r1, r2)

  const [r1peers] = await once(r1, 'peers')
  assert.equal(r1.peers.length, 1)
  assert.equal(r1peers[0].status, 'connected')

  await r1.sendDeviceInfo(r1peers[0].deviceId, expectedDeviceInfo)

  const [r2Peers] = await once(r2, 'peers')
  assert.equal(r2Peers[0].name, expectedDeviceInfo.name)
  assert.equal(r2Peers[0].deviceType, expectedDeviceInfo.deviceType)
})

test('connected peer has protomux instance', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()
  replicate(r1, r2)
  const [[peer]] = await once(r1, 'peers')
  assert.equal(peer.status, 'connected')
  assert(Protomux.isProtomux(peer.protomux))
})

test('Device info with ack results in acks sent', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = {
    name: 'mapeo',
    deviceType: 'mobile',
    features: [DeviceInfo_RPCFeatures.ack],
  }

  const inviteId = testInviteId()

  const validInvite = {
    inviteId,
    projectInviteId: testProjectInviteId(),
    projectName: 'Mapeo Project',
    invitorName: 'device0',
  }

  const validProjectJoinDetails = {
    inviteId,
    projectKey: testProjectKey(),
    encryptionKeys: { auth: randomBytes(16) },
  }

  replicate(r1, r2)

  const peers = await pEvent(r1, 'peers')

  r1.sendDeviceInfo(peers[0].deviceId, expectedDeviceInfo)

  const timeout = 100

  const onInviteAck = pEvent(r1, 'invite-ack', { timeout })
  const onInviteCancelAck = pEvent(r1, 'invite-cancel-ack', { timeout })
  const onInviteResponseAck = pEvent(r1, 'invite-response-ack', { timeout })
  const onProjectJoinDetailsAck = pEvent(r1, 'got-project-details-ack', {
    timeout,
  })

  const { deviceId } = peers[0]

  await Promise.all([
    r1.sendInvite(deviceId, validInvite),
    r1.sendInviteCancel(deviceId, {
      inviteId,
    }),
    r1.sendInviteResponse(deviceId, {
      inviteId,
      decision: InviteResponse_Decision.DECISION_UNSPECIFIED,
    }),
    r1.sendProjectJoinDetails(deviceId, validProjectJoinDetails),
  ])

  await Promise.all([
    onInviteAck,
    onInviteCancelAck,
    onInviteResponseAck,
    onProjectJoinDetailsAck,
  ])
})

test('Device info without ack results in no acks sent', async () => {
  const r1 = new LocalPeers()
  const r2 = new LocalPeers()

  /** @type {import('../src/generated/rpc.js').DeviceInfo} */
  const expectedDeviceInfo = {
    name: 'mapeo',
    deviceType: 'mobile',
    features: [],
  }

  const inviteId = testInviteId()

  const validInvite = {
    inviteId,
    projectInviteId: testProjectInviteId(),
    projectName: 'Mapeo Project',
    invitorName: 'device0',
  }

  const validProjectJoinDetails = {
    inviteId,
    projectKey: testProjectKey(),
    encryptionKeys: { auth: randomBytes(16) },
  }

  replicate(r1, r2)

  const peers = await pEvent(r1, 'peers')

  r1.sendDeviceInfo(peers[0].deviceId, expectedDeviceInfo)

  const timeout = 100

  const onInviteAck = pEvent(r1, 'invite-ack', { timeout })
  const onInviteCancelAck = pEvent(r1, 'invite-cancel-ack', { timeout })
  const onInviteResponseAck = pEvent(r1, 'invite-response-ack', { timeout })
  const onProjectJoinDetailsAck = pEvent(r1, 'got-project-details-ack', {
    timeout,
  })

  const { deviceId } = peers[0]

  await Promise.all([
    r1.sendInvite(deviceId, validInvite),
    r1.sendInviteCancel(deviceId, {
      inviteId,
    }),
    r1.sendInviteResponse(deviceId, {
      inviteId,
      decision: InviteResponse_Decision.DECISION_UNSPECIFIED,
    }),
    r1.sendProjectJoinDetails(deviceId, validProjectJoinDetails),
  ])

  assert.rejects(() => onInviteAck)
  assert.rejects(() => onInviteCancelAck)
  assert.rejects(() => onInviteResponseAck)
  assert.rejects(() => onProjectJoinDetailsAck)
})

function testInviteId() {
  return randomBytes(32)
}

function testProjectKey() {
  return KeyManager.generateProjectKeypair().publicKey
}

function testProjectInviteId() {
  const projectKey = testProjectKey()
  return projectKeyToProjectInviteId(projectKey)
}
