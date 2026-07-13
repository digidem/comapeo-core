/**
 * Helpers for consuming the public sync state (`project.$sync.getState()` /
 * the `'sync-state'` event). This module is exported on the
 * `@comapeo/core/sync-state.js` subpath and has no runtime dependencies, so
 * frontends can import it without bundling any backend code.
 *
 * @import { SyncApiState, SyncMode } from './sync/sync-rules.js'
 */

/**
 * @typedef {object} AggregatedGroupProgress
 * @property {boolean} isComplete nothing left to send to or receive from any
 * connected device in this group (true when no devices are connected)
 * @property {number} toReceive total blocks still needed from all connected
 * devices
 * @property {number} toSend total blocks all connected devices still need
 * from us
 * @property {number} syncingDeviceCount how many connected devices this group
 * is actively replicating with (both sides enabled)
 */

/**
 * @typedef {object} AggregatedSyncState
 * @property {SyncMode} syncMode
 * @property {number} deviceCount how many project members are connected
 * @property {AggregatedGroupProgress} initial
 * @property {AggregatedGroupProgress} data
 */

/**
 * Aggregate the per-device sync state into project-wide totals — what a
 * "sync with everyone" progress UI needs. Kept here (rather than in each
 * frontend) so there is exactly one definition of what the totals mean:
 * completion is "complete with every connected device", matching
 * `$sync.waitForSync()`.
 *
 * @param {SyncApiState} state
 * @returns {AggregatedSyncState}
 */
export function aggregateSyncState(state) {
  const deviceStates = Object.values(state.devices)
  /** @param {'initial' | 'data'} group */
  const aggregateGroup = (group) => {
    /** @type {AggregatedGroupProgress} */
    const result = {
      isComplete: true,
      toReceive: 0,
      toSend: 0,
      syncingDeviceCount: 0,
    }
    for (const device of deviceStates) {
      const progress = device[group]
      if (!progress.isComplete) result.isComplete = false
      result.toReceive += progress.toReceive
      result.toSend += progress.toSend
      if (progress.isSyncEnabled) result.syncingDeviceCount++
    }
    return result
  }
  return {
    syncMode: state.syncMode,
    deviceCount: deviceStates.length,
    initial: aggregateGroup('initial'),
    data: aggregateGroup('data'),
  }
}
