import { KeyManager } from '@mapeo/crypto'
import Corestore from 'corestore'
import ram from 'random-access-memory'
import { AuthStore } from '../../lib/authstore/index.js'

/**
 * @param {string} name
 * @param {Buffer} [namespace] - 32 byte Buffer
 */
export function createCoreKeyPair(name, namespace = Buffer.alloc(32, 0)) {
  const { km } = createIdentityKeys()
  const coreKeyPair = km.getHypercoreKeypair(name, namespace)
  return coreKeyPair
}

export function createIdentityKeys() {
  const rootKey = KeyManager.generateRootKey()
  const keyManager = new KeyManager(rootKey)
  const identityKeyPair = keyManager.getIdentityKeypair()
  return { rootKey, identityKeyPair, keyManager }
}

export async function createAuthStore({ corestore, projectKeyPair } = {}) {
  const { rootKey, identityKeyPair, keyManager } = createIdentityKeys()

  if (!projectKeyPair) {
    projectKeyPair = keyManager.getHypercoreKeypair(
      'project',
      Buffer.alloc(32, 5)
    )
  }

  if (!corestore) {
    corestore = new Corestore(ram, {
      primaryKey: identityKeyPair.publicKey,
    })
  }

  const authstore = new AuthStore({
    corestore,
    identityKeyPair,
    projectKeyPair,
  })

  await authstore.ready()

  return {
    authstore,
    corestore,
    identityKeyPair,
    projectKeyPair,
    keyManager,
    rootKey,
  }
}

export function replicate(peer1, peer2) {
  const stream1 = peer1.authstore.replicate(true, { live: true })
  const stream2 = peer2.authstore.replicate(false, { live: true })
  stream1.pipe(stream2).pipe(stream1)
}

export function addCores(peer1, peer2) {
  peer1.authstore.addCore(peer2.authstore.key)
  peer2.authstore.addCore(peer1.authstore.key)
}
