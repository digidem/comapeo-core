import test from 'brittle'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hypercore from 'hypercore'
import RAM from 'random-access-memory'
import { createCoreManager, replicate } from './helpers/core-manager.js'
import { randomBytes } from 'crypto'
import Sqlite from 'better-sqlite3'
import { KeyManager } from '@mapeo/crypto'
import {
  CoreManager,
  kCoreManagerReplicate,
} from '../src/core-manager/index.js'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'
import assert from 'assert'
import { once } from 'node:events'
import { temporaryDirectoryTask } from 'tempy'
import { exec } from 'child_process'
import { RandomAccessFilePool } from '../src/core-manager/random-access-file-pool.js'
import RandomAccessFile from 'random-access-file'
import path from 'path'
import { Transform } from 'streamx'
import { waitForCores } from './helpers/core-manager.js'

async function createCore(key) {
  const core = new Hypercore(RAM, key)
  await core.ready()
  return core
}

test('project creator auth core has project key', async function (t) {
  const sqlite = new Sqlite(':memory:')
  const keyManager = new KeyManager(randomBytes(16))
  const { publicKey: projectKey, secretKey: projectSecretKey } =
    keyManager.getHypercoreKeypair('auth', randomBytes(32))
  const cm = new CoreManager({
    sqlite,
    keyManager,
    storage: RAM,
    projectKey,
    projectSecretKey,
  })
  const { key: authCoreKey } = cm.getWriterCore('auth')
  t.ok(authCoreKey.equals(projectKey))
})

test('getCreatorCore()', async (t) => {
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
  await new Promise((res) => setTimeout(res, 200))

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
    await new Promise((res) => setTimeout(res, 200))
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

    await new Promise((res) => setTimeout(res, 200))

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

    await new Promise((res) => setTimeout(res, 200))

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

test('close()', async (t) => {
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
})

test('Added cores are persisted', async (t) => {
  const sqlite = new Sqlite(':memory:')
  const keyManager = new KeyManager(randomBytes(16))
  const projectKey = randomBytes(32)
  const cm1 = new CoreManager({
    sqlite,
    keyManager,
    storage: RAM,
    projectKey,
  })
  const key = randomBytes(32)
  cm1.addCore(key, 'auth')

  await cm1.close()

  const cm2 = new CoreManager({
    sqlite,
    keyManager,
    storage: RAM,
    projectKey,
  })

  t.ok(cm2.getCoreByKey(key), 'Added core is persisted')
})

test('encryption', async function (t) {
  const encryptionKeys = {}
  for (const ns of CoreManager.namespaces) {
    encryptionKeys[ns] = randomBytes(32)
  }
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey, encryptionKeys })
  const cm2 = createCoreManager({ projectKey })
  const cm3 = createCoreManager({ projectKey, encryptionKeys })

  replicate(cm1, cm2)
  replicate(cm1, cm3)

  for (const ns of CoreManager.namespaces) {
    const { core, key } = cm1.getWriterCore(ns)
    const { core: coreReplica2 } = cm2.addCore(key, ns)
    const { core: coreReplica3 } = cm3.addCore(key, ns)
    const value = Buffer.from(ns)
    await core.append(value)
    t.unlike(await coreReplica2.get(0), value)
    t.alike(await coreReplica3.get(0), value)
  }
})

