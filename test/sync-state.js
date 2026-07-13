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

test('aggregateSyncState() with no devices: complete, zero counts', () => {
  assert.deepEqual(
    aggregateSyncState({ syncMode: 'initial', devices: {} }),
    {
      syncMode: 'initial',
      deviceCount: 0,
      initial: {
        isComplete: true,
        toReceive: 0,
        toSend: 0,
        syncingDeviceCount: 0,
      },
      data: {
        isComplete: true,
        toReceive: 0,
        toSend: 0,
        syncingDeviceCount: 0,
      },
    },
    'no connected devices aggregates as complete, matching waitForSync'
  )
})

test('aggregateSyncState() sums counts and ANDs completion across devices', () => {
  const aggregated = aggregateSyncState({
    syncMode: 'all',
    devices: {
      a: device(
        { toReceive: 5, toSend: 2, isComplete: false },
        { toReceive: 100, toSend: 0, isComplete: false }
      ),
      b: device({}, { toSend: 7, isComplete: false, isSyncEnabled: false }),
      c: device(),
    },
  })
  assert.deepEqual(aggregated, {
    syncMode: 'all',
    deviceCount: 3,
    initial: {
      isComplete: false,
      toReceive: 5,
      toSend: 2,
      syncingDeviceCount: 3,
    },
    data: {
      isComplete: false,
      toReceive: 100,
      toSend: 7,
      syncingDeviceCount: 2,
    },
  })
})

test('aggregateSyncState() one incomplete device makes the group incomplete', () => {
  const aggregated = aggregateSyncState({
    syncMode: 'all',
    devices: {
      a: device(),
      b: device({ isComplete: false }),
    },
  })
  assert.equal(aggregated.initial.isComplete, false)
  assert.equal(aggregated.data.isComplete, true)
})
