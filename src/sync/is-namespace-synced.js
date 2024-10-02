import { ExhaustivenessError } from '../utils.js'
/** @import { ReadonlyDeep } from 'type-fest' */

/**
 * @internal
 * @typedef {object} PeerNamespaceState
 * @property {number} want
 * @property {number} wanted
 * @property {'stopped' | 'starting' | 'started'} status
 */

/**
 * @param {ReadonlyDeep<{ remoteStates: Record<string, PeerNamespaceState> }>} namespaceSyncState
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
