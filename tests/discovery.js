import test from 'brittle'

import Hypercore from 'hypercore'
import ram from 'random-access-memory'
import createTestnet from '@hyperswarm/testnet'

import { createCoreKeyPair, createIdentityKeys } from './helpers/index.js'
import { Discovery } from '../lib/discovery.js'

test('discovery - dht/hyperswarm', async (t) => {
  t.plan(2)

  const testnet = await createTestnet(10)
  const bootstrap = testnet.bootstrap

  const keyPair = createCoreKeyPair('dht-peer-discovery')

  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()
  const identityPublicKey2 = identity2.identityKeyPair.publicKey.toString('hex')

  const discover1 = new Discovery({
    identityKeyPair: identity1.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  const discover2 = new Discovery({
    identityKeyPair: identity2.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  await discover1.ready()
  await discover2.ready()

  discover1.on('connection', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey2, 'match key of 2nd peer')
    await step()
  })

  discover2.on('connection', async (connection, peer) => {
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
      await testnet.destroy()
    }
  }

  await discover1.join(keyPair.publicKey)
  await discover2.join(keyPair.publicKey)
})

test('replication - dht/hyperswarm', async (t) => {
  t.plan(3)

  const testnet = await createTestnet(10)
  const bootstrap = testnet.bootstrap

  const core1 = new Hypercore(ram)
  await core1.ready()

  const core2 = new Hypercore(ram, core1.key)
  await core2.ready()

  core1.append(['a', 'b', 'c'])

  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()
  const identityPublicKey2 = identity2.identityKeyPair.publicKey.toString('hex')

  const discover1 = new Discovery({
    identityKeyPair: identity1.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  const discover2 = new Discovery({
    identityKeyPair: identity2.identityKeyPair,
    mdns: false,
    dht: { bootstrap, server: true, client: true },
  })

  await discover1.ready()
  await discover2.ready()

  discover1.on('connection', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey2, 'match key of 2nd peer')
    core1.replicate(connection)
    await step()
  })

  discover2.on('connection', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey1, 'match key of 1st peer')
    core2.replicate(connection)

    const stream = core2.createReadStream()

    const results = []
    stream.on('data', async (/** @type {any} */ data) => {
      results.push(data)
      if (results.length === 3) {
        t.pass()
        await step()
      }
    })
  })

  let count = 0
  async function step() {
    count++
    if (count === 2) {
      await discover1.leave(core1.discoveryKey)
      await discover2.leave(core1.discoveryKey)
      await discover1.destroy()
      await discover2.destroy()
      await testnet.destroy()
    }
  }

  await discover1.join(core1.discoveryKey)
  await discover2.join(core1.discoveryKey)
})

test('discovery - mdns', async (t) => {
  t.plan(2)

  const keyPair = createCoreKeyPair('mdns-peer-discovery')

  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()
  const identityPublicKey2 = identity2.identityKeyPair.publicKey.toString('hex')

  const discover1 = new Discovery({
    identityKeyPair: identity1.identityKeyPair,
    mdns: true,
    dht: false,
  })

  const discover2 = new Discovery({
    identityKeyPair: identity2.identityKeyPair,
    mdns: true,
    dht: false,
  })

  await discover1.ready()
  await discover2.ready()

  discover1.on('connection', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey2, 'match key of 2nd peer')
    await step()
  })

  discover2.on('connection', async (connection, peer) => {
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

  await discover1.join(keyPair.publicKey)
  await discover2.join(keyPair.publicKey)
})

test('discovery - multiple successive joins', async (t) => {
  t.plan(4)

  const keyPair = createCoreKeyPair('multiple successive joins')
  const identity1 = createIdentityKeys()

  const discover1 = new Discovery({
    identityKeyPair: identity1.identityKeyPair,
    mdns: true,
    dht: true,
  })

  await discover1.ready()

  await discover1.join(keyPair.publicKey)
  t.ok(discover1.topics.length === 1)
  await discover1.join(keyPair.publicKey)

  t.ok(discover1.topics.length === 1)
  await discover1.join(keyPair.publicKey)

  t.ok(discover1.topics.length === 1)

  await discover1.leave(keyPair.publicKey)
  await discover1.destroy()
  t.ok(discover1.topics.length === 0)
})

test('discovery - mdns join, leave, join', async (t) => {
  t.plan(5)

  const keyPair = createCoreKeyPair('join, leave, join')
  const identity1 = createIdentityKeys()
  const identityPublicKey1 = identity1.identityKeyPair.publicKey.toString('hex')

  const identity2 = createIdentityKeys()

  const discover1 = new Discovery({
    identityKeyPair: identity1.identityKeyPair,
    mdns: true,
    dht: false,
  })
  const discover2 = new Discovery({
    identityKeyPair: identity2.identityKeyPair,
    mdns: true,
    dht: false,
  })

  await discover1.ready()
  await discover2.ready()

  discover2.on('connection', async (connection, peer) => {
    t.ok(peer.identityPublicKey === identityPublicKey1, 'match key of 1st peer')
    t.ok(discover2.peers.length === 1, 'expected peers count')

    await discover1.leave(keyPair.publicKey)
    t.ok(discover1.topics.length === 0, 'no topics')

    await discover1.join(keyPair.publicKey, { dht: false })
    t.ok(discover1.topics.length === 1, 'expected topic object')

    await discover1.leave(keyPair.publicKey)
    await discover2.leave(keyPair.publicKey)
    await discover1.destroy()
    await discover2.destroy()
  })

  await discover1.join(keyPair.publicKey, { dht: false })
  t.ok(discover1.topics.length === 1, 'expected topic object')
  await discover2.join(keyPair.publicKey, { dht: false })
})
