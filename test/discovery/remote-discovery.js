import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyManager, keyToPublicId } from '@mapeo/crypto'
import pDefer from 'p-defer'
import { RemoteDiscovery } from '../../src/discovery/remote-discovery.js'

test('RemoteDiscovery - connect two instances and verify keypair', async (t) => {
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
    swarmIdentityKeypair: swarmKeypair1,
  })
  const remoteDiscovery2 = new RemoteDiscovery({
    identityKeypair: identityKeypair2,
    swarmIdentityKeypair: swarmKeypair2,
  })

  t.after(() =>
    Promise.all([remoteDiscovery1.close(), remoteDiscovery2.close()])
  )

  // Start both instances
  await Promise.all([remoteDiscovery1.start(), remoteDiscovery2.start()])

  const deferred = pDefer()
  const swarmPublicKey1Hex = swarmKeypair1.publicKey.toString('hex')

  // Listen for connection on instance 1
  remoteDiscovery1.on('connection', (stream) => {
    stream.on('error', handleConnectionError)
    // Verify the remote peer's public key matches instance 2
    assert.ok(
      stream.remotePublicKey.equals(swarmKeypair2.publicKey),
      'remote public key should match instance 2'
    )
    deferred.resolve(stream)
  })

  // Connect from instance 2 to instance 1
  const connectionPromise = remoteDiscovery2.connectPeer(swarmPublicKey1Hex)

  const outboundStream = await connectionPromise
  const inboundStream = await deferred.promise

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
    keyToPublicId(inboundStream.handshakePublicKey),
    peerId2,
    'instance 1 connected to correct peer'
  )
  assert.equal(
    keyToPublicId(outboundStream.handshakePublicKey),
    peerId1,
    'instance 2 connected to correct peer'
  )

  // Verify remotePublicKey and handshakePublicKey are as expected
  assert.ok(
    inboundStream.remotePublicKey.equals(swarmKeypair2.publicKey),
    'inbound remotePublicKey should match swarmKeypair2'
  )
  assert.ok(
    inboundStream.handshakePublicKey.equals(identityKeypair2.publicKey),
    'inbound handshakePublicKey should match identityKeypair2'
  )
  assert.ok(
    outboundStream.remotePublicKey.equals(swarmKeypair1.publicKey),
    'outbound remotePublicKey should match swarmKeypair1'
  )
  assert.ok(
    outboundStream.handshakePublicKey.equals(identityKeypair1.publicKey),
    'outbound handshakePublicKey should match identityKeypair1'
  )

  inboundStream.end()
  outboundStream.end()
})

/**
 * @param {Error} e
 */
function handleConnectionError(e) {
  assert.fail(`Unexpected connection error: ${e.message}`)
}
