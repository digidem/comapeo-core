//@ts-check
import test from 'brittle'
import crypto from 'hypercore-crypto'

import { keyToId } from '../lib/utils.js'
import { ReplicationState, CoreReplicationState } from '../lib/sync/replication-state.js'
import { createCoreManager, waitForCores, getKeys } from './helpers/core-manager.js'
import { download, downloadCore, replicate } from './helpers/replication-state.js'
import { createCore } from './helpers/index.js'

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
  await writer1.core.append(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'])
  await writer1.core.clear(0, 10)

  const writer2 = cm2.getWriterCore('auth')
  await writer2.core.append(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])

  for (const key of cm1Keys) {
      if (key.equals(writer1.core.key)) continue
      const core = cm1.getCoreByKey(key)
      core.download({ start: 0, end: -1 })
  }

  for (const key of cm2Keys) {
      if (key.equals(writer2.core.key)) continue
      const core = cm2.getCoreByKey(key)
      core.download({ start: 0, end: -1 })
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
    const peerDownloadState = state.cores[coreId].find((c) => c.peerId === rep.peers[0].id)

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
      if (state.synced) {
        t.ok(state.synced, 'rep3 is synced')
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

  let added = false
  rep2.on('state', async function rep2Handler (state) {
    // add another core manager after replication has started between the others
    if (!state.synced && !added) {
      added = true
      await addCoreManager([cm1, cm2])
    }
    if (state.synced) {
      t.ok(state.synced, 'rep2 is synced')
      rep2.off('state', rep2Handler)
    }
  })
})

test('peer leaves during replication, third peer arrives, sync all later', async function (t) {
  t.plan(5)
  const projectKeyPair = crypto.keyPair()

  const cm1 = createCoreManager({ projectKey: projectKeyPair.publicKey, projectSecretKey: projectKeyPair.secretKey })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })
  const cm3 = createCoreManager({ projectKey: projectKeyPair.publicKey })

  const writer1 = cm1.getWriterCore('auth')
  for (let i = 0; i < 1000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    await writer1.core.append(blocks)
  }

  const writer2 = cm2.getWriterCore('auth')
  for (let i = 0; i < 2000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    await writer2.core.append(blocks)
  }

  const writer3 = cm3.getWriterCore('auth')
  for (let i = 0; i < 3000; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    await writer3.core.append(blocks)
  }

  const { syncStream1, syncStream2 } = replicate(cm1, cm2)

  const cm1Keys = getKeys(cm1, 'auth')
  const cm2Keys = getKeys(cm2, 'auth')
  const cm3Keys = getKeys(cm3, 'auth')

  await Promise.all([
      waitForCores(cm1, cm2Keys),
      waitForCores(cm2, cm1Keys)
  ])

  const rep1 = new ReplicationState({
      coreManager: cm1,
      namespace: 'auth'
  })

  const rep2 = new ReplicationState({
      coreManager: cm2,
      namespace: 'auth'
  })

  const rep3 = new ReplicationState({
      coreManager: cm3,
      namespace: 'auth'
  })

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

  rep3.on('state', function rep3Handler (state) {
    if (state.synced) {
      t.ok(state.synced, 'rep3 is synced')
      rep3.off('state', rep3Handler)
    }
  })

  await downloadCore(cm1, { key: writer2.core.key, start: 0, end: 100 })
  await downloadCore(cm1, { key: writer2.core.key, start: 300, end: 400 })
  await downloadCore(cm2, { key: writer1.core.key, start: 0, end: 200 })
  await downloadCore(cm2, { key: writer1.core.key, start: 400, end: 500 })

  syncStream1.on('close', async () => {
    t.is(rep1.state.synced, false, 'writer1 is not synced with writer2')

    // add another core manager after replication has stopped between the first two
    replicate(cm1, cm3)

    // sync part of peer3 with peer1, sync all of peer1 with peer3
    await waitForCores(cm1, cm3Keys)
    await downloadCore(cm1, { key: writer3.core.key, start: 0, end: 1600 })
    await downloadCore(cm3, { key: writer1.core.key })

    // restart replication between peer1 and peer2
    replicate(cm1, cm2)
    await Promise.all([
      waitForCores(cm1, cm2Keys),
      waitForCores(cm2, cm1Keys)
    ])

    // sync all data between peer1 and peer2
    await download(cm1, 'auth')
    await download(cm2, 'auth')
  })

  syncStream2.on('close', async () => {
    t.is(rep2.state.synced, false, 'writer2 is not synced with writer1')

    // replicate between peer2 and peer3
    replicate(cm2, cm3)
    await waitForCores(cm2, cm3Keys)

    // sync part of peer3 with peer2, sync all of peer2 with peer3
    await downloadCore(cm2, { key: writer3.core.key, start: 1400, end: -1 })
    await downloadCore(cm3, { key: writer2.core.key })
  })

  syncStream2.destroy()
})

test('replicate core with unavailable blocks', async (t) => {
  t.plan(2)

  const core1 = await createCore()
  const core2 = await createCore(core1.key)

  await core1.append(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  await core1.clear(2, 3)

  const rs = new CoreReplicationState({ core: core2 })

  const expected = {
    length: 7,
    have: 6,
    want: 1,
    unavailable: 1
  }

  rs.on('synced', (state) => {
    for (const { length, have, want, unavailable } of state) {
      t.alike({ length, have, want, unavailable }, expected, 'peer state is correct')
    }
  })

  const s1 = core1.replicate(true)
  const s2 = core2.replicate(false)
  s1.pipe(s2).pipe(s1)

  core2.download()
})

test('replicate 3 cores with unavailable blocks', async (t) => {
  t.plan(3)
  const core1 = await createCore()
  const core2 = await createCore(core1.key)
  const core3 = await createCore(core1.key)

  await core1.append(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  replicate(core1, core2)
  await core2.download({ start: 0, end: core1.length }).done()

  await core2.clear(2, 5)

  replicate(core1, core3)
  replicate(core2, core3)

  const rs = new CoreReplicationState({ core: core3 })

  rs.on('synced', async () => {
    const block1 = await core1.get(2, { wait: false, valueEncoding: 'utf-8' })
    const block2 = await core2.get(2, { wait: false, valueEncoding: 'utf-8' })
    const block3 = await core3.get(2, { wait: false, valueEncoding: 'utf-8' })

    t.is(block1, 'c', 'block1 is available in core1')
    t.is(block2, null, 'block2 is unavailable in core2')
    t.is(block3, 'c', 'block3 is available in core3')
  })

  core3.download()
})
