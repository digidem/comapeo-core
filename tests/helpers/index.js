import { KeyManager } from '@mapeo/crypto'

export async function createCore (...args) {
  const core = new Hypercore(RAM, ...args)
  await core.ready()
  return core
}

/**
 * @param {string} name
 * @param {Buffer} [namespace] - 32 byte Buffer
 */
export function createCoreKeyPair(name, namespace = Buffer.alloc(32, 0)) {
  const { keyManager } = createIdentityKeys()
  const coreKeyPair = keyManager.getHypercoreKeypair(name, namespace)
  return coreKeyPair
}

export function createIdentityKeys() {
  const rootKey = KeyManager.generateRootKey()
  const keyManager = new KeyManager(rootKey)
  const identityKeyPair = keyManager.getIdentityKeypair()
  const identityId = identityKeyPair.publicKey.toString('hex')
  return { rootKey, identityId, identityKeyPair, keyManager }
}

export function replicate(peers) {
  const connected = new Map()

  for (const peer1 of peers) {
    const peer1Connections = new Set()
    connected.set(peer1.id, peer1Connections)

    for (const peer2 of peers) {
      if (peer1.id === peer2.id) {
        continue
      }

      const peer2Connections = connected.get(peer2.id)

      if (
        peer1Connections.has(peer2.id) ||
        (peer2Connections && peer2Connections.has(peer1.id))
      ) {
        continue
      }

      peer1Connections.add(peer2.id)
      const stream1 = peer1.core.replicate(true, { live: true })
      const stream2 = peer2.core.replicate(false, { live: true })
      stream1.pipe(stream2).pipe(stream1)
    }
  }
}

export async function addCores(peers) {
  for (const peer1 of peers) {
    for (const peer2 of peers) {
      if (peer1 === peer2) continue
      for (const key of peer2.authstore.keys) {
        await peer1.authstore.getCore(key)
      }
    }
  }
}

export async function waitForIndexing(stores) {
  await Promise.all(
    stores.map((store) => {
      return store.indexing()
    })
  )
}
