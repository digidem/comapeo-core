import NoiseSecretStream from '@hyperswarm/secret-stream'

import { truncateId } from '../../lib/utils.js'
import { getKeys } from './core-manager.js'

export function logState(syncState, name) {
  let message = `${name ? name + ' ' : ''}${syncState.synced ? 'synced' : 'not synced'}\n`

  for (const [coreId, state] of Object.entries(syncState.cores)) {
    message += `${truncateId(coreId)}`
    for (const [peerId, peerState] of Object.entries(state)) {
      message += `\n${truncateId(peerId)} (${peerState.remote ? 'remote' : 'local'}) h: ${peerState.have} w: ${peerState.want} l: ${peerState.length} `
    }
    message += '\n'
  }

  console.log(message)
}

/**
 * 
 * @param {CoreManager} coreManager 
 * @param {import('../../lib/core-manager/core-index.js').Namespace} namespace 
 * @param {Object} [options]
 * @param {number} [options.start=0]
 * @param {number} [options.end=-1]
 */
export async function download(coreManager, namespace, { start = 0, end = -1 } = {}) {
  const writer = coreManager.getWriterCore(namespace)
  const keys = getKeys(coreManager, namespace)

  for (const key of keys) {
    if (key.equals(writer.core.key)) continue
    const core = coreManager.getCoreByKey(key)
    await core.download({ start, end, ifAvailable: true }).done()
  }
}

export async function downloadCore(coreManager, { key, start = 0, end = -1 } = {}) {
  const core = coreManager.getCoreByKey(key)
  await core.download({ start, end, ifAvailable: true }).done()
}

export function replicate(cm1, cm2) {
  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)

  cm1.replicate(n1)
  cm2.replicate(n2)

  return { syncStream1: n1, syncStream2: n2 }
}
