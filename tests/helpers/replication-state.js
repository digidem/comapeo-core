import { truncateId } from '../../lib/utils.js'
import { getKeys } from './core-manager.js'

export function logState (syncState) {
  let message = `${syncState.synced ? 'synced' : 'not synced'}\n`

  for (const [coreId, state] of Object.entries(syncState.cores)) {
      message += `${truncateId(coreId)}`
    for (const [peerId, peerState] of Object.entries(state)) {
      message += `\n${truncateId(peerId)} (${ peerState.remote ? 'remote' : 'local' }) h: ${peerState.have} w: ${peerState.want} l: ${peerState.length} `
    }
    message += '\n'
  }

  console.log(message)
}

export function download (coreManager, namespace) {
  const writer = coreManager.getWriterCore(namespace)
  const keys = getKeys(coreManager, namespace)

  for (const key of keys) {
    if (key.equals(writer.core.key)) continue
    const core = coreManager.getCoreByKey(key)
    core.download({ start: 0, end: -1 })
  }
}
