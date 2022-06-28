import log from 'why-is-node-running'
import test from 'brittle'

import createTestnet from '@hyperswarm/testnet'

import { createCoreKeyPair, createIdentityKeys } from './helpers/index.js'
import { Discovery } from '../lib/discovery.js'

// TODO: figure out why hyperswarm hangs the tests
test.skip('discovery - dht/hyperswarm', async (t) => {
  t.plan(2)

  const testnet = await createTestnet(10)
  const bootstrap = testnet.bootstrap

  const keyPair = createCoreKeyPair('dht-peer-discovery')

  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()
  const identityPublicKey2 = identity2.identityKeyPair.publicKey.toString('hex')

  const discover1 = new Discovery({
    keyPair: identity1.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  const discover2 = new Discovery({
    keyPair: identity2.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  discover1.on('peer', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey2, 'match key of 2nd peer')
    await step()
  })

  discover2.on('peer', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey1, 'match key of 1st peer')
    await step()
  })

  let count = 0
  async function step() {
    count++
    if (count === 2) {
      await discover1.leave(keyPair.publicKey)
      await discover2.leave(keyPair.publicKey)
      await testnet.destroy()
      log()
    }
  }

  // TODO: use discoveryKey
  await discover1.join(keyPair.publicKey)
  await discover2.join(keyPair.publicKey)
})

test('discovery - mdns', async (t) => {
  t.plan(2)

  const keyPair = createCoreKeyPair('dht-peer-discovery')

  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()
  const identityPublicKey2 = identity2.identityKeyPair.publicKey.toString('hex')

  const discover1 = new Discovery({
    keyPair: identity1.identityKeyPair,
    mdns: true,
    dht: false,
  })

  const discover2 = new Discovery({
    keyPair: identity2.identityKeyPair,
    mdns: true,
    dht: false,
  })

  discover1.on('peer', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey2, 'match key of 2nd peer')
    await step()
  })

  discover2.on('peer', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey1, 'match key of 1st peer')
    await step()
  })

  let count = 0
  async function step() {
    count++
    if (count === 2) {
      await discover1.leave(keyPair.publicKey)
      await discover2.leave(keyPair.publicKey)
      await discover1.destroy()
      await discover2.destroy()
    }
  }

  // TODO: use discoveryKey
  await discover1.join(keyPair.publicKey)
  await discover2.join(keyPair.publicKey)
})

test('discovery - multiple successive joins', async (t) => {
  t.plan(3)

  const keyPair = createCoreKeyPair('dht-peer-discovery')
  const identity1 = createIdentityKeys()

  const discover1 = new Discovery({
    keyPair: identity1.identityKeyPair,
    mdns: true,
    dht: true,
  })

  await discover1.join(keyPair.publicKey)
  t.ok(discover1.discover.length === 1)
  await discover1.join(keyPair.publicKey)
  t.ok(discover1.discover.length === 1)
  await discover1.join(keyPair.publicKey)
  t.ok(discover1.discover.length === 1)

  await discover1.leave(keyPair.publicKey)
  await discover1.destroy()
})

// TODO: this test helps to show race condition problems with successive joining and leaving
test.skip('discovery - mdns join, leave, join', async (t) => {
  t.plan(5)

  const keyPair = createCoreKeyPair('dht-peer-discovery')
  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()

  const discover1 = new Discovery({
    keyPair: identity1.identityKeyPair,
    mdns: true,
    dht: false,
  })

  const discover2 = new Discovery({
    keyPair: identity2.identityKeyPair,
    mdns: true,
    dht: false,
  })

  discover2.on('peer', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey1, 'match key of 1st peer')
    t.ok(discover2.peers.length === 1, 'expected peers count')

    await discover1.leave(keyPair.publicKey)
    t.ok(discover1.discover.length === 0, 'no discover objects')

    await discover1.join(keyPair.publicKey)
    t.ok(discover1.discover.length === 1, 'expected discover object')

    await discover1.leave(keyPair.publicKey)
    await discover2.leave(keyPair.publicKey)
    await discover1.destroy()
    await discover2.destroy()
  })

  await discover1.join(keyPair.publicKey)
  t.ok(discover1.discover.length === 1, 'expected discover object')
  await discover2.join(keyPair.publicKey)
})
