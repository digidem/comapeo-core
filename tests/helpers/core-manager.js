// @ts-nocheck
import {
  CoreManager,
  kCoreManagerReplicate,
} from '../../src/core-manager/index.js'
import Sqlite from 'better-sqlite3'
import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import NoiseSecretStream from '@hyperswarm/secret-stream'
/**
 *
 * @param {Partial<ConstructorParameters<typeof CoreManager>[0]> & { rootKey?: Buffer }} param0
 * @returns
 */
export function createCoreManager({
  rootKey = randomBytes(16),
  projectKey = randomBytes(32),
  ...opts
} = {}) {
  const sqlite = new Sqlite(':memory:')
  const keyManager = new KeyManager(rootKey)
  return new CoreManager({
    sqlite,
    keyManager,
    storage: RAM,
    projectKey,
    autoDownload: false,
    ...opts,
  })
}

/**
 *
 * @param {CoreManager} cm1
 * @param {CoreManager} cm2
 * @param {{ kp1: import('../../src/types.js').KeyPair, kp2: import('../../src/types.js').KeyPair }} [opts]
 * @returns
 */
export function replicate(
  cm1,
  cm2,
  { kp1 = NoiseSecretStream.keyPair(), kp2 = NoiseSecretStream.keyPair() } = {}
) {
  const n1 = new NoiseSecretStream(true, undefined, { keyPair: kp1 })
  const n2 = new NoiseSecretStream(false, undefined, { keyPair: kp2 })
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  cm1[kCoreManagerReplicate](n1)
  cm2[kCoreManagerReplicate](n2)

  async function destroy() {
    await Promise.all([
      new Promise((res) => {
        n1.on('close', res)
        n1.destroy()
      }),
      new Promise((res) => {
        n2.on('close', res)
        n2.destroy()
      }),
    ])
  }

  return {
    destroy,
  }
}

export async function waitForCores(coreManager, keys) {
  const allKeys = getAllKeys(coreManager)
  if (hasKeys(keys, allKeys)) return
  return new Promise((res) => {
    coreManager.on('add-core', async function onAddCore({ key, core }) {
      await core.ready()
      allKeys.push(key)
      if (hasKeys(keys, allKeys)) {
        coreManager.off('add-core', onAddCore)
        res()
      }
    })
  })
}

export function getAllKeys(coreManager) {
  const keys = []
  for (const namespace of CoreManager.namespaces) {
    keys.push.apply(keys, getKeys(coreManager, namespace))
  }
  return keys
}

export function getKeys(coreManager, namespace) {
  return coreManager.getCores(namespace).map(({ key }) => key)
}

export function hasKeys(someKeys, allKeys) {
  for (const key of someKeys) {
    if (!allKeys.find((k) => k.equals(key))) return false
  }
  return true
}
