import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import net from 'node:net'
import { every } from 'iterpal'
import { KeyManager } from '@mapeo/crypto'
import { setTimeout as delay } from 'node:timers/promises'
import pDefer from 'p-defer'
import { keyToPublicId } from '@mapeo/crypto'
import {
  ERR_DUPLICATE,
  LocalDiscovery,
} from '../../src/discovery/local-discovery.js'
import NoiseSecretStream from '@hyperswarm/secret-stream'
/** @typedef {import('../../src/utils.js').OpenedNoiseStream} OpenedNoiseStream */

test('peer discovery - discovery and sharing of data', async (t) => {
  const deferred = pDefer()
  const identityKeypair1 = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(randomBytes(16)).getIdentityKeypair()

  const localDiscovery1 = new LocalDiscovery({
    identityKeypair: identityKeypair1,
  })
  const localDiscovery2 = new LocalDiscovery({
    identityKeypair: identityKeypair2,
  })
  const str = 'hi'

  localDiscovery1.on('connection', (stream) => {
    stream.on('error', handleConnectionError)
    stream.write(str)
  })

  localDiscovery2.on('connection', (stream) => {
    stream.on('error', handleConnectionError)
    stream.on('data', (d) => {
      assert.equal(d.toString(), str, 'expected data written')
      deferred.resolve()
    })
  })

  t.after(() =>
    Promise.all([
      localDiscovery1.stop({ force: true }),
      localDiscovery2.stop({ force: true }),
    ])
  )
  const [server1, server2] = await Promise.all([
    localDiscovery1.start(),
    localDiscovery2.start(),
  ])

  localDiscovery1.connectPeer({ address: '127.0.0.1', ...server2 })
  localDiscovery2.connectPeer({ address: '127.0.0.1', ...server1 })

  return deferred.promise
})

test('deduplicate incoming connections', async () => {
  const localConnections = new Set()
  const remoteConnections = new Set()

  const localKp = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const remoteKp = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const discovery = new LocalDiscovery({ identityKeypair: localKp })
  const { port } = await discovery.start()

  discovery.on('connection', (conn) => {
    conn.on('error', handleConnectionError)
    localConnections.add(conn)
    conn.on('close', () => localConnections.delete(conn))
  })

  for (let i = 0; i < 20; i++) {
    noiseConnect(port, '127.0.0.1', remoteKp).then((conn) => {
      conn.on('error', handleConnectionError)
      conn.on('connect', () => remoteConnections.add(conn))
      conn.on('close', () => remoteConnections.delete(conn))
    })
  }

  await delay(1000)
  assert.equal(localConnections.size, 1)
  assert.equal(remoteConnections.size, 1)
  assert.deepEqual(
    localConnections.values().next().value.handshakeHash,
    remoteConnections.values().next().value.handshakeHash
  )
  await discovery.stop({ force: true })
})

test(`peer discovery of 30 peers with random connection times`, async (t) => {
  await testMultiple(t, { period: 2000, nPeers: 30 })
})

test(`peer discovery of 30 peers connected at the same time`, async (t) => {
  await testMultiple(t, { period: 0, nPeers: 30 })
})

/**
 * @param {number} port
 * @param {string} host
 * @param {{ publicKey: Buffer, secretKey: Buffer }} keyPair
 */
async function noiseConnect(port, host, keyPair) {
  const socket = net.connect(port, host)
  return new NoiseSecretStream(true, socket, { keyPair })
}

/**
 * @param {import('node:test').TestContext} t
 * @param {object} opts
 * @param {number} opts.period Randomly spawn peers within this period
 * @param {number} [opts.nPeers] Number of peers to spawn (default 20)
 */
async function testMultiple(t, { period, nPeers = 20 }) {
  /** @type {Map<string, LocalDiscovery>} */
  const peersById = new Map()
  /** @type {Map<string, OpenedNoiseStream[]>} */
  const connsById = new Map()
  // t.plan(3 * nPeers + 1)

  const { promise: fullyConnectedPromise, resolve: onFullyConnected } = pDefer()

  const onConnection = () => {
    const isFullyConnected = every(
      connsById.values(),
      (conns) => conns.length >= nPeers - 1
    )
    if (isFullyConnected) onFullyConnected()
  }

  /** @type {LocalDiscovery[]} */
  const peers = []
  for (let i = 0; i < nPeers; i++) {
    const identityKeypair = new KeyManager(randomBytes(16)).getIdentityKeypair()
    const discovery = new LocalDiscovery({ identityKeypair })
    const peerId = keyToPublicId(discovery.publicKey)
    peersById.set(peerId, discovery)
    /** @type {OpenedNoiseStream[]} */
    const conns = []
    connsById.set(peerId, conns)
    discovery.on('connection', (conn) => {
      conn.on('error', handleConnectionError)
      conns.push(conn)
      onConnection()
    })
    peers.push(discovery)
  }

  const servers = await Promise.all(
    peers.map(async (peer) => {
      const result = await peer.start()
      t.after(() => peer.stop({ force: true }))
      return result
    })
  )

  for (const [peerIndex, peer] of peers.entries()) {
    for (const [serverIndex, server] of servers.entries()) {
      if (peerIndex === serverIndex) continue
      delay(Math.floor(Math.random() * period)).then(() => {
        peer.connectPeer({ address: '127.0.0.1', ...server })
      })
    }
  }

  // Wait for all peers to connect to at least nPeers - 1 peers (every other peer)
  await fullyConnectedPromise
  // Wait another 1000ms for any deduplication
  await delay(1000)

  const peerIds = [...peersById.keys()]

  for (const peerId of peerIds) {
    const expected = peerIds.filter((id) => id !== peerId).sort()
    const conns = connsById.get(peerId)
    if (!conns) throw new Error('Expected connections for peer ID ' + peerId)
    const actual = conns
      .filter((conn) => !conn.destroyed)
      .map((conn) => keyToPublicId(conn.remotePublicKey))
      .sort()
    assert.deepEqual(
      actual,
      expected,
      `peer ${peerId.slice(0, 7)} connected to all ${
        expected.length
      } other peers`
    )
  }
}

/**
 * @param {Error} e
 */
function handleConnectionError(e) {
  // We expected connections to be closed when duplicates happen. On the
  // closing side the error will be ERR_DUPLICATE, but on the other side
  // the error will be an ECONNRESET - the error is not sent over the
  // connection
  const expectedError =
    e.message === ERR_DUPLICATE || ('code' in e && e.code === 'ECONNRESET')
  assert(expectedError, 'connection closed with expected error')
}
