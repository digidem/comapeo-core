import test from 'node:test'
import { access, constants } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Protomux from 'protomux'
import FakeTimers from '@sinonjs/fake-timers'
import { createCoreManager, replicate } from './helpers/core-manager.js'
import { randomBytes } from 'crypto'
import Sqlite from 'better-sqlite3'
import { KeyManager } from '@comapeo/crypto'
import {
  CoreManager,
  kCoreManagerReplicate,
} from '../src/core-manager/index.js'
import { unreplicate } from '../src/lib/hypercore-helpers.js'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { temporaryDirectoryTask } from 'tempy'
import { exec } from 'child_process'
import { RandomAccessFilePool } from '../src/core-manager/random-access-file-pool.js'
import RandomAccessFile from 'random-access-file'
import path from 'path'
import { Transform } from 'streamx'
import { waitForCores } from './helpers/core-manager.js'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { coresTable } from '../src/schema/project.js'
import { eq } from 'drizzle-orm'
import { createCore } from './helpers/create-core.js'
/** @import { Namespace } from '../src/types.js' */
/** @import Hypercore from 'hypercore' */

test('project creator auth core has project key', async function (t) {
  const keyManager = new KeyManager(randomBytes(16))
  const { publicKey: projectKey, secretKey: projectSecretKey } =
    keyManager.getHypercoreKeypair('auth', randomBytes(32))

  const cm = createCoreManager(t, {
    keyManager,
    projectKey,
    projectSecretKey,
  })
  const { key: authCoreKey } = cm.getWriterCore('auth')
  assert(authCoreKey.equals(projectKey))
})

test('getCreatorCore()', async (t) => {
  const projectKey = randomBytes(32)
  const cm = createCoreManager(t, { projectKey })
  await cm.creatorCore.ready()
  assert(cm.creatorCore.key.equals(projectKey))
})