test('poolSize limits number of open file descriptors', async function (t) {
  const keyManager = new KeyManager(randomBytes(16))
  const { publicKey: projectKey, secretKey: projectSecretKey } =
    keyManager.getHypercoreKeypair('auth', randomBytes(32))

  const CORE_COUNT = 500
  await temporaryDirectoryTask(async (tempPath) => {
    const sqlite = new Sqlite(':memory:')
    const storage = (name) => new RandomAccessFile(path.join(tempPath, name))
    const cm = new CoreManager({
      sqlite,
      keyManager,
      storage,
      projectKey,
      projectSecretKey,
    })
    // -1 because CoreManager creates a writer core already
    for (let i = 0; i < CORE_COUNT - 1; i++) {
      const coreKey = randomBytes(32)
      cm.addCore(coreKey, 'data')
    }
    const readyPromises = cm.getCores('data').map(({ core }) => core.ready())
    t.is(readyPromises.length, CORE_COUNT)
    await Promise.all(readyPromises)
    const fdCount = await countOpenFileDescriptors(tempPath)
    t.ok(fdCount > CORE_COUNT, 'without pool, at least one fd per core')
  })

  await temporaryDirectoryTask(async (tempPath) => {
    const POOL_SIZE = 100
    const sqlite = new Sqlite(':memory:')
    const pool = new RandomAccessFilePool(POOL_SIZE)
    const storage = (name) =>
      new RandomAccessFile(path.join(tempPath, name), { pool })
    const cm = new CoreManager({
      sqlite,
      keyManager,
      storage,
      projectKey,
      projectSecretKey,
    })
    // -1 because we CoreManager creates a writer core already
    for (let i = 0; i < CORE_COUNT - 1; i++) {
      const coreKey = randomBytes(32)
      cm.addCore(coreKey, 'data')
    }
    const readyPromises = cm.getCores('data').map(({ core }) => core.ready())
    await Promise.all(readyPromises)
    const fdCount = await countOpenFileDescriptors(tempPath)
    t.is(
      fdCount,
      POOL_SIZE,
      'with pool, no more file descriptors than pool size'
    )
  })
})

test('sends "haves" bitfields over project creator core replication stream', async function (t) {
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager({ projectKey })
  const cm2 = createCoreManager({ projectKey })
  /**
   * For each peer, indexed by peerId, a map of hypercore bitfields, indexed by discoveryId
   * @type {Map<string, Map<import('../src/core-manager/index.js').Namespace, Map<string, RemoteBitfield>>>}
   */
  const havesByPeer = new Map()

  cm2.on(
    'peer-have',
    (namespace, { coreDiscoveryId, peerId, start, bitfield }) => {
      let havesByNamespace = havesByPeer.get(peerId)
      if (!havesByNamespace) {
        havesByNamespace = new Map()
        havesByPeer.set(peerId, havesByNamespace)
      }
      let havesByCore = havesByNamespace.get(namespace)
      if (!havesByCore) {
        havesByCore = new Map()
        havesByNamespace.set(namespace, havesByCore)
      }
      let remoteBitfield = havesByCore.get(coreDiscoveryId)
      if (!remoteBitfield) {
        remoteBitfield = new RemoteBitfield()
        havesByCore.set(coreDiscoveryId, remoteBitfield)
      }
      remoteBitfield.insert(start, bitfield)
    }
  )

  const cm1Core = cm1.getWriterCore('data').core
  await cm1Core.ready()
  const batchSize = 4096
  // Create 4 million entries in hypercore - will be at least two have bitfields
  for (let i = 0; i < 2 ** 22; i += batchSize) {
    const data = Array(batchSize)
      .fill(null)
      .map(() => 'block')
    await cm1Core.append(data)
  }

  await cm1Core.clear(500, 30000)
  await cm1Core.clear(700000, 800000)

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  cm1[kCoreManagerReplicate](n1)
  cm2[kCoreManagerReplicate](n2)

  // Need to wait for now, since no event for when a remote bitfield is updated
  await new Promise((res) => setTimeout(res, 200))

  const peerId = n1.publicKey.toString('hex')
  const havesByNamespace = havesByPeer.get(peerId)
  const havesByCore = havesByNamespace.get('data')
  t.ok(havesByCore)
  const bitfield = havesByCore.get(cm1Core.discoveryKey.toString('hex'))
  t.ok(bitfield)

  t.ok(
    bitfieldEquals(bitfield, cm1Core.core.bitfield, cm1Core.length),
    'remote bitfield is same as source bitfield'
  )

  n1.destroy()
  n2.destroy()
  await Promise.all([once(n1, 'close'), once(n2, 'close')])
})

