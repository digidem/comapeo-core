import { ExhaustivenessError } from '../utils.js'
/** @import { SyncState as NamespaceSyncState } from './namespace-sync-state.js' */

// TODO: Test this

/**
 * @param {Pick<NamespaceSyncState, 'remoteStates'>} namespaceSyncState
 * @returns {boolean}
 */
export const isNamespaceSynced = ({ remoteStates }) =>
  Object.values(remoteStates).every((peerState) => {
    switch (peerState.status) {
      case 'starting':
        return false
      case 'stopped':
        return true
      case 'started':
        return peerState.want === 0 && peerState.wanted === 0
      default:
        throw new ExhaustivenessError(peerState.status)
    }
  })