test('eagerly updates remote bitfields', async (t) => {
  // Replication progress relies on the peer.remoteBitfield to actually match
  // the bitfield of the peer. By default hypercore only updates the
  // remoteBitfield for the ranges of a hypercore that you try to download. We
  // "hack" hypercore to get the bitfield for the whole core, and this test
  // checks that functionality.

  const projectKey = randomBytes(32)
  const cm1 = createCoreManager(t, { projectKey })
  const cm2 = createCoreManager(t, { projectKey })
  const cm3 = createCoreManager(t, { projectKey })

  const cm1Core = cm1.getWriterCore('auth').core
  await cm1Core.ready()
  await cm1Core.append(['a', 'b', 'c', 'd', 'e'])
  // Hypercore only shares the contiguous length on initial handshake, not the
  // whole bitfield, so we need to test replicating a bitfield with
  // contiguousLength < length
  await cm1Core.clear(2, 3)

  const destroyReplication = (await replicate(cm1, cm2)).destroy

  await waitForCores(cm2, [cm1Core.key])
  const cm2Core = cm2.getCoreByKey(cm1Core.key)
  assert(cm2Core, 'writer core has replicated')

  // Need to wait for now, since no event for when a remote bitfield is updated
  await new Promise((res) => setTimeout(res, 200))

  assert.equal(cm2Core.length, cm1Core.length)

  {
    assert(cm1Core.core)
    // This is testing that the remote bitfield is a duplicate of the bitfield
    // on the core that is being replicated, prior to calling core.download()
    assert(
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
    const { destroy } = await replicate(cm1, cm2)
    // Need to wait for now, since no event for when a remote bitfield is updated
    await new Promise((res) => setTimeout(res, 200))
    assert(cm2Core.core)
    assert(
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
    assert(cm3Core)
    assert.deepEqual(cm3Core.length, cm1Core.length)

    assert(
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

    assert.deepEqual(cm3Core.length, cm1Core.length)
    assert(
      bitfieldEquals(
        cm3Core.peers[0].remoteBitfield,
        cm2Core.core.bitfield,
        cm2Core.length
      ),
      'remote bitfield updated via indirect replication'
    )
  }
})

test('cores added to a replication stream at different times still replicate', async (t) => {
  // Mapeo adds cores to a peer's replication stream long after the peer has
  // opened channels for them. This is not explicitly tested in Hypercore.

  // A broken late attach hangs rather than failing
  await t.test(
    'core attached inside the discovery-key handler',
    { timeout: 10_000 },
    async (t) => {
      const { a, b, muxA, muxB } = await setupLateReplication(t)
      const bByDiscoveryKey = new Map(
        b.map((core) => [core.discoveryKey?.toString('hex'), core])
      )
      // Like PeerSyncController#handleDiscoveryKey for a known, enabled core
      muxB.pair({ protocol: 'hypercore/alpha' }, async (discoveryKey) => {
        bByDiscoveryKey.get(discoveryKey.toString('hex'))?.replicate(muxB)
      })
      for (const core of a) core.replicate(muxA)

      await assertLateReplication(a, b)
    }
  )

  await t.test(
    'remote open rejected, core attached later',
    { timeout: 10_000 },
    async (t) => {
      const { a, b, muxA, muxB } = await setupLateReplication(t)
      const discoveryKeysSeen = waitForDiscoveryKeys(muxB, a.length)
      for (const core of a) core.replicate(muxA)
      // Protomux rejects the remote open once the pair handler resolves, so B's
      // later open relies on A's discovery-key pairing staying registered.
      await discoveryKeysSeen
      await new Promise(setImmediate)
      for (const core of b) core.replicate(muxB)

      await assertLateReplication(a, b)
    }
  )

  await t.test(
    'core attached after a long idle gap',
    { timeout: 10_000 },
    async (t) => {
      /** @type {FakeTimers.InstalledClock | undefined} */
      let clock
      t.after(() => clock?.uninstall())
      const { a, b, muxA, muxB } = await setupLateReplication(t, {
        keepAlive: 5000,
        // Installed before the streams exist, so their keep-alive timers are fake
        // and the idle gap below exercises them
        beforeStreams: () => {
          clock = FakeTimers.install({
            toFake: [
              'setTimeout',
              'clearTimeout',
              'setInterval',
              'clearInterval',
            ],
          })
        },
      })
      const discoveryKeysSeen = waitForDiscoveryKeys(muxB, a.length)
      for (const core of a) core.replicate(muxA)
      await discoveryKeysSeen
      await new Promise(setImmediate)

      // Catches any timer-based expiry of the rejected or idle channels
      assert(clock)
      assert(clock.countTimers() > 0, 'keep-alive timers are on the fake clock')
      await clock.tickAsync(10 * 60_000)
      clock.uninstall()
      clock = undefined
      for (const core of b) core.replicate(muxB)

      await assertLateReplication(a, b)
    }
  )
})

/**
 * Two writer cores on peer A and their readers on peer B, connected the way
 * LocalPeers connects peers: one shared Protomux per noise stream.
 *
 * @param {import('node:test').TestContext} t
 * @param {{ keepAlive?: number, beforeStreams?: () => void }} [opts] keepAlive: interval, as on internet connections
 */
async function setupLateReplication(
  t,
  { keepAlive = 0, beforeStreams = () => {} } = {}
) {
  const a = [await createCore(t), await createCore(t)]
  const b = [await createCore(t, a[0].key), await createCore(t, a[1].key)]
  await a[0].append('hi')
  await a[1].append('ho')
  beforeStreams()

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)
  if (keepAlive) {
    n1.setKeepAlive(keepAlive)
    n2.setKeepAlive(keepAlive)
  }
  t.after(() => {
    n1.destroy()
    n2.destroy()
  })
  return { a, b, muxA: Protomux.from(n1), muxB: Protomux.from(n2) }
}

/**
 * @param {Protomux} mux
 * @param {number} count
 */
function waitForDiscoveryKeys(mux, count) {
  const seen = new Set()
  return new Promise((resolve) => {
    mux.pair({ protocol: 'hypercore/alpha' }, async (discoveryKey) => {
      seen.add(discoveryKey.toString('hex'))
      if (seen.size === count) resolve(undefined)
    })
  })
}

/**
 * @param {Hypercore[]} a
 * @param {Hypercore[]} b
 */
async function assertLateReplication(a, b) {
  for (const [i, core] of b.entries()) {
    assert.deepEqual(await core.get(0), await a[i].get(0))
  }
}

test('close()', async (t) => {
  const cm = createCoreManager(t)
  await cm.ready()
  for (const namespace of CoreManager.namespaces) {
    cm.addCore(randomBytes(32), namespace)
  }
  await cm.close()
  for (const namespace of CoreManager.namespaces) {
    for (const { core } of cm.getCores(namespace)) {
      assert(core.closed, 'core is closed')
      assert.equal(core.sessions.length, 0, 'no open sessions')
    }
  }
})

test('Added cores are persisted', async (t) => {
  const keyManager = new KeyManager(randomBytes(16))
  const projectKey = randomBytes(32)

  const db = drizzle(new Sqlite(':memory:'))

  const cm1 = createCoreManager(t, {
    db,
    keyManager,
    projectKey,
  })
  const key = randomBytes(32)
  cm1.addCore(key, 'auth')

  await cm1.close()

  const cm2 = createCoreManager(t, {
    db,
    keyManager,
    projectKey,
  })

  assert(cm2.getCoreByKey(key), 'Added core is persisted')
})

test('encryption', async (t) => {
  /** @type {Partial<Record<Namespace, Buffer>>} */
  const encryptionKeys = {}
  for (const ns of CoreManager.namespaces) {
    encryptionKeys[ns] = randomBytes(32)
  }
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager(t, { projectKey, encryptionKeys })
  const cm2 = createCoreManager(t, { projectKey })
  const cm3 = createCoreManager(t, { projectKey, encryptionKeys })

  replicate(cm1, cm2)
  replicate(cm1, cm3)

  for (const ns of CoreManager.namespaces) {
    const { core, key } = cm1.getWriterCore(ns)
    const { core: coreReplica2 } = cm2.addCore(key, ns)
    const { core: coreReplica3 } = cm3.addCore(key, ns)
    const value = Buffer.from(ns)
    await core.append(value)
    assert.notDeepEqual(await coreReplica2.get(0), value)
    assert.deepEqual(await coreReplica3.get(0), value)
  }
})

test(
  'poolSize limits number of open file descriptors',
  {
    skip: process.platform === 'win32' && 'needs lsof',
  },
  async (t) => {
    const keyManager = new KeyManager(randomBytes(16))
    const { publicKey: projectKey, secretKey: projectSecretKey } =
      keyManager.getHypercoreKeypair('auth', randomBytes(32))

    const CORE_COUNT = 500
    await temporaryDirectoryTask(async (tempPath) => {
      /** @param {string} name */
      const storage = (name) => new RandomAccessFile(path.join(tempPath, name))
      const cm = createCoreManager(t, {
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
      assert.equal(readyPromises.length, CORE_COUNT)
      await Promise.all(readyPromises)
      const fdCount = await countOpenFileDescriptors(tempPath)
      assert(fdCount > CORE_COUNT, 'without pool, at least one fd per core')
    })

    await temporaryDirectoryTask(async (tempPath) => {
      const POOL_SIZE = 100
      const pool = new RandomAccessFilePool(POOL_SIZE)
      /** @param {string} name */
      const storage = (name) =>
        new RandomAccessFile(path.join(tempPath, name), { pool })
      const cm = createCoreManager(t, {
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
      assert.equal(
        fdCount,
        POOL_SIZE,
        'with pool, no more file descriptors than pool size'
      )
    })
  }
)

test('sends "haves" bitfields over project creator core replication stream', async (t) => {
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager(t, { projectKey })
  const cm2 = createCoreManager(t, { projectKey })
  /**
   * For each peer, indexed by peerId, a map of hypercore bitfields, indexed by discoveryId
   * @type {Map<string, Map<Namespace, Map<string, RemoteBitfield>>>}
   */
  const havesByPeer = new Map()
  /** @type {Map<string, Set<number>>} */
  const dataHaveStartsByCore = new Map()

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
      if (namespace === 'data') {
        const starts = dataHaveStartsByCore.get(coreDiscoveryId) || new Set()
        starts.add(start)
        dataHaveStartsByCore.set(coreDiscoveryId, starts)
      }
      remoteBitfield.insert(start, bitfield)
    }
  )

  const cm1Core = cm1.getWriterCore('data').core
  await cm1Core.ready()
  // Past one 2^21-bit bitfield segment and into a second 2^15-bit page, so the
  // haves span two messages
  const batchSize = 4096
  const block = new Uint8Array([99])
  const data = Array(batchSize).fill(block)
  for (let i = 0; i < 2 ** 21 + 2 ** 15 + batchSize; i += batchSize) {
    await cm1Core.append(data)
  }

  await cm1Core.clear(500, 30000)
  await cm1Core.clear(700000, 800000)
  await cm1Core.clear(2 ** 21 - 1000, 2 ** 21 + 1000)
  await cm1Core.clear(2 ** 21 + 2 ** 15 - 10, 2 ** 21 + 2 ** 15 + 10)

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  cm1[kCoreManagerReplicate](n1)
  cm2[kCoreManagerReplicate](n2)

  // Need to wait for now, since no event for when a remote bitfield is updated
  await new Promise((res) => setTimeout(res, 200))

  const peerId = n1.publicKey?.toString('hex') || ''
  const havesByNamespace = havesByPeer.get(peerId)
  const havesByCore = havesByNamespace?.get('data')
  const bitfield = havesByCore?.get(cm1Core.discoveryKey?.toString('hex') || '')
  assert(bitfield)
  assert(cm1Core.core)
  const discoveryId = cm1Core.discoveryKey?.toString('hex') || ''
  assert.deepEqual(
    [...(dataHaveStartsByCore.get(discoveryId) || [])].sort((x, y) => x - y),
    [0, 2 ** 21],
    'haves sent for both bitfield segments'
  )
  /** @type {Array<[number, boolean]>} */
  const expectedBlocks = [
    [499, true],
    [600, false],
    [2 ** 21 - 1, false],
    [2 ** 21 + 999, false],
    [2 ** 21 + 5000, true],
    [2 ** 21 + 2 ** 15, false],
    [2 ** 21 + 2 ** 15 + 100, true],
  ]
  for (const [index, expected] of expectedBlocks) {
    assert.equal(bitfield.get(index), expected, `remote has block ${index}`)
  }

  assert(
    bitfieldEquals(bitfield, cm1Core.core.bitfield, cm1Core.length),
    'remote bitfield is same as source bitfield'
  )

  n1.destroy()
  n2.destroy()
  await Promise.all([once(n1, 'close'), once(n2, 'close')])
})

test('unreplicate', async (t) => {
  const WAIT_TIMEOUT = 200
  // Reads that should succeed get longer: replication can take over 200ms to start on Windows
  const READ_TIMEOUT = 5000
  const REPLICATION_DELAY = 20
  const scenarios = [
    {
      unreplicate: ['initiator', 'receiver'],
      rereplicate: ['initiator', 'receiver'],
      expectedReadAfterReplicate: true,
    },
    {
      unreplicate: ['initiator'],
      rereplicate: ['initiator'],
      expectedReadAfterReplicate: true,
    },
    {
      unreplicate: ['receiver'],
      rereplicate: ['receiver'],
      expectedReadAfterReplicate: true,
    },
    {
      unreplicate: ['initiator', 'receiver'],
      rereplicate: ['initiator'],
      expectedReadAfterReplicate: false,
    },
    {
      unreplicate: ['initiator', 'receiver'],
      rereplicate: ['receiver'],
      expectedReadAfterReplicate: false,
    },
  ]
  // Add order permutations to scenarios
  for (const scenario of [...scenarios]) {
    if (scenario.unreplicate.length !== 2) continue
    scenarios.push({
      ...scenario,
      unreplicate: [scenario.unreplicate[1], scenario.unreplicate[0]],
    })
  }
  for (const scenario of [...scenarios]) {
    if (scenario.rereplicate.length !== 2) continue
    scenarios.push({
      ...scenario,
      rereplicate: [scenario.rereplicate[1], scenario.rereplicate[0]],
    })
  }

  for (const unreplicateWait of [0, 100]) {
    for (const scenario of scenarios) {
      await t.test(
        `unreplicate: ${scenario.unreplicate.join(
          ', '
        )}; rereplicate: ${scenario.rereplicate.join(
          ', '
        )}; delay: ${unreplicateWait}; expectedReadAfterReplicate: ${
          scenario.expectedReadAfterReplicate
        }`,
        async () => {
          const a = await createCore(t)
          await a.append(['a', 'b'])
          const b = await createCore(t, a.key)
          const c = await createCore(t, a.key)

          const [s1, s2] = await replicateCores(a, b, {
            delay: REPLICATION_DELAY,
          })
          replicateCores(a, c, { delay: REPLICATION_DELAY })

          // Check replication is actually working
          {
            const block1 = await b.get(0, { timeout: READ_TIMEOUT })
            assert.equal(block1?.toString(), 'a')
          }
          {
            const block1 = await c.get(0, { timeout: READ_TIMEOUT })
            assert.equal(block1?.toString(), 'a')
          }

          // Unreplicate in order with delay
          for (const toUnreplicate of scenario.unreplicate) {
            const coreToUnreplicate = toUnreplicate === 'initiator' ? a : b
            const protomuxToUnreplicate =
              toUnreplicate === 'initiator' ? s1 : s2
            unreplicate(
              coreToUnreplicate,
              protomuxToUnreplicate.noiseStream.userData
            )
            await delay(unreplicateWait)
          }

          // Check that we can't read the next block
          await assert.rejects(
            () => b.get(1, { timeout: WAIT_TIMEOUT }),
            'Throws with timeout error'
          )

          // Re-replicate in order with delay
          for (const toRereplicate of scenario.rereplicate) {
            const coreToRereplicate = toRereplicate === 'initiator' ? a : b
            const protomuxToRereplicate =
              toRereplicate === 'initiator' ? s1 : s2
            coreToRereplicate.replicate(protomuxToRereplicate)
            await delay(unreplicateWait)
          }

          // Check that we can read or not read the next block as expected
          if (scenario.expectedReadAfterReplicate) {
            const block2 = await b.get(1, { timeout: READ_TIMEOUT })
            assert.equal(block2?.toString(), 'b')
          } else {
            await assert.rejects(
              () => b.get(1, { timeout: WAIT_TIMEOUT }),
              'Throws with timeout error'
            )
          }

          // Replication with code 'c' should still work
          {
            const block2 = await c.get(1, { timeout: READ_TIMEOUT })
            assert.equal(block2?.toString(), 'b')
          }
        }
      )
    }
  }
})

test('deleteOthersData()', async (t) => {
  await temporaryDirectoryTask(async (tempPath) => {
    const projectKey = randomBytes(32)

    /** @type {Array<string>} */
    const storageNames = []

    const peer1TempPath = path.join(tempPath, 'peer1')

    /// Set up core managers
    const db1 = drizzle(new Sqlite(':memory:'))
    const cm1 = createCoreManager(t, {
      db: db1,
      projectKey,
      storage: (name) => {
        storageNames.push(name)
        return new RandomAccessFile(path.join(peer1TempPath, name))
      },
      autoDownload: true,
    })

    const db2 = drizzle(new Sqlite(':memory:'))
    const cm2 = createCoreManager(t, {
      db: db2,
      projectKey,
      storage: (name) => {
        return new RandomAccessFile(path.join(tempPath, 'peer2', name))
      },
      // We're only checking the filesystem for peer 1 so can avoid downloading for peer 2
      autoDownload: false,
    })

    /// Write data
    const dataWriter1 = cm1.getWriterCore('data')
    const dataWriter2 = cm2.getWriterCore('data')

    await dataWriter1.core.ready()
    await dataWriter2.core.ready()

    await dataWriter1.core.append(
      Array(100)
        .fill(null)
        .map((_, i) => 'block' + i)
    )

    await dataWriter2.core.append(
      Array(50)
        .fill(null)
        .map((_, i) => 'block' + i)
    )

    const { destroy } = await replicate(cm1, cm2)
    t.after(destroy)

    // This delay is needed in order for replication to finish properly
    await new Promise((res) => setTimeout(res, 200))

    /// Confirmation to ensure that replication worked
    assert.equal(
      cm1.getCores('data').length,
      2,
      'peer 1 has expected number of data cores after replication'
    )

    const peer1DataCoreStoragePath = getCoreStoragePath(
      // @ts-expect-error
      dataWriter1.core.discoveryKey.toString('hex')
    )

    const peer2DataCoreStoragePath = getCoreStoragePath(
      // @ts-expect-error
      dataWriter2.core.discoveryKey.toString('hex')
    )

    const dataCoreStorageNames = storageNames.filter(
      (name) =>
        name.startsWith(peer1DataCoreStoragePath) ||
        name.startsWith(peer2DataCoreStoragePath)
    )

    // Hypercore uses 4 files per core (oplog, tree, bitfield, data)
    assert.equal(
      dataCoreStorageNames.length,
      8,
      'peer 1 has expected number of data core storage files after replication'
    )

    assert.equal(
      db1
        .select()
        .from(coresTable)
        .where(eq(coresTable.namespace, 'data'))
        .all().length,
      1,
      'peer 1 `cores` table has info about `data` core from peer 2'
    )

    assert.equal(
      db2
        .select()
        .from(coresTable)
        .where(eq(coresTable.namespace, 'data'))
        .all().length,
      1,
      'peer 2 `cores` table has info about `data` core from peer 1'
    )

    /// Delete data (not their own)
    await cm1.deleteOthersData('data')

    const peer1DataStoragePreservedForPeer1 = (
      await checkExistenceForFiles(
        dataCoreStorageNames
          .filter((storageName) =>
            storageName.startsWith(peer1DataCoreStoragePath)
          )
          .map((storageName) => path.join(peer1TempPath, storageName))
      )
    ).every((exists) => exists === true)

    const peer2DataStorageDeletedForPeer1 = (
      await checkExistenceForFiles(
        dataCoreStorageNames
          .filter((storageName) =>
            storageName.startsWith(peer2DataCoreStoragePath)
          )
          .map((storageName) => path.join(peer1TempPath, storageName))
      )
    ).every((exists) => exists === false)

    assert(
      peer1DataStoragePreservedForPeer1,
      'peer 1 still has `data` storage for itself'
    )

    assert(
      peer2DataStorageDeletedForPeer1,
      'peer 1 no longer has `data` storage for peer 2'
    )

    assert.equal(
      db1
        .select()
        .from(coresTable)
        .where(eq(coresTable.namespace, 'data'))
        .all().length,
      0,
      'peer 1 `cores` table has no info about `data` core from peer 2'
    )
  })
})

const DEBUG = process.env.DEBUG

/**
 * Compare two bitfields (instance of core.core.bitfield or peer.remoteBitfield)
 * Need to pass len, since bitfields don't know their own length
 *
 * @param {{ get(index: number): unknown }} actual
 * @param {{ get(index: number): unknown }} expected
 * @param {number} len
 * @returns {boolean}
 */
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
      res(Number(stdout) - 1)
    })
  })
}

