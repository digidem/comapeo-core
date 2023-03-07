import test from 'brittle'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hypercore from 'hypercore'
import RAM from 'random-access-memory'
import { createCoreManager, replicate } from './helpers/core-manager.js'
import { randomBytes } from 'crypto'
import Sqlite from 'better-sqlite3'
import { KeyManager } from '@mapeo/crypto'
import { CoreManager } from '../lib/core-manager/index.js'
import assert from 'assert'

async function createCore (...args) {
  const core = new Hypercore(RAM, ...args)
  await core.ready()
  return core
}

test('shares auth cores', async function (t) {
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey })
  const cm2 = createCoreManager({ projectKey })

  replicate(cm1, cm2)

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth'))
  ])

  const cm1Keys = getKeys(cm1, 'auth').sort(Buffer.compare)
  const cm2Keys = getKeys(cm2, 'auth').sort(Buffer.compare)

  t.alike(cm1Keys, cm2Keys, 'Share same auth cores')
})

test('project creator auth core has project key', async function (t) {
  const db = new Sqlite(':memory:')
  const keyManager = new KeyManager(randomBytes(16))
  const { publicKey: projectKey, secretKey: projectSecretKey } =
    keyManager.getHypercoreKeypair('auth', randomBytes(32))
  const cm = new CoreManager({
    db,
    keyManager,
    storage: RAM,
    projectKey,
    projectSecretKey
  })
  const { key: authCoreKey } = cm.getWriterCore('auth')
  t.ok(authCoreKey.equals(projectKey))
})

test('getCreatorCore()', async t => {
  const projectKey = randomBytes(32)
  const cm = createCoreManager({ projectKey })
  await cm.creatorCore.ready()
  t.ok(cm.creatorCore.key.equals(projectKey))
})

test('eagerly updates remote bitfields', async function (t) {
  // Replication progress relies on the peer.remoteBitfield to actually match
  // the bitfield of the peer. By default hypercore only updates the
  // remoteBitfield for the ranges of a hypercore that you try to download. We
  // "hack" hypercore to get the bitfield for the whole core, and this test
  // checks that functionality.

  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey })
  const cm2 = createCoreManager({ projectKey })
  const cm3 = createCoreManager({ projectKey })

  const cm1Core = cm1.getWriterCore('auth').core
  await cm1Core.ready()
  await cm1Core.append(['a', 'b', 'c', 'd', 'e'])
  // Hypercore only shares the contiguous length on initial handshake, not the
  // whole bitfield, so we need to test replicating a bitfield with
  // contiguousLength < length
  await cm1Core.clear(2, 3)

  const destroyReplication = replicate(cm1, cm2).destroy

  await waitForCores(cm2, [cm1Core.key])
  const cm2Core = cm2.getCoreByKey(cm1Core.key)
  t.ok(cm2Core, 'writer core has replicated')

  // Need to wait for now, since no event for when a remote bitfield is updated
  await new Promise(res => setTimeout(res, 200))

  t.is(cm2Core.length, cm1Core.length)

  {
    // This is testing that the remote bitfield is a duplicate of the bitfield
    // on the core that is being replicated, prior to calling core.download()
    t.ok(
      bitfieldEquals(
        cm2Core.peers[0].remoteBitfield,
        cm1Core.core.bitfield,
        cm1Core.length
      ),
      'remote bitfield is same as source bitfield'
    )
  }

  // replicate the (sparse) data and then clear data on the writer
  await cm2Core
    .download({ start: 0, end: cm2Core.length, ifAvailable: true })
    .done()
  await destroyReplication()
  await cm1Core.clear(0, 2)

  {
    // This is ensuring that bitfields also get propogated in the other
    // direction, e.g. from the non-writer to the writer
    const { destroy } = replicate(cm1, cm2)
    // Need to wait for now, since no event for when a remote bitfield is updated
    await new Promise(res => setTimeout(res, 200))
    t.ok(
      bitfieldEquals(
        cm1Core.peers[0].remoteBitfield,
        cm2Core.core.bitfield,
        cm1Core.length
      ),
      'remote bitfield on writer matches bitfield from replica'
    )
    await destroy()
  }

  {
    // cm3 is not connected directly to cm1. Important to catch edge case of
    // propertly propagating updates to remoteBitfield between peers that are
    // not directly connected
    replicate(cm1, cm2)
    replicate(cm2, cm3)

    await new Promise(res => setTimeout(res, 200))

    const cm3Core = cm3.getCoreByKey(cm1Core.key)
    t.alike(cm3Core.length, cm1Core.length)

    t.ok(
      bitfieldEquals(
        cm3Core.peers[0].remoteBitfield,
        cm2Core.core.bitfield,
        cm2Core.length
      ),
      'remote bitfield updated via indirect replication'
    )

    await cm1Core.append(['f', 'g', 'h', 'i', 'j'])
    await cm1Core.append(['k', 'l', 'm', 'o', 'p'])
    await cm2Core.download({ start: 9, end: 12 }).done()

    await new Promise(res => setTimeout(res, 200))

    t.alike(cm3Core.length, cm1Core.length)
    t.ok(
      bitfieldEquals(
        cm3Core.peers[0].remoteBitfield,
        cm2Core.core.bitfield,
        cm2Core.length
      ),
      'remote bitfield updated via indirect replication'
    )
  }
})

