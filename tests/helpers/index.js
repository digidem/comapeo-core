import { KeyManager } from '@mapeo/crypto'
import Corestore from 'corestore'
import ram from 'random-access-memory'
import Sqlite from 'better-sqlite3'
import { AuthStore } from '../../lib/authstore/index.js'

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

  const sqlite = new Sqlite(':memory:')
  const authstore = new AuthStore({
    corestore,
    sqlite,
    identityKeyPair,
    projectKeyPair,
    keyManager
  })

  await authstore.ready()

  return {
    authstore,
    corestore,
    identityKeyPair,
    projectKeyPair,
    keyManager,
    rootKey,
    sqlite,
  }
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

export function addCores(peers) {
  for (const peer1 of peers) {
    for (const peer2 of peers) {
      if (peer1 === peer2) continue
      peer1.authstore.addCores(peer2.authstore.cores)
    }
  }
}

export async function runAuthStoreScenario(scenario, options = {}) {
  const { t } = options

  const peers = scenario.peers.reduce(async (obj, peerName) => {
    const peer = await createAuthStore(options)
    await peer.authstore.ready()
    obj[peerName] = peer
    return obj
  }, {})

  for (const step of scenario.steps) {
    const peer = peers[step.peer]
    const action = actions[step.action]
    const data = getScenarioData(peers, step.data)
    const result = await action(peer, data)
    if (step.result) {
      t.deepEqual(result, step.result)
    }
  }
}

function getScenarioData (peers, data) {
  return {
    ...data,
    identityPublicKey: peers[data.identityPublicKey].authstore.key.toString('hex'),
  }
}

const actions = {
  createCapability: async (peer, data) => {
    await peer.authstore.createCapability(data)
  },
  updateCapability: async (peer, data) => {
    await peer.authstore.updateCapability(data)
  }
}
