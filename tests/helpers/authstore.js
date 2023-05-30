import { randomBytes } from 'crypto'
import RandomAccessMemory from 'random-access-memory'
import Database from 'better-sqlite3'

import { CoreManager } from '../../lib/core-manager/index.js'
import { Sqlite } from '../../lib/sqlite.js'
import { Authstore } from '../../lib/authstore/index.js'
import { createIdentityKeys } from './index.js'
import { keyToId } from '../../lib/utils.js'

export async function createAuthstore({
  keyPair,
  name,
  projectPublicKey,
} = {}) {
  const { rootKey, identityKeyPair, keyManager } = createIdentityKeys()
  const identityId = keyToId(identityKeyPair.publicKey)

  if (!keyPair) {
    keyPair = keyManager.getHypercoreKeypair(identityId, randomBytes(32))
  }

  const coreManager = new CoreManager({
    keyManager,
    projectKey: keyPair.publicKey,
    projectSecretKey: keyPair.secretKey,
    storage: RandomAccessMemory,
    db: new Database(':memory:'),
  })

  if (!projectPublicKey) {
    projectPublicKey = keyManager.getHypercoreKeypair(
      'project',
      randomBytes(32)
    ).publicKey
  }

  const sqlite = new Sqlite(':memory:')
  const authstore = new Authstore({
    name,
    coreManager,
    sqlite,
    identityKeyPair,
    keyPair,
    keyManager,
    projectPublicKey,
  })

  await authstore.ready()

  return {
    authstore,
    coreManager,
    identityKeyPair,
    identityId,
    keyPair,
    keyManager,
    rootKey,
    sqlite,
  }
}

export async function createAuthstores(count, options) {
  const projectPublicKey = randomBytes(32)

  const peers = []
  for (let i = 0; i < count; i++) {
    const peer = await createAuthstore({ ...options, projectPublicKey })
    peers.push(peer)

    if (i === 0) {
      await peer.authstore.initProjectCreator()
    }
  }

  return peers
}

export async function runAuthstoreScenario(scenario, options = {}) {
  const { t } = options

  const peers = {}
  for (const peerName of scenario.peers) {
    peers[peerName] = await createAuthstore(options)
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
