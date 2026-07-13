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
 * @property {number} have blocks this device holds
 * @property {number} toReceive unique blocks still needed that at least one
 * connected device has. A best-effort progress denominator, not a transfer
 * prediction — it strictly shrinks as blocks arrive and is 0 exactly when
 * the group is complete.
 * @property {number} toSend unique blocks at least one connected device
 * still needs from us. Even less predictive than `toReceive` (peers also
 * receive blocks from each other), but 0 exactly when the group is complete.
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
 * Aggregate the sync state into project-wide totals — what a "sync with
 * everyone" progress UI needs. Kept here (rather than in each frontend) so
 * there is exactly one definition of what the totals mean: block counts come
 * from the state's top-level per-group totals (each unique block counted
 * once, however many devices hold or need it), and completion is "complete
 * with every connected device", matching `$sync.waitForSync()`.
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
      ...state[group],
      syncingDeviceCount: 0,
    }
    for (const device of deviceStates) {
      const progress = device[group]
      if (!progress.isComplete) result.isComplete = false
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
