// @ts-check

import test from 'brittle'
import Hypercore from 'hypercore'
import { PeerSyncController } from '../../src/sync/peer-sync-controller.js'
import { createCoreManager } from '../helpers/core-manager.js'
import { KeyManager } from '@mapeo/crypto'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { NAMESPACES } from '../../src/core-manager/index.js'
import { SyncState } from '../../src/sync/sync-state.js'
import {
  BLOCKED_ROLE_ID,
  CREATOR_CAPABILITIES,
  DEFAULT_CAPABILITIES,
} from '../../src/capabilities.js'

test('auth, config and blobIndex enabled by default', async (t) => {
  const {
    coreManagers: [cm1, cm2],
  } = await testenv(CREATOR_CAPABILITIES)

  const preSyncNamespaces = /** @type {const} */ ([
    'auth',
    'config',
    'blobIndex',
  ])

  const peerAddPromises = []
  for (const ns of preSyncNamespaces) {
    peerAddPromises.push(
      once(cm1.getWriterCore(ns).core, 'peer-add'),
      once(cm1.getWriterCore(ns).core, 'peer-add')
    )
  }
  await Promise.all(peerAddPromises)
  t.pass('pre-sync cores connected')

  // Wait to give other namespaces a chance to connect (they shouldn't)
  await setTimeout(500)

  for (const ns of NAMESPACES) {
    for (const cm of [cm1, cm2]) {
      const nsCores = cm.getCores(ns)
      t.is(
        nsCores.length,
        includes(preSyncNamespaces, ns) ? 2 : 1,
        'preSync namespaces have 2 cores, others have 1'
      )
      for (const { core } of nsCores) {
        if (includes(preSyncNamespaces, ns)) {
          t.is(core.peers.length, 1, 'pre-sync namespace cores have one peer')
        } else {
          t.is(core.peers.length, 0, 'non-pre-sync cores have no peers')
        }
      }
    }
  }
})

test('enabling data sync replicates all cores', async (t) => {
  const {
    coreManagers: [cm1, cm2],
    peerSyncControllers: [psc1, psc2],
  } = await testenv(CREATOR_CAPABILITIES)

  psc1.enableDataSync()
  psc2.enableDataSync()

  const peerAddPromises = []
  for (const ns of NAMESPACES) {
    peerAddPromises.push(
      once(cm1.getWriterCore(ns).core, 'peer-add'),
      once(cm1.getWriterCore(ns).core, 'peer-add')
    )
  }
  await Promise.all(peerAddPromises)

  for (const ns of NAMESPACES) {
    for (const [i, cm] of [cm1, cm2].entries()) {
      const nsCores = cm.getCores(ns)
      t.is(nsCores.length, 2, `cm${i + 1}: namespace ${ns} has 2 cores now`)
      for (const { core } of nsCores) {
        t.is(
          core.peers.length,
          1,
          `cm${i + 1}: ${ns} ${
            core === cm.getWriterCore(ns).core ? 'own' : 'synced'
          } core is connected`
        )
      }
    }
  }
})

test('no sync capabilities === no namespaces sync apart from auth', async (t) => {
  const {
    coreManagers: [cm1, cm2],
    peerSyncControllers: [psc1, psc2],
  } = await testenv(DEFAULT_CAPABILITIES[BLOCKED_ROLE_ID])

  psc1.enableDataSync()
  psc2.enableDataSync()

  // Wait to give cores a chance to connect
  await setTimeout(500)

  for (const ns of NAMESPACES) {
    for (const cm of [cm1, cm2]) {
      const nsCores = cm.getCores(ns)
      if (ns === 'auth') {
        t.is(nsCores.length, 2, `all auth cores have been shared`)
        // no guarantees about sharing of other cores yet
      }
      for (const { core } of nsCores) {
        const isCreatorCore = core === cm.creatorCore
        if (isCreatorCore) {
          t.is(core.peers.length, 1, 'creator core remains connected')
        } else {
          t.is(core.peers.length, 0, 'core is disconnected')
        }
      }
    }
  }
})

/**
 *
 * @param {import('../../src/capabilities.js').Capability} cap
 * @returns
 */
async function testenv(cap) {
  const { publicKey: projectKey, secretKey: projectSecretKey } =
    KeyManager.generateProjectKeypair()
  const cm1 = await createCoreManager({ projectKey, projectSecretKey })
  const cm2 = await createCoreManager({ projectKey })

  const stream1 = Hypercore.createProtocolStream(true, {
    ondiscoverykey: (discoveryKey) =>
      cm1.handleDiscoveryKey(discoveryKey, stream1),
  })
  const stream2 = Hypercore.createProtocolStream(false, {
    ondiscoverykey: (discoveryKey) =>
      cm2.handleDiscoveryKey(discoveryKey, stream2),
  })
  stream1.pipe(stream2).pipe(stream1)

  await Promise.all([
    once(stream1.noiseStream, 'connect'),
    once(stream2.noiseStream, 'connect'),
  ])

  const psc1 = new PeerSyncController({
    protomux: stream1.noiseStream.userData,
    coreManager: cm1,
    syncState: new SyncState({ coreManager: cm1 }),
    // @ts-expect-error
    capabilities: {
      async getCapabilities() {
        return cap
      },
    },
    peerId: stream1.noiseStream.remotePublicKey.toString('hex'),
  })
  const psc2 = new PeerSyncController({
    protomux: stream2.noiseStream.userData,
    coreManager: cm2,
    syncState: new SyncState({ coreManager: cm2 }),
    // @ts-expect-error
    capabilities: {
      async getCapabilities() {
        return cap
      },
    },
    peerId: stream2.noiseStream.remotePublicKey.toString('hex'),
  })

  return {
    peerSyncControllers: [psc1, psc2],
    coreManagers: [cm1, cm2],
  }
}

/**
 * Helper for Typescript array.prototype.includes
 *
 * @template {U} T
 * @template U
 * @param {ReadonlyArray<T>} coll
 * @param {U} el
 * @returns {el is T}
 */
function includes(coll, el) {
  return coll.includes(/** @type {T} */ (el))
}