test('unreplicate', async (t) => {
  const WAIT_TIMEOUT = 200
  const REPLICATION_DELAY = 20
  await t.test('initiator unreplicates, receiver re-replicates', async (st) => {
    const a = await createCore()
    await a.append(['a', 'b'])
    const b = await createCore(a.key)

    const [s1, s2] = replicateCores(a, b, t, { delay: REPLICATION_DELAY })

    const block1 = await b.get(0, { timeout: WAIT_TIMEOUT })
    st.is(block1.toString(), 'a')

    await unreplicate(a, s1.noiseStream.userData)

    await st.exception(
      () => b.get(1, { timeout: WAIT_TIMEOUT }),
      'Throws with timeout error'
    )

    b.replicate(s2)

    const block2 = await b.get(1, { timeout: WAIT_TIMEOUT })
    st.is(block2.toString(), 'b')
  })
  await t.test(
    'initiator unreplicates, initiator re-replicates',
    async (st) => {
      const a = await createCore()
      await a.append(['a', 'b'])
      const b = await createCore(a.key)

      const [s1] = replicateCores(a, b, t, { delay: REPLICATION_DELAY })

      const block1 = await b.get(0, { timeout: WAIT_TIMEOUT })
      st.is(block1.toString(), 'a')

      await unreplicate(a, s1.noiseStream.userData)

      await st.exception(
        () => b.get(1, { timeout: 200 }),
        'Throws with timeout error'
      )

      a.replicate(s1)

      const block2 = await b.get(1, { timeout: WAIT_TIMEOUT })
      st.is(block2.toString(), 'b')
    }
  )
  await t.test('receiver unreplicates, receiver re-replicates', async (st) => {
    const a = await createCore()
    await a.append(['a', 'b'])
    const b = await createCore(a.key)

    const [, s2] = replicateCores(a, b, t, { delay: REPLICATION_DELAY })

    const block1 = await b.get(0, { timeout: WAIT_TIMEOUT })
    st.is(block1.toString(), 'a')

    await unreplicate(b, s2.noiseStream.userData)

    await st.exception(
      () => b.get(1, { timeout: WAIT_TIMEOUT }),
      'Throws with timeout error'
    )

    b.replicate(s2)

    const block2 = await b.get(1, { timeout: WAIT_TIMEOUT })
    st.is(block2.toString(), 'b')
  })
})

const DEBUG = process.env.DEBUG

// Compare two bitfields (instance of core.core.bitfield or peer.remoteBitfield)
// Need to pass len, since bitfields don't know their own length
function bitfieldEquals(actual, expected, len) {
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

/**
 * Count the open file descriptors in a given folder
 *
 * @param {string} dir folder for counting open file descriptors
 * @returns {Promise<number>}
 */
async function countOpenFileDescriptors(dir) {
  return new Promise((res, rej) => {
    exec(`lsof +D '${dir}' | wc -l`, (error, stdout) => {
      if (error) return rej(error)
      res(stdout - 1)
    })
  })
}

function replicateCores(a, b, t, { delay = 0, ...opts } = {}) {
  const s1 = a.replicate(true, { keepAlive: false, ...opts })
  const s2 = b.replicate(false, { keepAlive: false, ...opts })
  s1.on('error', (err) =>
    t.comment(`replication stream error (initiator): ${err}`)
  )
  s2.on('error', (err) =>
    t.comment(`replication stream error (responder): ${err}`)
  )
  s1.pipe(latencyStream(delay)).pipe(s2).pipe(latencyStream(delay)).pipe(s1)
  return [s1, s2]
}

/**
 * Randomly delay stream chunks by up to `delay` milliseconds
 * @param {number} delay
 * @returns
 */
function latencyStream(delay = 0) {
  return new Transform({
    transform(data, callback) {
      setTimeout(callback, Math.random() * delay, null, data)
    },
  })
}

/**
 *
 * @param {Hypercore<'binary', any>} core
 * @param {import('protomux')} protomux
 */
export function unreplicate(core, protomux) {
  const peerToUnreplicate = core.peers.find(
    (peer) => peer.protomux === protomux
  )
  if (!peerToUnreplicate) return
  peerToUnreplicate.channel.close()
  return
}
