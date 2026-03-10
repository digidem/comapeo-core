import test from 'node:test'
import assert from 'node:assert/strict'
import { connectPeers, createManagers } from './utils.js'

import { MAX_BOUNDS, validateMapShareExtension } from '../src/utils.js'

import { pEvent } from 'p-event'

/** @import {MapShare, MapShareSend} from '../src/mapeo-manager.js' */
/** @import {MapShareExtension} from '../src/generated/rpc.js' */

/**
 * @type {MapShareSend}
 */
const TEST_SHARE = {
  mapShareUrls: ['https://mapserver.example.com'],
  // receiverDeviceKey: Buffer.from('DEADBEEF', 'hex'),
  receiverDeviceId: '123abcd',
  shareId: 'share001',
  mapShareCreatedAt: Date.now(),
  mapCreatedAt: Date.now(),
  mapName: 'City Map',
  mapId: 'map12345',
  bounds: [-122, 30, 122, 37],
  minzoom: 10,
  maxzoom: 20,
  estimatedSizeBytes: 5000000,
}

/**
 * @type {MapShareExtension}
 */
const TEST_SHARE_RAW = {
  mapShareUrls: ['https://mapserver.example.com'],
  receiverDeviceKey: Buffer.from('DEADBEEF', 'hex'),
  shareId: 'share001',
  mapShareCreatedAt: Date.now(),
  mapCreatedAt: Date.now(),
  mapName: 'City Map',
  mapId: 'map12345',
  bounds: [-122, 30, -123, 37],
  minzoom: 10,
  maxzoom: 20,
  estimatedSizeBytes: 5000000,
}

/**
 * @type {MapShareExtension[]}
 */
const FAILING_TEST_SHARES = [
  { ...TEST_SHARE_RAW, mapShareUrls: [] },
  { ...TEST_SHARE_RAW, mapShareUrls: ['invalid-url'] },
  { ...TEST_SHARE_RAW, receiverDeviceKey: Buffer.from([]) },
  { ...TEST_SHARE_RAW, shareId: '' },
  { ...TEST_SHARE_RAW, mapShareCreatedAt: 0 },
  { ...TEST_SHARE_RAW, mapCreatedAt: 0 },
  { ...TEST_SHARE_RAW, mapName: '' },
  { ...TEST_SHARE_RAW, mapId: '' },
  { ...TEST_SHARE_RAW, bounds: [] },
  { ...TEST_SHARE_RAW, bounds: makeBound(4, 0) }, // Make bounds array of length 5
  { ...TEST_SHARE_RAW, bounds: makeBound(0, MAX_BOUNDS[0] - 1) }, // Make bounds array of length 5
  { ...TEST_SHARE_RAW, bounds: makeBound(1, MAX_BOUNDS[1] - 1) }, // Make bounds array of length 5
  { ...TEST_SHARE_RAW, bounds: makeBound(2, MAX_BOUNDS[2] + 1) }, // Make bounds array of length 5
  { ...TEST_SHARE_RAW, bounds: makeBound(3, MAX_BOUNDS[3] + 1) }, // Make bounds array of length 5
  { ...TEST_SHARE_RAW, minzoom: -1 },
  { ...TEST_SHARE_RAW, minzoom: 420, maxzoom: 421 },
  { ...TEST_SHARE_RAW, maxzoom: -1, minzoom: 0 },
  { ...TEST_SHARE_RAW, maxzoom: 300 },
  { ...TEST_SHARE_RAW, maxzoom: 4, minzoom: 20 },
  { ...TEST_SHARE_RAW, estimatedSizeBytes: 0 },
  { ...TEST_SHARE_RAW, estimatedSizeBytes: -1 },
]

/**
 * @type {MapShareSend}
 */
const FAILING_SHARE = {
  ...TEST_SHARE,
  estimatedSizeBytes: 0,
}

test('Able to send map share to other member', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const mapShare = { ...TEST_SHARE, receiverDeviceId: invitee.deviceId }

  const onMapShare = pEvent(invitee, 'map-share', {
    rejectionEvents: ['map-share-error'],
    timeout: 1000,
  })

  await invitor.sendMapShare(mapShare)

  const gotShare = /** @type MapShare */ (
    /** @type unknown */ (await onMapShare)
  )

  for (const [key, value] of Object.entries(mapShare)) {
    if (key === 'receiverDeviceKey') {
      // This is unnecessary
      continue
    }
    // @ts-ignore
    const gotValue = gotShare[key]
    assert.deepEqual(gotValue, value, `${key} matches original value`)

    const { name } = await invitor.getDeviceInfo()

    assert.equal(
      gotShare.senderDeviceId,
      invitor.deviceId,
      'Share came from sender'
    )

    assert.equal(gotShare.senderDeviceName, name, 'Got sender name')
    assert(gotShare.mapShareReceivedAt, 'Timestamp is not 0')
  }
})

test('Do not allow sending invalid map shares', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const mapShare = { ...FAILING_SHARE, receiverDeviceId: invitee.deviceId }

  await assert.rejects(() => invitor.sendMapShare(mapShare))
})

test('Map share error emitted when member gets an invalid share', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const onMapShareError = pEvent(invitee, 'map-share-error', {
    timeout: 1000,
  })

  const mapShare = { ...FAILING_SHARE, receiverDeviceId: invitee.deviceId }

  await invitor.sendMapShare(mapShare, { __testOnlyBypassValidation: true })

  await onMapShareError
})

test('Map share validation checks fields', () => {
  assert.doesNotThrow(() => validateMapShareExtension(TEST_SHARE_RAW))

  for (const [index, share] of FAILING_TEST_SHARES.entries()) {
    assert.throws(
      () => validateMapShareExtension(share),
      `Validation caught error in ${index}`
    )
  }
})

/**
 * Make bounds to test map share extensions
 * @param {number} index Where in the bounds to place it
 * @param {number} value Value to place into bounds
 * @returns {number[]}
 */
function makeBound(index, value) {
  const bounds = [...MAX_BOUNDS]
  bounds[index] = value
  return bounds
}
