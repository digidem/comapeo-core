// @ts-check

import test from 'brittle'
import Hypercore from 'hypercore'
import { PeerSyncController } from '../../src/sync/peer-sync-controller.js'
import { createCoreManager } from '../helpers/core-manager.js'
import { KeyManager } from '@mapeo/crypto'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import { NAMESPACES } from '../../src/core-manager/index.js'

test('creator core is always replicated', async (t) => {
  const {
    coreManagers: [cm1, cm2],
  } = await testenv()

  await Promise.all([
    once(cm1.creatorCore, 'peer-add'),
    once(cm2.creatorCore, 'peer-add'),
  ])

  // Wait to give cores a chance to connect
  await setTimeout(200)

  for (const namespace of NAMESPACES) {
    const cm1NamespaceCores = cm1.getCores(namespace)
    t.is(cm1NamespaceCores.length, 1, 'each namespace has one core')
    const cm2NamespaceCores = cm2.getCores(namespace)
    t.is(
      cm2NamespaceCores.length,
      namespace === 'auth' ? 2 : 1,
      'each namespace apart from auth has one core'
    )
    for (const { core, key } of [...cm1NamespaceCores, ...cm2NamespaceCores]) {
      if (key.equals(cm1.creatorCore.key)) {
        t.is(core.peers.length, 1, 'Creator cores has one peer')
      } else {
        t.is(core.peers.length, 0, 'non-creator cores have no peers')
      }
    }
  }
})

test('enabling namespace replicates cores', async (t) => {
  const {
    coreManagers: [cm1, cm2],
    peerSyncControllers: [psc1, psc2],
  } = await testenv()

  const ACTIVE_NAMESPACES = /** @type {const} */ (['auth', 'config'])

  for (const namespace of ACTIVE_NAMESPACES) {
    psc1.enableNamespace(namespace)
    psc2.enableNamespace(namespace)
  }

  // Wait to give cores a chance to connect
  await setTimeout(200)

  for (const namespace of NAMESPACES) {
    const cm1NamespaceCores = cm1.getCores(namespace)
    t.is(
      cm1NamespaceCores.length,
      ACTIVE_NAMESPACES.includes(namespace) ? 2 : 1,
      'each namespace has one core'
    )
    const cm2NamespaceCores = cm2.getCores(namespace)
    t.is(
      cm2NamespaceCores.length,
      ACTIVE_NAMESPACES.includes(namespace) ? 2 : 1,
      'each namespace apart from auth has one core'
    )
    for (const { core } of [...cm1NamespaceCores, ...cm2NamespaceCores]) {
      if (ACTIVE_NAMESPACES.includes(namespace)) {
        t.is(core.peers.length, 1, 'enabled cores have one peer')
      } else {
        t.is(core.peers.length, 0, 'non-enabled cores have no peers')
      }
    }
  }
})

test('disabling namespace unreplicates cores', async (t) => {
  const {
    coreManagers: [cm1, cm2],
    peerSyncControllers: [psc1, psc2],
  } = await testenv()

  const ACTIVE_NAMESPACES = /** @type {const} */ (['auth', 'config'])

  // enable all namespaces to start
  for (const namespace of NAMESPACES) {
    psc1.enableNamespace(namespace)
    psc2.enableNamespace(namespace)
  }

  // Wait to give cores a chance to connect
  await setTimeout(200)

  for (const namespace of NAMESPACES) {
    const cm1NamespaceCores = cm1.getCores(namespace)
    t.is(cm1NamespaceCores.length, 2, 'each namespace has two cores')
    const cm2NamespaceCores = cm2.getCores(namespace)
    t.is(cm2NamespaceCores.length, 2, 'each namespace has two cores')
    for (const { core } of [...cm1NamespaceCores, ...cm2NamespaceCores]) {
      t.is(core.peers.length, 1, 'all cores have two peers')
    }
  }

  for (const namespace of NAMESPACES) {
    if (ACTIVE_NAMESPACES.includes(namespace)) continue
    psc1.disableNamespace(namespace)
    psc2.disableNamespace(namespace)
  }

  await setTimeout(200)

  for (const namespace of NAMESPACES) {
    const cm1NamespaceCores = cm1.getCores(namespace)
    const cm2NamespaceCores = cm2.getCores(namespace)
    for (const { core } of [...cm1NamespaceCores, ...cm2NamespaceCores]) {
      if (ACTIVE_NAMESPACES.includes(namespace)) {
        t.is(core.peers.length, 1, 'enabled cores have one peer')
      } else {
        t.is(core.peers.length, 0, 'non-enabled cores have no peers')
      }
    }
  }
})

async function testenv() {
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

  const psc1 = new PeerSyncController({
    protomux: stream1.noiseStream.userData,
    coreManager: cm1,
  })
  const psc2 = new PeerSyncController({
    protomux: stream2.noiseStream.userData,
    coreManager: cm2,
  })

  return {
    peerSyncControllers: [psc1, psc2],
    coreManagers: [cm1, cm2],
  }
}
