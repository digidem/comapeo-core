import createTestnet from 'hyperdht/testnet.js'

import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyManager, keyToPublicId } from '@mapeo/crypto'
import { pEvent } from 'p-event'
import sodium from 'sodium-universal'
import Protomux from 'protomux'
import cenc from 'compact-encoding'
import { Duplex } from 'streamx'
import {
  RemoteDiscovery,
  kTestOnlyHandleHyperswarmConnection,
  AUTH_PROTOCOL,
} from '../../src/discovery/remote-discovery.js'
import { Hello, IdentityProof } from '../../src/generated/auth.js'
import {
  AuthProtocolVersionMismatchError,
  ensureKnownError,
  InvalidIdentityProofError,
} from '../../src/errors.js'
import pDefer from 'p-defer'

/** @import {OpenedNoiseStream} from '../../src/lib/noise-secret-stream-helpers.js'*/
/** @import {Keypair} from '../../src/discovery/local-discovery.js' */

test('RemoteDiscovery - connect two instances and verify keypair', async (t) => {
  const testnet = await createTestnet(3)
  t.after(async () => {
    await testnet.destroy()
  })

  const identityKeypair1 = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(
    Buffer.alloc(16, 2)
  ).getIdentityKeypair()
  const swarmKeypair1 = new KeyManager(Buffer.alloc(16, 3)).getIdentityKeypair()
  const swarmKeypair2 = new KeyManager(Buffer.alloc(16, 4)).getIdentityKeypair()

  const remoteDiscovery1 = new RemoteDiscovery({
    identityKeypair: identityKeypair1,
    deriveSwarmIdentityKeypair: () => swarmKeypair1,
    swarm: { dht: testnet.nodes[0] },
  })
  const remoteDiscovery2 = new RemoteDiscovery({
    identityKeypair: identityKeypair2,
    deriveSwarmIdentityKeypair: () => swarmKeypair2,
    swarm: { dht: testnet.nodes[1] },
  })

  t.after(() =>
    Promise.all([remoteDiscovery1.close(), remoteDiscovery2.close()])
  )

  // Start both instances
  await Promise.all([remoteDiscovery1.start(), remoteDiscovery2.start()])

  const swarmPublicKey1Hex = swarmKeypair1.publicKey.toString('hex')

  // Listen for connection on instance 1
  const onConnection = pEvent(remoteDiscovery1, 'connection')

  // Connect from instance 2 to instance 1
  const connectionPromise = remoteDiscovery2.connectPeer(swarmPublicKey1Hex)

  const outboundStream = await connectionPromise
  const inboundStream = await onConnection

  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'remote public key should match instance 2'
  )
  inboundStream.on('error', handleConnectionError)

  // Verify both sides have the correct keypairs
  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'instance 1 should have instance 2 swarm public key'
  )
  assert.ok(
    outboundStream.remotePublicKey.equals(swarmKeypair1.publicKey),
    'instance 2 should have instance 1 swarm public key'
  )

  // Verify the public IDs match
  const peerId1 = keyToPublicId(identityKeypair1.publicKey)
  const peerId2 = keyToPublicId(identityKeypair2.publicKey)

  assert.equal(
    keyToPublicId(inboundStream.authenticatedPublicKey),
    peerId2,
    'instance 1 connected to correct peer'
  )
  assert.equal(
    keyToPublicId(outboundStream.authenticatedPublicKey),
    peerId1,
    'instance 2 connected to correct peer'
  )

  // Verify remotePublicKey and authenticatedPublicKey are as expected
  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'inbound remotePublicKey should match swarmKeypair2'
  )
  assert.ok(
    inboundStream.authenticatedPublicKey.equals(identityKeypair2.publicKey),
    'inbound authenticatedPublicKey should match identityKeypair2'
  )
  assert.ok(
    outboundStream.remotePublicKey.equals(swarmKeypair1.publicKey),
    'outbound remotePublicKey should match swarmKeypair1'
  )
  assert.ok(
    outboundStream.authenticatedPublicKey.equals(identityKeypair1.publicKey),
    'outbound authenticatedPublicKey should match identityKeypair1'
  )

  // Verify protomux is stored on the stream
  assert.ok(outboundStream.userData, 'outbound stream should have userData')
  assert.ok(inboundStream.userData, 'inbound stream should have userData')

  // Set up data listeners before writing
  const dataFromOutbound = Buffer.from('Hello from outbound!')
  const dataFromInbound = Buffer.from('Hello from inbound!')

  const inboundDataPromise = pEvent(inboundStream, 'data')
  const outboundDataPromise = pEvent(outboundStream, 'data')

  // Send data from both sides
  outboundStream.write(dataFromOutbound)
  inboundStream.write(dataFromInbound)

  // Wait for data to be received
  const [inboundData, outboundData] = await Promise.all([
    inboundDataPromise,
    outboundDataPromise,
  ])

  assert.ok(
    inboundData.equals(dataFromOutbound),
    'inbound should receive data from outbound'
  )
  assert.ok(
    outboundData.equals(dataFromInbound),
    'outbound should receive data from inbound'
  )

  inboundStream.end()
  outboundStream.end()
})

