//@ts-check
import test from 'tape'
import { KeyManager } from '@mapeo/crypto'
import { NamespaceSyncState } from '../../src/sync/namespace-sync-state.js'
import {
  createCoreManager,
  waitForCores,
  getKeys,
  replicate,
} from '../helpers/core-manager.js'
import { randomBytes } from 'crypto'

// TODO(evanhahn) Fix this file

test('sync cores in a namespace', async function (t) {
  t.plan(2)
  const projectKeyPair = KeyManager.generateProjectKeypair()
  const rootKey1 = randomBytes(16)
  const rootKey2 = randomBytes(16)
  const km1 = new KeyManager(rootKey1)
  const km2 = new KeyManager(rootKey2)

  const cm1 = createCoreManager({
    rootKey: rootKey1,
    projectKey: projectKeyPair.publicKey,
    projectSecretKey: projectKeyPair.secretKey,
  })
  const cm2 = createCoreManager({
    rootKey: rootKey2,
    projectKey: projectKeyPair.publicKey,
  })

  replicate(cm1, cm2, {
    kp1: km1.getIdentityKeypair(),
    kp2: km2.getIdentityKeypair(),
  })

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth')),
  ])

  let syncState1Synced = false
  let syncState2Synced = false

  const syncState1 = new NamespaceSyncState({
    coreManager: cm1,
    namespace: 'auth',
    onUpdate: () => {
      const state = syncState1.getState()
      if (
        state.localState.want === 0 &&
        state.localState.wanted === 0 &&
        state.localState.have === 30 &&
        state.localState.missing === 10 &&
        !syncState1Synced
      ) {
        const expected = {
          [km2.getIdentityKeypair().publicKey.toString('hex')]: {
            want: 0,
            wanted: 0,
            have: 30,
            missing: 10,
            status: 'connected',
          },
        }
        t.deepEqual(state.remoteStates, expected, 'syncState1 is synced')
        syncState1Synced = true
      }
    },
  })

  const syncState2 = new NamespaceSyncState({
    coreManager: cm2,
    namespace: 'auth',
    onUpdate: () => {
      const state = syncState2.getState()
      if (
        state.localState.want === 0 &&
        state.localState.wanted === 0 &&
        state.localState.have === 30 &&
        state.localState.missing === 10 &&
        !syncState2Synced
      ) {
        const expected = {
          [km1.getIdentityKeypair().publicKey.toString('hex')]: {
            want: 0,
            wanted: 0,
            have: 30,
            missing: 10,
            status: 'connected',
          },
        }
        t.deepEqual(state.remoteStates, expected, 'syncState2 is synced')
        syncState2Synced = true
      }
    },
  })

  const cm1Keys = getKeys(cm1, 'auth')
  const cm2Keys = getKeys(cm2, 'auth')

  const writer1 = cm1.getWriterCore('auth')
  await writer1.core.append(Array(20).fill('block'))
  await writer1.core.clear(0, 10)

  const writer2 = cm2.getWriterCore('auth')
  await writer2.core.append(Array(20).fill('block'))

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

  let syncState1AlreadyDone = false
  let syncState2AlreadyDone = false

  const syncState1 = new NamespaceSyncState({
    coreManager: cm1,
    namespace: 'auth',
    onUpdate: () => {
      const { localState } = syncState1.getState()
      const synced =
        localState.wanted === 0 && localState.have === fillLength * 2
      if (synced && !syncState1AlreadyDone) {
        t.ok(synced, 'syncState1 is synced')
        syncState1AlreadyDone = true
      }
    },
  })

  const syncState2 = new NamespaceSyncState({
    coreManager: cm2,
    namespace: 'auth',
    onUpdate: () => {
      const { localState } = syncState2.getState()
      const synced =
        localState.wanted === 0 && localState.have === fillLength * 2
      if (synced && !syncState2AlreadyDone) {
        t.ok(synced, 'syncState2 is synced')
        syncState2AlreadyDone = true
      }
    },
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
})