/**
 * @param {Hypercore} a
 * @param {Hypercore} b
 * @param {Parameters<typeof Hypercore.prototype.replicate>[1] & { delay?: number }} [opts]
 */
function replicateCores(a, b, { delay = 0, ...opts } = {}) {
  const s1 = a.replicate(true, { keepAlive: false, ...opts })
  const s2 = b.replicate(false, { keepAlive: false, ...opts })
  s1.pipe(latencyStream(delay)).pipe(s2).pipe(latencyStream(delay)).pipe(s1)
  return [s1, s2]
}

/**
 * Randomly delay stream chunks by up to `delay` milliseconds
 * @param {number} delay
 */
function latencyStream(delay = 0) {
  return new Transform({
    transform(data, callback) {
      setTimeout(callback, Math.random() * delay, null, data)
    },
  })
}

/**
 * From https://github.com/holepunchto/corestore/blob/v6.8.4/index.js#L240
 *
 * @param {string} id Core discovery key as hex string
 */
function getCoreStoragePath(id) {
  return ['cores', id.slice(0, 2), id.slice(2, 4), id].join('/')
}

/**
 * @param {Array<string>} files
 * @returns {Promise<Array<boolean>>} Promise that resolves with array of results, where `true` means the file exists and `false` means it does not exist
 */
async function checkExistenceForFiles(files) {
  return Promise.all(
    files.map((filePath) =>
      access(filePath, constants.F_OK)
        .then(() => true)
        .catch(() => false)
    )
  )
}