test('RemoteDiscovery - Able to reconnect after disconnecting', async (t) => {
  const testnet = await createTestnet(3)
  t.after(async () => {
    await testnet.destroy()
  })

  const identityKeypair1 = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(
    Buffer.alloc(16, 2)
  ).getIdentityKeypair()
  const swarmKeypair1 = new KeyManager(Buffer.alloc(16, 3)).getIdentityKeypair()
  const swarmKeypair2 = new KeyManager(Buffer.alloc(16, 4)).getIdentityKeypair()

  const remoteDiscovery1 = new RemoteDiscovery({
    identityKeypair: identityKeypair1,
    deriveSwarmIdentityKeypair: () => swarmKeypair1,
    swarm: { dht: testnet.nodes[0] },
  })
  const remoteDiscovery2 = new RemoteDiscovery({
    identityKeypair: identityKeypair2,
    deriveSwarmIdentityKeypair: () => swarmKeypair2,
    swarm: { dht: testnet.nodes[1] },
  })

  t.after(() =>
    Promise.all([remoteDiscovery1.close(), remoteDiscovery2.close()])
  )

  // Start both instances
  await Promise.all([remoteDiscovery1.start(), remoteDiscovery2.start()])

  const swarmPublicKey1Hex = swarmKeypair1.publicKey.toString('hex')
  const swarmPublicKey2Hex = swarmKeypair2.publicKey.toString('hex')

  // Listen for connection on instance 1
  const onConnection = pEvent(remoteDiscovery1, 'connection')

  // Connect from instance 2 to instance 1
  const connectionPromise = remoteDiscovery2.connectPeer(swarmPublicKey1Hex)

  const outboundStream = await connectionPromise
  const inboundStream = await onConnection

  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'remote public key should match instance 2'
  )
  inboundStream.on('error', handleConnectionError)

  // Verify both sides have the correct keypairs
  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'instance 1 should have instance 2 swarm public key'
  )
  assert.ok(
    outboundStream.remotePublicKey.equals(swarmKeypair1.publicKey),
    'instance 2 should have instance 1 swarm public key'
  )

  const onEnd = Promise.all([
    pEvent(outboundStream, 'close'),
    pEvent(inboundStream, 'close'),
  ])

  await Promise.all([
    onEnd,
    // Need to disconnect both sides manually ATM cause disconenct isnt detected otherwise.
    remoteDiscovery2.disconnectPeer(swarmPublicKey1Hex),
    remoteDiscovery1.disconnectPeer(swarmPublicKey2Hex),
  ])

  // Listen for connection on instance 1
  const onConnection2 = pEvent(remoteDiscovery1, 'connection')

  // Connect from instance 2 to instance 1
  const connectionPromise2 = remoteDiscovery2.connectPeer(swarmPublicKey1Hex)

  const outboundStream2 = await connectionPromise2
  const inboundStream2 = await onConnection2

  // Verify both sides have the correct keypairs
  assert.ok(
    inboundStream2.remotePublicKey.equals(swarmKeypair2.publicKey),
    'instance 1 should have instance 2 swarm public key'
  )
  assert.ok(
    outboundStream2.remotePublicKey.equals(swarmKeypair1.publicKey),
    'instance 2 should have instance 1 swarm public key'
  )
})

