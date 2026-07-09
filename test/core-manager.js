import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hypercore from 'hypercore'
import { createCoreManager, replicate } from './helpers/core-manager.js'
import { randomBytes } from 'crypto'
import Sqlite from 'better-sqlite3'
import { KeyManager } from '@mapeo/crypto'
import {
  CoreManager,
  kCoreManagerReplicate,
} from '../src/core-manager/index.js'
import { unreplicate } from '../src/lib/hypercore-helpers.js'
import RemoteBitfield from '../src/core-manager/remote-bitfield.js'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { Transform } from 'streamx'
import { waitForCores } from './helpers/core-manager.js'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { createCore } from './helpers/create-core.js'
/** @import { Namespace } from '../src/types.js' */

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

test('multiplexing waits for cores to be added', async (t) => {
  // Mapeo code expects replication to work when cores are not added to the
  // replication stream at the same time. This is not explicitly tested in
  // Hypercore so we check here that this behaviour works.
  const a1 = await createCore(t)
  const a2 = await createCore(t)

  const b1 = await createCore(t, a1.key)
  const b2 = await createCore(t, a2.key)

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

  assert.deepEqual(await b1.get(0), Buffer.from('hi'))
  assert.deepEqual(await b2.get(0), Buffer.from('ho'))
})

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

test('sends "haves" bitfields over project creator core replication stream', async (t) => {
  const projectKey = randomBytes(32)
  const cm1 = createCoreManager(t, { projectKey })
  const cm2 = createCoreManager(t, { projectKey })
  /**
   * For each peer, indexed by peerId, a map of hypercore bitfields, indexed by discoveryId
   * @type {Map<string, Map<Namespace, Map<string, RemoteBitfield>>>}
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
  // Create 4 million entries in hypercore - will be at least two have bitfields
  const batchSize = 4096
  const block = new Uint8Array([99])
  const data = Array(batchSize).fill(block)
  for (let i = 0; i < 2 ** 22; i += batchSize) {
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

  const peerId = n1.publicKey?.toString('hex') || ''
  const havesByNamespace = havesByPeer.get(peerId)
  const havesByCore = havesByNamespace?.get('data')
  const bitfield = havesByCore?.get(cm1Core.discoveryKey?.toString('hex') || '')
  assert(bitfield)
  assert(cm1Core.core)

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
            const block1 = await b.get(0, { timeout: WAIT_TIMEOUT })
            assert.equal(block1?.toString(), 'a')
          }
          {
            const block1 = await c.get(0, { timeout: WAIT_TIMEOUT })
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
            const block2 = await b.get(1, { timeout: WAIT_TIMEOUT })
            assert.equal(block2?.toString(), 'b')
          } else {
            await assert.rejects(
              () => b.get(1, { timeout: WAIT_TIMEOUT }),
              'Throws with timeout error'
            )
          }

          // Replication with code 'c' should still work
          {
            const block2 = await c.get(1, { timeout: WAIT_TIMEOUT })
            assert.equal(block2?.toString(), 'b')
          }
        }
      )
    }
  }
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
