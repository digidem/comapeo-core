import test from 'brittle'
import { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'
import { MdnsDiscovery } from '../src/discovery/mdns.js'

test('mdns - discovery', async (t) => {
  t.plan(2)
  const identityKeypair1 = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(randomBytes(16)).getIdentityKeypair()

  const mdnsDiscovery1 = new MdnsDiscovery({
    identityKeypair: identityKeypair1,
  })
  mdnsDiscovery1.on('connection', async (stream) => {
    const remoteKey = stream.remotePublicKey.toString('hex')
    const peerKey = identityKeypair2.publicKey.toString('hex')
    t.ok(remoteKey === peerKey)
    await step()
  })

  const mdnsDiscovery2 = new MdnsDiscovery({
    identityKeypair: identityKeypair2,
  })
  mdnsDiscovery2.on('connection', async (stream) => {
    const remoteKey = stream.remotePublicKey.toString('hex')
    const peerKey = identityKeypair1.publicKey.toString('hex')
    t.ok(remoteKey === peerKey)
    await step()
  })

  let count = 0
  async function step() {
    count++
    if (count === 2) {
      // await new Promise((res) => setTimeout(res, 2000))
      mdnsDiscovery1.stop()
      mdnsDiscovery2.stop()
    }
  }

  mdnsDiscovery1.start()
  mdnsDiscovery2.start()
})

test('mdns - discovery and sharing of data', async (t) => {
  t.plan(1)
  const identityKeypair1 = new KeyManager(randomBytes(16)).getIdentityKeypair()
  const identityKeypair2 = new KeyManager(randomBytes(16)).getIdentityKeypair()

  const mdnsDiscovery1 = new MdnsDiscovery({
    identityKeypair: identityKeypair1,
  })
  const mdnsDiscovery2 = new MdnsDiscovery({
    identityKeypair: identityKeypair2,
  })
  const str = 'hi'

  mdnsDiscovery1.on('connection', (stream) => {
    stream.write(str)
    step()
  })

  mdnsDiscovery2.on('connection', (stream) => {
    stream.on('data', (d) => {
      t.ok(d.toString() === str)
      step()
    })
  })
  await mdnsDiscovery1.start()
  await mdnsDiscovery2.start()

  let count = 0
  async function step() {
    count++
    if (count === 2) {
      mdnsDiscovery1.stop()
      mdnsDiscovery2.stop()
    }
  }
})

test(`mdns - discovery of multiple peers with random time instantiation`, async (t) => {
  const nPeers = 5
  // lower timeouts can yield a failing test...
  const timeout = 7000
  let conns = []
  t.plan(nPeers + 1)

  const spawnPeer = async () => {
    const identityKeypair = new KeyManager(randomBytes(16)).getIdentityKeypair()
    const discovery = new MdnsDiscovery({ identityKeypair })
    discovery.on('connection', (stream) => {
      conns.push({
        publicKey: identityKeypair.publicKey,
        remotePublicKey: stream.remotePublicKey,
      })
    })
    const peer = {
      discovery,
      publicKey: identityKeypair.publicKey,
    }
    await discovery.start()
    return peer
  }

  /** @type {{
   * discovery:MdnsDiscovery,
   * publicKey: String,
   * stream: NoiseSecretStream<Net.Socket>
   * }[]} */
  const peers = []
  for (let p = 0; p < nPeers; p++) {
    const randTimeout = Math.floor(Math.random() * 2000)
    setTimeout(async () => {
      peers.push(await spawnPeer())
    }, randTimeout)
  }
  setTimeout(async () => {
    t.is(
      conns.length,
      nPeers * (nPeers - 1),
      `number of connections match the number of peers (nPeers * (nPeers - 1))`
    )
    for (let peer of peers) {
      const publicKey = peer.publicKey
      const peerConns = conns
        .filter(({ publicKey: localKey }) => localKey === publicKey)
        .map(({ remotePublicKey }) => remotePublicKey.toString('hex'))
        .sort()
      const otherConns = peers
        .filter(({ publicKey: peerKey }) => publicKey !== peerKey)
        .map(({ publicKey }) => publicKey.toString('hex'))
        .sort()

      t.alike(otherConns, peerConns, `the set of peer public keys match`)
    }
  }, timeout)

  t.teardown(async () => {
    for (let peer of peers) {
      await peer.discovery.stop()
    }
    t.end()
  })
})

test(`mdns - discovery of multiple peers with simultaneous instantiation`, async (t) => {
  const nPeers = 7
  // lower timeouts can yield a failing test...
  const timeout = 7000
  let conns = []
  t.plan(nPeers + 1)

  const spawnPeer = async () => {
    const identityKeypair = new KeyManager(randomBytes(16)).getIdentityKeypair()
    const discovery = new MdnsDiscovery({ identityKeypair })
    discovery.on('connection', (stream) => {
      conns.push({
        publicKey: identityKeypair.publicKey,
        remotePublicKey: stream.remotePublicKey,
      })
    })
    const peer = {
      discovery,
      publicKey: identityKeypair.publicKey,
    }
    await discovery.start()
    return peer
  }

  /** @type {{
   * discovery:MdnsDiscovery,
   * publicKey: String,
   * stream: NoiseSecretStream<Net.Socket>
   * }[]} */
  const peers = []
  for (let p = 0; p < nPeers; p++) {
    peers.push(await spawnPeer())
  }
  setTimeout(async () => {
    t.is(
      conns.length,
      nPeers * (nPeers - 1),
      `number of connections match the number of peers (nPeers * (nPeers - 1))`
    )
    for (let peer of peers) {
      const publicKey = peer.publicKey
      const peerConns = conns
        .filter(({ publicKey: localKey }) => localKey === publicKey)
        .map(({ remotePublicKey }) => remotePublicKey.toString('hex'))
        .sort()
      const otherConns = peers
        .filter(({ publicKey: peerKey }) => publicKey !== peerKey)
        .map(({ publicKey }) => publicKey.toString('hex'))
        .sort()

      t.alike(otherConns, peerConns, `the set of peer public keys match`)
    }
  }, timeout)

  t.teardown(async () => {
    for (let peer of peers) {
      await peer.discovery.stop()
    }
    t.end()
  })
})