test('RemoteDiscovery - connect two peers to a third peer', async (t) => {
  const testnet = await createTestnet(3)
  t.after(async () => {
    await testnet.destroy()
  })

  const identityKeypair1 = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(
    Buffer.alloc(16, 2)
  ).getIdentityKeypair()
  const identityKeypair3 = new KeyManager(
    Buffer.alloc(16, 3)
  ).getIdentityKeypair()
  const swarmKeypair1 = new KeyManager(Buffer.alloc(16, 4)).getIdentityKeypair()
  const swarmKeypair2 = new KeyManager(Buffer.alloc(16, 5)).getIdentityKeypair()
  const swarmKeypair3 = new KeyManager(Buffer.alloc(16, 6)).getIdentityKeypair()

  // Peer 1 is the "host" - two peers will connect to it
  const remoteDiscovery1 = new RemoteDiscovery({
    identityKeypair: identityKeypair1,
    deriveSwarmIdentityKeypair: () => swarmKeypair1,
    swarm: { dht: testnet.nodes[0] },
  })
  const remoteDiscovery2 = new RemoteDiscovery({
    identityKeypair: identityKeypair2,
    deriveSwarmIdentityKeypair: () => swarmKeypair2,
    swarm: { dht: testnet.nodes[1] },
  })
  const remoteDiscovery3 = new RemoteDiscovery({
    identityKeypair: identityKeypair3,
    deriveSwarmIdentityKeypair: () => swarmKeypair3,
    swarm: { dht: testnet.nodes[2] },
  })

  t.after(() =>
    Promise.all([
      remoteDiscovery1.close(),
      remoteDiscovery2.close(),
      remoteDiscovery3.close(),
    ])
  )

  await Promise.all([
    remoteDiscovery1.start(),
    remoteDiscovery2.start(),
    remoteDiscovery3.start(),
  ])

  const swarmPublicKey1Hex = swarmKeypair1.publicKey.toString('hex')

  // Listen for two inbound connections on peer 1
  const onConnectionFromPeer2 = pEvent(remoteDiscovery1, 'connection')

  // Peer 2 connects to peer 1
  const connectionPromise2 = remoteDiscovery2.connectPeer(swarmPublicKey1Hex)
  const outboundStream2 = await connectionPromise2
  const inboundStream2 = await onConnectionFromPeer2

  assert.ok(
    inboundStream2.authenticatedPublicKey.equals(identityKeypair2.publicKey),
    'peer 1 should see peer 2 identity'
  )
  assert.ok(
    outboundStream2.authenticatedPublicKey.equals(identityKeypair1.publicKey),
    'peer 2 should see peer 1 identity'
  )

  // Now peer 3 also connects to peer 1
  const onConnectionFromPeer3 = pEvent(remoteDiscovery1, 'connection', {
    timeout: 5000,
  })
  const connectionPromise3 = remoteDiscovery3.connectPeer(swarmPublicKey1Hex)
  const outboundStream3 = await connectionPromise3
  const inboundStream3 = await onConnectionFromPeer3

  assert.ok(
    inboundStream3.authenticatedPublicKey.equals(identityKeypair3.publicKey),
    'peer 1 should see peer 3 identity'
  )
  assert.ok(
    outboundStream3.authenticatedPublicKey.equals(identityKeypair1.publicKey),
    'peer 3 should see peer 1 identity'
  )

  inboundStream2.end()
  outboundStream2.end()
  inboundStream3.end()
  outboundStream3.end()
})

/**
 * Creates a pair of connected duplex streams that pipe data to each other.
 * @returns {[Duplex, Duplex]}
 */
function createStreamPair() {
  const s1 = new Duplex({
    read() {},
    write(chunk, cb) {
      if (s2 && !s2.destroyed) s2.push(chunk)
      cb()
    },
  })
  const s2 = new Duplex({
    read() {},
    write(chunk, cb) {
      if (s1 && !s1.destroyed) s1.push(chunk)
      cb()
    },
  })
  return [s1, s2]
}

/**
 * Set up a mock noise stream for the server side of
 * #handleHyperswarmConnection.
 * @param {import('streamx').Duplex} stream
 * @param {Keypair} swarmKeypair
 * @param {Buffer} [handshakeHash]
 * @returns {OpenedNoiseStream}
 */
function makeServerStream(
  stream,
  swarmKeypair,
  handshakeHash = Buffer.alloc(32, 0)
) {
  // @ts-ignore mocking
  stream.remotePublicKey = swarmKeypair.publicKey
  // @ts-ignore mocking
  stream.handshakeHash = handshakeHash
  // @ts-ignore mocking
  stream.opened = Promise.resolve(true)
  // @ts-ignore mocking
  stream.userData = undefined
  return /** @type {OpenedNoiseStream} */ (/** @type {unknown} */ (stream))
}

/**
 * Set up the peer side protomux with the auth channel open.
 * @param {import('streamx').Duplex} peerStream
 * @returns {Promise<ReturnType<typeof Protomux.prototype.createChannel>>}
 */
async function setupPeerAuth(peerStream) {
  const peerProtomux = Protomux.from(peerStream)

  const messages = [
    { encoding: cenc.raw, onmessage: () => {} },
    { encoding: cenc.raw, onmessage: () => {} },
  ]

  const onOpen = pDefer()
  const peerChannel = peerProtomux.createChannel({
    protocol: AUTH_PROTOCOL,
    messages,
    onopen: () => onOpen.resolve(),
  })
  peerChannel.open()

  await onOpen.promise

  return peerChannel
}

