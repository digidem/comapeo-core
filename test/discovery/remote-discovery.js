import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { KeyManager, keyToPublicId } from '@mapeo/crypto'
import pDefer from 'p-defer'
import { RemoteDiscovery } from '../../src/discovery/remote-discovery.js'

test('RemoteDiscovery - connect two instances and verify keypair', async (t) => {
  const identityKeypair1 = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(randomBytes(16)).getIdentityKeypair()

  const remoteDiscovery1 = new RemoteDiscovery({
    identityKeypair: identityKeypair1,
  })
  const remoteDiscovery2 = new RemoteDiscovery({
    identityKeypair: identityKeypair2,
  })

  t.after(() =>
    Promise.all([remoteDiscovery1.close(), remoteDiscovery2.close()])
  )

  // Start both instances
  await Promise.all([remoteDiscovery1.start(), remoteDiscovery2.start()])

  const deferred = pDefer()
  const publicKey2Hex = identityKeypair2.publicKey.toString('hex')

  // Listen for connection on instance 1
  remoteDiscovery1.on('connection', (stream) => {
    stream.on('error', handleConnectionError)
    // Verify the remote peer's public key matches instance 2
    assert.ok(
      stream.remotePublicKey.equals(identityKeypair2.publicKey),
      'remote public key should match instance 2'
    )
    deferred.resolve(stream)
  })

  // Connect from instance 2 to instance 1
  const connectionPromise = remoteDiscovery2.connectPeer(publicKey2Hex)

  const stream = await deferred.promise
  const outboundStream = await connectionPromise

  // Verify both sides have the correct keypairs
  assert.ok(
    stream.remotePublicKey.equals(identityKeypair2.publicKey),
    'instance 1 should have instance 2 public key'
  )
  assert.ok(
    outboundStream.remotePublicKey.equals(identityKeypair1.publicKey),
    'instance 2 should have instance 1 public key'
  )

  // Verify the public IDs match
  const peerId1 = keyToPublicId(identityKeypair1.publicKey)
  const peerId2 = keyToPublicId(identityKeypair2.publicKey)

  assert.equal(
    keyToPublicId(stream.remotePublicKey),
    peerId2,
    'instance 1 connected to correct peer'
  )
  assert.equal(
    keyToPublicId(outboundStream.remotePublicKey),
    peerId1,
    'instance 2 connected to correct peer'
  )
})

/**
 * @param {Error} e
 */
function handleConnectionError(e) {
  assert.fail(`Unexpected connection error: ${e.message}`)
}
