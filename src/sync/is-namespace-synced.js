import { ExhaustivenessError } from '../utils.js'
/** @import { ReadonlyDeep } from 'type-fest' */
/** @import { PeerNamespaceState } from './core-sync-state.js' */

/**
 * @param {ReadonlyDeep<{
 *   remoteStates: Record<
 *     string,
 *     Pick<PeerNamespaceState, 'want' | 'wanted' | 'status'>
 *   >
 * }>} namespaceSyncState
 * @returns {boolean}
 */
export const isNamespaceSynced = ({ remoteStates }) =>
  Object.values(remoteStates).every((peerState) => {
    switch (peerState.status) {
      case 'unknown':
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