test('RemoteDiscovery - emits AuthProtocolVersionMismatchError on invalid protocol version', async (t) => {
  const testnet = await createTestnet(3)
  t.after(async () => {
    await testnet.destroy()
  })

  const identityKeypair = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const swarmKeypair = new KeyManager(Buffer.alloc(16, 3)).getIdentityKeypair()

  const discovery = new RemoteDiscovery({
    identityKeypair,
    deriveSwarmIdentityKeypair: () => swarmKeypair,
    swarm: { dht: testnet.nodes[0] },
  })
  t.after(() => discovery.close())

  const [serverStream, peerStream] = createStreamPair()
  const serverSocket = makeServerStream(serverStream, swarmKeypair)

  const onError = pEvent(discovery, 'error', { timeout: 50000 })

  // Start server handling (async, don't await yet)
  const serverPromise =
    discovery[kTestOnlyHandleHyperswarmConnection](serverSocket)

  // Set up peer side and send a Hello with wrong version
  const peerChannel = await setupPeerAuth(peerStream)

  const badHello = Hello.encode({ protocolVersion: 2 }).finish()
  peerChannel.messages[0].send(Buffer.from(badHello))

  const err = ensureKnownError(await onError)
  assert.equal(
    err.code,
    AuthProtocolVersionMismatchError.code,
    'should emit AuthProtocolVersionMismatchError'
  )

  // Server should have ended the stream
  await serverPromise
})

test('RemoteDiscovery - emits InvalidIdentityProofError on invalid signature', async (t) => {
  const identityKeypair = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const peerIdentityKeypair = new KeyManager(
    Buffer.alloc(16, 2)
  ).getIdentityKeypair()
  const swarmKeypair = new KeyManager(Buffer.alloc(16, 3)).getIdentityKeypair()
  const handshakeHash = Buffer.alloc(32, 0)

  const discovery = new RemoteDiscovery({
    identityKeypair,
    deriveSwarmIdentityKeypair: () => swarmKeypair,
  })
  t.after(() => discovery.close())

  const [serverStream, peerStream] = createStreamPair()
  const serverSocket = makeServerStream(
    serverStream,
    swarmKeypair,
    handshakeHash
  )

  const onError = pEvent(discovery, 'error', { timeout: 5000 })

  const serverPromise =
    discovery[kTestOnlyHandleHyperswarmConnection](serverSocket)

  const peerChannel = await setupPeerAuth(peerStream)

  // Peer sends valid Hello
  const goodHello = Hello.encode({ protocolVersion: 1 }).finish()
  peerChannel.messages[0].send(Buffer.from(goodHello))

  // Peer sends IdentityProof with a garbage signature (not signed by any valid key)
  const badProof = IdentityProof.encode({
    publicKey: peerIdentityKeypair.publicKey,
    signature: Buffer.alloc(64), // all zeros - invalid signature
  }).finish()
  peerChannel.messages[1].send(Buffer.from(badProof))

  const err = ensureKnownError(await onError)
  assert.equal(
    err.code,
    InvalidIdentityProofError.code,
    'should emit InvalidIdentityProofError'
  )

  await serverPromise
})

test('RemoteDiscovery - valid auth handshake completes and emits connection', async (t) => {
  const identityKeypair = new KeyManager(
    Buffer.alloc(16, 1)
  ).getIdentityKeypair()
  const peerIdentityKeypair = new KeyManager(
    Buffer.alloc(16, 2)
  ).getIdentityKeypair()
  const swarmKeypair = new KeyManager(Buffer.alloc(16, 3)).getIdentityKeypair()
  const handshakeHash = Buffer.alloc(32, 0)

  const discovery = new RemoteDiscovery({
    identityKeypair,
    deriveSwarmIdentityKeypair: () => swarmKeypair,
  })
  t.after(() => discovery.close())

  const [serverStream, peerStream] = createStreamPair()
  const serverSocket = makeServerStream(
    serverStream,
    swarmKeypair,
    handshakeHash
  )

  const onConnection = pEvent(discovery, 'connection', { timeout: 5000 })
  const serverPromise =
    discovery[kTestOnlyHandleHyperswarmConnection](serverSocket)

  const peerChannel = await setupPeerAuth(peerStream)

  // Peer sends valid Hello
  const goodHello = Hello.encode({ protocolVersion: 1 }).finish()
  peerChannel.messages[0].send(Buffer.from(goodHello))

  // Peer signs the handshakeHash with its identity keypair (valid proof)
  const sig = new Uint8Array(64)
  sodium.crypto_sign_detached(sig, handshakeHash, peerIdentityKeypair.secretKey)
  const goodProof = IdentityProof.encode({
    publicKey: peerIdentityKeypair.publicKey,
    signature: Buffer.from(sig),
  }).finish()
  peerChannel.messages[1].send(Buffer.from(goodProof))

  const connection = await onConnection
  assert.ok(
    connection.authenticatedPublicKey.equals(peerIdentityKeypair.publicKey),
    'server should have peer identity as authenticatedPublicKey'
  )
  assert.ok(
    Protomux.isProtomux(connection.userData),
    'stream should have protomux in userData'
  )

  await serverPromise
})

/**
 * @param {Error} e
 */
function handleConnectionError(e) {
  assert.fail(`Unexpected connection error: ${e.message}`)
}
