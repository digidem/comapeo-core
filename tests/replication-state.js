//@ts-check
import test from 'brittle'
import crypto from 'hypercore-crypto'

import { keyToId, truncateId } from '../lib/utils.js'
import { ReplicationState } from '../lib/sync/replication-state.js'
import { createCoreManager, replicate, waitForCores, getKeys } from './helpers/core-manager.js'
import { download, logState } from './helpers/replication-state.js'

test('sync cores in a namespace', async function (t) {
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
    if (state.synced) {
      t.ok(state.synced, 'rep1 is synced')
      rep1.off('state', rep1Handler)
    }
  })

  rep2.on('state', function rep2Handler (state) {
    if (state.synced) {
      t.ok(state.synced, 'rep2 is synced')
      rep2.off('state', rep2Handler)
    }
  })
})

test('access peer state', async function (t) {
  t.plan(1)

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
    const peerDownloadState = state.cores[coreId][rep.peers[0]]

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

test('replicate with updating data', async function (t) {
  t.plan(2)

  const projectKeyPair = crypto.keyPair()
  
  const cm1 = createCoreManager({ projectKey: projectKeyPair.publicKey, projectSecretKey: projectKeyPair.secretKey })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })
  
  const writer1 = cm1.getWriterCore('auth')
  for (let i = 0; i < 5000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer1.core.append(blocks)
  }

  const writer2 = cm2.getWriterCore('auth')
  for (let i = 0; i < 5000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer2.core.append(blocks)
  }

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
      rep2.off('state', rep2Handler)
    }
  })
})

test('add peer during replication', async function (t) {
  t.plan(3)

  const projectKeyPair = crypto.keyPair()
  
  const cm1 = createCoreManager({ projectKey: projectKeyPair.publicKey, projectSecretKey: projectKeyPair.secretKey })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })

  const writer1 = cm1.getWriterCore('auth')
  for (let i = 0; i < 1000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer1.core.append(blocks)
  }

  const writer2 = cm2.getWriterCore('auth')
  for (let i = 0; i < 2000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer2.core.append(blocks)
  }

  async function addCoreManager (existingCoreManagers) {
    const connectedCoreManager = existingCoreManagers[0]
  
    const coreManager = createCoreManager({ projectKey: projectKeyPair.publicKey })
    const writer = coreManager.getWriterCore('auth')
    await writer.core.ready()
    for (let i = 0; i < 3000; i = i + 100) {
      const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
      await writer.core.append(blocks)
    }

    for (const existingCoreManager of existingCoreManagers) {
      replicate(existingCoreManager, coreManager)
    }

    await Promise.all([
      waitForCores(coreManager, getKeys(connectedCoreManager, 'auth'))
    ])

    download(coreManager, 'auth')

    for (const existingCoreManager of existingCoreManagers) {
      replicate(existingCoreManager, coreManager)
      download(existingCoreManager, 'auth')
    }

    const rep = new ReplicationState({
      coreManager: coreManager,
      namespace: 'auth',
    })

    rep.on('state', function rep3Handler (state) {
      // logState(state)
      if (state.synced) {
        t.ok(state.synced, 'rep3 is synced')
        // logState(state)
        rep.off('state', rep3Handler)
      }
    })

    return { coreManager, writer, rep }
  }

  replicate(cm1, cm2)

  await Promise.all([
      waitForCores(cm1, getKeys(cm2, 'auth')),
      waitForCores(cm2, getKeys(cm1, 'auth'))
  ])

  const rep1 = new ReplicationState({
      coreManager: cm1,
      namespace: 'auth',
  })

  const rep2 = new ReplicationState({
      coreManager: cm2,
      namespace: 'auth',
  })

  download(cm1, 'auth')
  download(cm2, 'auth')

  rep1.on('state', function rep1Handler (state) {
    // logState(state)
    if (state.synced) {
      // logState(state)
      t.ok(state.synced, 'rep1 is synced')
      rep1.off('state', rep1Handler)
    }
  })

  let added
  rep2.on('state', async function rep2Handler (state) {
    // add another core manager after replication has started between the others
    if (!state.synced && !added) {
      added = addCoreManager([cm1, cm2])
    }
    // logState(state)
    if (state.synced) {
      // logState(state)
      t.ok(state.synced, 'rep2 is synced')
      rep2.off('state', rep2Handler)
    }
  })

  await added
})
