import test from 'node:test'
import assert from 'node:assert/strict'
import {
  connectPeers,
  createManager,
  createManagers,
  invite,
  waitForSync,
} from './utils.js'
import { pEvent } from 'p-event'

/** @import { MapShareExtension } from '../src/generated/extensions.js' */

/**
 * @type {MapShareExtension}
 */
const TEST_SHARE = {
  downloadURLs: ['https://mapserver.example.com'],
  declineURLs: ['https://mapserver.example.com'],
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

  await project.$sendMapShare(TEST_SHARE, invitee.deviceId)

  const gotShare = await onMapShare

  for (const [key, value] of Object.entries(TEST_SHARE)) {
    // @ts-ignore
    const gotValue = gotShare[key]
    assert.deepEqual(gotValue, value, `${key} matches original value`)
  }
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

  await assert.rejects(() =>
    project.$sendMapShare(FAILING_SHARE, invitee.deviceId)
  )
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

  await project.$sendMapShare(FAILING_SHARE, invitee.deviceId, {
    __testOnlyBypassValidation: true,
  })

  await onMapShareError
})

// TODO: Can't invite without having a name
test.skip('Map share error emitted when sharer has no device name', async (t) => {
  const invitor = await createManager('invitor', t)
  const invitee = await createManager('invitee', t)
  const managers = [invitor, invitee]
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

  await project.$sendMapShare(TEST_SHARE, invitee.deviceId)

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

  await removedProject.$sendMapShare(TEST_SHARE, invitee.deviceId)

  await onMapShareError
})
