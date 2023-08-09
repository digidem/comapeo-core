import { randomBytes } from 'crypto'
import Corestore from 'corestore'
import ram from 'random-access-memory'

import { Sqlite } from '../../src/sqlite.js'
import { AuthStore } from '../../src/authstore/index.js'
import { addCores, replicate, createIdentityKeys } from './index.js'
import { keyToId } from '../../src/utils.js'

export async function createAuthStore({
  corestore,
  keyPair,
  name,
  projectPublicKey,
} = {}) {
  const { rootKey, identityKeyPair, keyManager } = createIdentityKeys()
  const identityId = keyToId(identityKeyPair.publicKey)

  if (!keyPair) {
    keyPair = keyManager.getHypercoreKeypair(identityId, randomBytes(32))
  }

  if (!corestore) {
    corestore = new Corestore(ram, {
      primaryKey: identityKeyPair.publicKey,
    })
  }

  if (!projectPublicKey) {
    projectPublicKey = keyManager.getHypercoreKeypair(
      'project',
      randomBytes(32)
    ).publicKey
  }

  const sqlite = new Sqlite(':memory:')
  const authstore = new AuthStore({
    name,
    corestore,
    sqlite,
    identityKeyPair,
    keyPair,
    keyManager,
    projectPublicKey,
  })

  await authstore.ready()

  return {
    authstore,
    corestore,
    identityKeyPair,
    identityId,
    keyPair,
    keyManager,
    rootKey,
    sqlite,
  }
}

export async function createAuthStores(count, options) {
  const projectPublicKey = randomBytes(32)

  const peers = []
  for (let i = 0; i < count; i++) {
    const peer = await createAuthStore({ ...options, projectPublicKey })
    peers.push(peer)

    if (i === 0) {
      await peer.authstore.initProjectCreator()
    }
  }

  await addCores(peers)
  replicate(
    peers.map((peer) => {
      return {
        id: peer.identityId,
        core: peer.authstore,
      }
    })
  )
  return peers
}

export async function runAuthStoreScenario(scenario, options = {}) {
  const { t } = options

  const peers = {}
  for (const peerName of scenario.peers) {
    peers[peerName] = await createAuthStore(options)
    if (peerName === 'project-creator') {
      await peers[peerName].authstore.createCapability({
        identityPublicKey:
          peers[peerName].identityKeyPair.publicKey.toString('hex'),
        capability: 'project-creator',
      })
    }
  }

  const results = []
  for (const step of scenario.steps) {
    const peer = peers[step.peer]
    const action = actions[step.action]
    const data = getScenarioData(peers, step.data)
    const previousResult = results[results.length - 1]
    const result = await action(peer, data, previousResult)
    await step.check(t, peer, data, result, previousResult)
    results.push(result)
  }

  return Object.values(peers)
}

function getScenarioData(peers, data) {
  const peer = peers[data.identityPublicKey]
  return {
    ...data,
    identityPublicKey: peer.authstore.key.toString('hex'),
  }
}

const actions = {
  createCapability: async (peer, data) => {
    return peer.authstore.createCapability(data)
  },
  updateCapability: async (peer, data, previousResult) => {
    return peer.authstore.updateCapability(
      Object.assign({}, previousResult, data)
    )
  },
}
