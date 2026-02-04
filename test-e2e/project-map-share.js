import test from 'node:test'
import assert from 'node:assert/strict'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
import { pEvent } from 'p-event'

/** @import { MapShareExtension } from '../src/generated/extensions.js' */
/** @import {MapShare} from '../src/mapeo-project.js' */

/**
 * @type {MapShareExtension}
 */
const TEST_SHARE = {
  mapShareUrls: ['https://mapserver.example.com'],
  receiverDeviceId: 'abcdef123456',
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
const FAILING_SHARE = {
  ...TEST_SHARE,
  estimatedSizeBytes: 0,
}

test('Able to send map share to other member', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)

  const mapShare = { ...TEST_SHARE, receiverDeviceId: invitee.deviceId }

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
  })

  const inviteeProject = await invitee.getProject(projectId)

  const onMapShare = pEvent(inviteeProject, 'map-share', {
    rejectionEvents: ['map-share-error'],
    timeout: 1000,
  })

  await project.$sendMapShare(mapShare)

  const gotShare = /** @type MapShare */ (
    /** @type unknown */ (await onMapShare)
  )

  for (const [key, value] of Object.entries(mapShare)) {
    // @ts-ignore
    const gotValue = gotShare[key]
    assert.deepEqual(gotValue, value, `${key} matches original value`)
  }

  const { name } = await invitor.getDeviceInfo()

  assert.equal(
    gotShare.senderDeviceId,
    invitor.deviceId,
    'Share came from sender'
  )

  assert.equal(gotShare.senderDeviceName, name, 'Got sender name')
  assert(gotShare.mapShareReceivedAt, 'Timestamp is not 0')
})

test('Do not allow sending invalid map shares', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
  })

  const mapShare = { ...FAILING_SHARE, receiverDeviceId: invitee.deviceId }

  await assert.rejects(() => project.$sendMapShare(mapShare))
})

test('Map share error emitted when member gets an invalid share', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)

  await invite({
    invitor,
    projectId,
    invitees: [invitee],
  })

  const inviteeProject = await invitee.getProject(projectId)

  const onMapShareError = pEvent(inviteeProject, 'map-share-error', {
    timeout: 1000,
  })

  const mapShare = { ...FAILING_SHARE, receiverDeviceId: invitee.deviceId }

  await project.$sendMapShare(mapShare, { __testOnlyBypassValidation: true })

  await onMapShareError
})

test('Map share error emitted when invitor is removed', async (t) => {
  const managers = await createManagers(4, t)
  const [invitor, invitee, removed] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })

  await invite({
    invitor,
    projectId,
    invitees: [invitee, removed],
  })

  const inviteeProject = await invitee.getProject(projectId)
  const invitorProject = await invitor.getProject(projectId)
  const removedProject = await removed.getProject(projectId)

  await invitorProject.$member.remove(removed.deviceId)

  await waitForSync([inviteeProject, invitorProject], 'initial')

  const onMapShareError = pEvent(inviteeProject, 'map-share-error', {
    timeout: 1000,
  })

  const mapShare = { ...TEST_SHARE, receiverDeviceId: invitee.deviceId }

  await removedProject.$sendMapShare(mapShare)

  await onMapShareError
})
