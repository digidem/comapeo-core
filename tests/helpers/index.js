import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'

/**
 * @param {string} name
 * @param {Buffer} [namespace] - 32 byte Buffer
 */
export function createCoreKeyPair(name, namespace = randomBytes(32)) {
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
  for (const peer1 of peers) {
    for (const peer2 of peers) {
      if (peer1 === peer2) continue
      const stream1 = peer1.authstore.replicate(true, { live: true })
      const stream2 = peer2.authstore.replicate(false, { live: true })
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
