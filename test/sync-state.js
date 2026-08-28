import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregateSyncState } from '../src/sync-state.js'

/** @import { DeviceSyncState } from '../src/sync/sync-rules.js' */

/**
 * @param {Partial<import('../src/sync/sync-rules.js').DeviceGroupProgress>} [initial]
 * @param {Partial<import('../src/sync/sync-rules.js').DeviceGroupProgress>} [data]
 * @returns {DeviceSyncState}
 */
const device = (initial = {}, data = {}) => ({
  initial: {
    isSyncEnabled: true,
    isComplete: true,
    toReceive: 0,
    toSend: 0,
    ...initial,
  },
  data: {
    isSyncEnabled: true,
    isComplete: true,
    toReceive: 0,
    toSend: 0,
    ...data,
  },
})

const ZERO_COUNTS = { have: 0, toReceive: 0, toSend: 0 }

test('aggregateSyncState() with no devices: complete, zero counts', () => {
  assert.deepEqual(
    aggregateSyncState({
      syncMode: 'initial',
      initial: ZERO_COUNTS,
      data: ZERO_COUNTS,
      devices: {},
    }),
    {
      syncMode: 'initial',
      deviceCount: 0,
      initial: {
        isComplete: true,
        have: 0,
        toReceive: 0,
        toSend: 0,
        syncingDeviceCount: 0,
      },
      data: {
        isComplete: true,
        have: 0,
        toReceive: 0,
        toSend: 0,
        syncingDeviceCount: 0,
      },
    },
    'no connected devices aggregates as complete, matching waitForSync'
  )
})

test('aggregateSyncState() uses union totals, not per-device sums', () => {
  // Three devices all hold the same 100 blocks we need: the per-device
  // toReceive counts are 100 each, but the state's union total is 100 —
  // the aggregate must report 100, not 300
  const aggregated = aggregateSyncState({
    syncMode: 'all',
    initial: { have: 40, toReceive: 5, toSend: 2 },
    data: { have: 250, toReceive: 100, toSend: 7 },
    devices: {
      a: device(
        { toReceive: 5, toSend: 2, isComplete: false },
        { toReceive: 100, toSend: 0, isComplete: false }
      ),
      b: device(
        {},
        {
          toReceive: 100,
          toSend: 7,
          isComplete: false,
          isSyncEnabled: false,
        }
      ),
      c: device({}, { toReceive: 100, isComplete: false }),
    },
  })
  assert.deepEqual(aggregated, {
    syncMode: 'all',
    deviceCount: 3,
    initial: {
      isComplete: false,
      have: 40,
      toReceive: 5,
      toSend: 2,
      syncingDeviceCount: 3,
    },
    data: {
      isComplete: false,
      have: 250,
      toReceive: 100,
      toSend: 7,
      syncingDeviceCount: 2,
    },
  })
})

test('aggregateSyncState() one incomplete device makes the group incomplete', () => {
  const aggregated = aggregateSyncState({
    syncMode: 'all',
    initial: ZERO_COUNTS,
    data: ZERO_COUNTS,
    devices: {
      a: device(),
      b: device({ isComplete: false }),
    },
  })
  assert.equal(aggregated.initial.isComplete, false)
  assert.equal(aggregated.data.isComplete, true)
})