test('works with an existing protocol stream for replications', async function (t) {
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey })
  const cm2 = createCoreManager({ projectKey })

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  const s1 = Hypercore.createProtocolStream(n1)
  const s2 = Hypercore.createProtocolStream(n2)

  cm1.replicate(s1)
  cm2.replicate(s2)

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth'))
  ])

  const cm1Keys = getKeys(cm1, 'auth').sort(Buffer.compare)
  const cm2Keys = getKeys(cm2, 'auth').sort(Buffer.compare)

  t.alike(cm1Keys, cm2Keys, 'Share same auth cores')
})

test.skip('can mux other project replications over same stream', async function (t) {
  // This test fails because https://github.com/holepunchto/corestore/issues/45
  // The `ondiscoverykey` hook for `Hypercore.createProtocolStream()` that we
  // use to know when other cores are muxed in the stream is only called the
  // first time the protocol stream is created. When a second core replicates
  // to the same stream, it sees it is already a protomux stream, and it does
  // not add the notify hook for `ondiscoverykey`.
  // We might be able to work around this if we want to enable multi-project
  // muxing before the issue is resolved by creating the protomux stream outside
  // the core manager, and then somehow hooking into the relevant corestore.
  t.plan(2)
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey })
  const cm2 = createCoreManager({ projectKey })
  const otherProject = createCoreManager()

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  await Promise.all([
    waitForCores(cm1, getKeys(cm2, 'auth')),
    waitForCores(cm2, getKeys(cm1, 'auth'))
  ])

  cm1.replicate(n1)
  otherProject.replicate(n2)
  cm2.replicate(n2)
})

test('multiplexing waits for cores to be added', async function (t) {
  // Mapeo code expects replication to work when cores are not added to the
  // replication stream at the same time. This is not explicitly tested in
  // Hypercore so we check here that this behaviour works.
  t.plan(2)

  const a1 = await createCore()
  const a2 = await createCore()

  const b1 = await createCore(a1.key)
  const b2 = await createCore(a2.key)

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  const stream1 = Hypercore.createProtocolStream(n1)
  const stream2 = Hypercore.createProtocolStream(n2)

  a1.replicate(stream1, { keepAlive: false })
  a2.replicate(stream1, { keepAlive: false })

  await a1.append('hi')
  await a2.append('ho')

  setTimeout(() => {
    b1.replicate(stream2, { keepAlive: false })
    b2.replicate(stream2, { keepAlive: false })
  }, 7000)

  t.alike(await b1.get(0), Buffer.from('hi'))
  t.alike(await b2.get(0), Buffer.from('ho'))
})

test('close()', async t => {
  const cm = createCoreManager()
  for (const namespace of CoreManager.namespaces) {
    cm.addCore(randomBytes(32), namespace)
  }
  await cm.close()
  for (const namespace of CoreManager.namespaces) {
    for (const { core } of cm.getCores(namespace)) {
      t.ok(core.closed, 'core is closed')
      t.is(core.sessions.length, 0, 'no open sessions')
    }
  }
  const ns = new NoiseSecretStream(true)
  t.exception(() => cm.replicate(ns), /closed/)
})

test('Added cores are persisted', async t => {
  const db = new Sqlite(':memory:')
  const keyManager = new KeyManager(randomBytes(16))
  const projectKey = randomBytes(32)
  const cm1 = new CoreManager({
    db,
    keyManager,
    storage: RAM,
    projectKey
  })
  const key = randomBytes(32)
  cm1.addCore(key, 'auth')

  await cm1.close()

  const cm2 = new CoreManager({
    db,
    keyManager,
    storage: RAM,
    projectKey
  })

  t.ok(cm2.getCoreByKey(key), 'Added core is persisted')
})

async function waitForCores (coreManager, keys) {
  const allKeys = getAllKeys(coreManager)
  if (hasKeys(keys, allKeys)) return
  return new Promise(res => {
    coreManager.on('add-core', function onAddCore ({ key }) {
      allKeys.push(key)
      if (hasKeys(keys, allKeys)) {
        coreManager.off('add-core', onAddCore)
        res()
      }
    })
  })
}

function getAllKeys (coreManager) {
  const keys = []
  for (const namespace of CoreManager.namespaces) {
    keys.push.apply(keys, getKeys(coreManager, namespace))
  }
  return keys
}

function getKeys (coreManager, namespace) {
  return coreManager.getCores(namespace).map(({ key }) => key)
}

function hasKeys (someKeys, allKeys) {
  for (const key of someKeys) {
    if (!allKeys.find(k => k.equals(key))) return false
  }
  return true
}

const DEBUG = process.env.DEBUG

// Compare two bitfields (instance of core.core.bitfield or peer.remoteBitfield)
// Need to pass len, since bitfields don't know their own length
function bitfieldEquals (actual, expected, len) {
  assert(typeof len === 'number')
  let actualStr = ''
  let expectedStr = ''
  for (let i = 0; i < len; i++) {
    const actualBit = actual.get(i)
    const expectedBit = expected.get(i)
    if (DEBUG) {
      // This will cause memory issues for large bitfields, so only do for debug
      actualStr += actualBit ? '1' : '0'
      expectedStr += expectedBit ? '1' : '0'
    } else {
      if (actualBit !== expectedBit) return false
    }
  }
  if (DEBUG) {
    if (actualStr === expectedStr) {
      console.log(`bitfield as expected: '${expectedStr}'`)
      return true
    } else {
      console.error(`expected '${expectedStr}', but got '${actualStr}'`)
      return false
    }
  } else {
    return true
  }
}
