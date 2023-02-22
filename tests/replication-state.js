//@ts-check
import { once } from 'node:events'
import { randomBytes } from 'crypto'
import test from 'brittle'
import Hypercore from 'hypercore'
import ram from 'random-access-memory'
import crypto from 'hypercore-crypto'

import { keyToId, idToKey, truncateId } from '../lib/utils.js'
import { ReplicationState } from '../lib/sync/replication-state.js'
import { createCoreManager, replicate, waitForCores, getKeys } from './helpers/core-manager.js'

test.skip('sync cores in a namespace', async function (t) {
  t.plan(2)
  const projectKeyPair = crypto.keyPair()
  
  const cm1 = createCoreManager({ projectKey: projectKeyPair.publicKey, projectSecretKey: projectKeyPair.secretKey })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })
  
  replicate(cm1, cm2)
  
  await Promise.all([
      waitForCores(cm1, getKeys(cm2, 'auth')),
      waitForCores(cm2, getKeys(cm1, 'auth'))
  ])
  
  const rep1 = new ReplicationState({
      coreManager: cm1,
      namespace: 'auth'
  })
  
  const rep2 = new ReplicationState({
      coreManager: cm2,
      namespace: 'auth'
  })
  
  const cm1Keys = getKeys(cm1, 'auth')
  const cm2Keys = getKeys(cm2, 'auth')
  
  const writer1 = cm1.getWriterCore('auth')
  writer1.core.append(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'])
  
  const writer2 = cm2.getWriterCore('auth')
  writer2.core.append(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])

  for (const key of cm1Keys) {
      if (key.equals(writer1.core.key)) continue
      const core = cm1.getCoreByKey(key)
      core.download({ live: true, start: 0, end: -1 })
  }

  for (const key of cm2Keys) {
      if (key.equals(writer2.core.key)) continue
      const core = cm2.getCoreByKey(key)
      core.download({ live: true, start: 0, end: -1 })
  }
  
  rep1.on('state', function rep1Handler (state) {
    const synced = rep1.isSynced()
    if (synced) {
      t.ok(synced, 'rep1 is synced')
      rep1.off('state', rep1Handler)
    }
  })

  rep2.on('state', function rep2Handler (state) {
    const synced = rep2.isSynced()
    if (synced) {
      t.ok(synced, 'rep2 is synced')
      console.log(state)
      rep2.off('state', rep2Handler)
    }
  })
})

test('access peer state', async function (t) {
  const projectKeyPair = crypto.keyPair()
  
  const cm1 = createCoreManager({ projectKey: projectKeyPair.publicKey, projectSecretKey: projectKeyPair.secretKey })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })
  
  replicate(cm1, cm2)
  
  await Promise.all([
      waitForCores(cm1, getKeys(cm2, 'auth')),
      waitForCores(cm2, getKeys(cm1, 'auth'))
  ])

  const rep = new ReplicationState({
      coreManager: cm1,
      namespace: 'auth'
  })

  const writer = cm1.getWriterCore('auth')
  writer.core.append(['a'])

  const intervalId = setInterval(async () => {
    await writer.core.append(['a'])
  }, 100)

  const reader = cm2.getCoreByKey(writer.core.key)

  rep.on('state', function handler (state) {
    if (!rep.peers.length) return

    const coreId = keyToId(writer.core.key)
    const peerDownloadState = state[coreId][rep.peers[0]]

    if (peerDownloadState.length === 1) {
      reader?.download({ start: 0, end: 2 })
    } else if (peerDownloadState.length === 2) {
      reader?.download({ start: 0, end: 3 })
    } else if (peerDownloadState.length === 3) {
      rep.off('state', handler)
      clearInterval(intervalId)
      rep.close()
      t.is(rep.isSynced(), true, 'got all blocks')
    }
  })

  reader?.download({ start: 0, end: 1 })
})

test('add peers during replication', async function (t) {})

test('remove peers during replication', async function (t) {})

test('replicate with existing data', async function (t) {})
