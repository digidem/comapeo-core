//@ts-check
import test from 'brittle'
import { KeyManager } from '@mapeo/crypto'
import { NamespaceSyncState } from '../../src/sync/namespace-sync-state.js'
import {
  createCoreManager,
  waitForCores,
  getKeys,
} from '../helpers/core-manager.js'
import { replicate } from '../helpers/replication-state.js'

test('sync cores in a namespace', async function (t) {
  t.plan(2)
  const projectKeyPair = KeyManager.generateProjectKeypair()

  const cm1 = createCoreManager({
    projectKey: projectKeyPair.publicKey,
    projectSecretKey: projectKeyPair.secretKey,
  })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })

  replicate(cm1, cm2)

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth')),
  ])

  const syncState1 = new NamespaceSyncState({
    coreManager: cm1,
    namespace: 'auth',
  })

  const syncState2 = new NamespaceSyncState({
    coreManager: cm2,
    namespace: 'auth',
  })

  const cm1Keys = getKeys(cm1, 'auth')
  const cm2Keys = getKeys(cm2, 'auth')

  const writer1 = cm1.getWriterCore('auth')
  await writer1.core.append([
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
  ])
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

  syncState1.on('state', function rep1Handler(state) {
    if (state.localState.want === 0 && state.localState.wanted === 0) {
      t.pass('rep1 is synced')
      syncState1.off('state', rep1Handler)
    }
  })

  syncState2.on('state', function rep2Handler(state) {
    if (state.localState.want === 0 && state.localState.wanted === 0) {
      t.pass('rep2 is synced')
      syncState2.off('state', rep2Handler)
    }
  })
})

test('replicate with updating data', async function (t) {
  t.plan(2)
  const fillLength = 5000

  const projectKeyPair = KeyManager.generateProjectKeypair()

  const cm1 = createCoreManager({
    projectKey: projectKeyPair.publicKey,
    projectSecretKey: projectKeyPair.secretKey,
  })
  const cm2 = createCoreManager({ projectKey: projectKeyPair.publicKey })

  const writer1 = cm1.getWriterCore('auth')
  for (let i = 0; i < fillLength; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer1.core.append(blocks)
  }

  const writer2 = cm2.getWriterCore('auth')
  for (let i = 0; i < fillLength; i = i + 100) {
    const blocks = new Array(100).fill(null).map((b, i) => `block ${i}`)
    writer2.core.append(blocks)
  }

  replicate(cm1, cm2)

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth')),
  ])

  const syncState1 = new NamespaceSyncState({
    coreManager: cm1,
    namespace: 'auth',
  })

  const syncState2 = new NamespaceSyncState({
    coreManager: cm2,
    namespace: 'auth',
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

  syncState1.on('state', function onSync({ localState }) {
    const synced = localState.wanted === 0 && localState.have === fillLength * 2

    if (synced) {
      t.ok(synced, 'rep1 is synced')
      syncState1.off('state', onSync)
    }
  })

  syncState2.on('state', function onSync({ localState }) {
    const synced = localState.wanted === 0 && localState.have === fillLength * 2
    if (synced) {
      t.ok(synced, 'rep2 is synced')
      syncState2.off('state', onSync)
    }
  })
})
