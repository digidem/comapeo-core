import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createLocalCloudServer,
  findServerPeer,
  waitForSyncWithServer,
} from '../cloud-utils.js'
import { setTimeout as delay } from 'node:timers/promises'
import {
  connectPeers,
  createManager,
  createOldManager,
  invite,
  waitForPeers,
} from '../utils.js'
import { versionsWithCapability } from './versions.js'
import {
  generateCurrentObservation,
  generateObservationFor,
} from './fixtures.js'

/**
 * Waits until the project knows about a server peer. Public-API equivalent of
 * utils.js `waitForSync`, which cannot be used here because it reads sync
 * state via a symbol private to the working-tree version.
 *
 * @param {any} project
 * @returns {Promise<any>} the server peer's member info
 */
async function waitForServerPeer(project, { timeoutMs = 30_000 } = {}) {
  const start = Date.now()
  do {
    const serverPeer = await findServerPeer(project)
    if (serverPeer) return serverPeer
    await delay(100)
  } while (Date.now() - start < timeoutMs)
  throw new Error('timed out waiting for a server peer')
}

// The published @comapeo/cloud server bundles its own version of
// @comapeo/core, so these tests exercise three versions at once: the old
// client, the server's bundled core, and the current working tree — all over
// the websocket sync transport.
for (const version of versionsWithCapability('serverPeers')) {
  test(`cloud sync: @comapeo/core@${version.coreVersion} (${version.appRelease}) <-> server <-> current`, async (t) => {
    const oldManager = await createOldManager(version.coreVersion, t, 'old')
    await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })
    const newManager = createManager('new', t)
    await newManager.setDeviceInfo({ name: 'new', deviceType: 'mobile' })

    const { serverBaseUrl } = await createLocalCloudServer(t)

    // The old client creates the project and adds the server to it
    const projectId = await oldManager.createProject({ name: 'cross-version' })
    const oldProject = await oldManager.getProject(projectId)
    t.after(() => oldProject.$sync.disconnectServers())
    await oldProject.$member.addServerPeer(serverBaseUrl, {
      dangerouslyAllowInsecureConnections: true,
    })
    const serverPeer = await findServerPeer(oldProject)
    assert(serverPeer, 'old client added the server peer')

    // Invite the current client p2p, and sync so it learns about the server
    const disconnect = connectPeers([oldManager, newManager])
    await waitForPeers([oldManager, newManager])
    await invite({ projectId, invitor: oldManager, invitees: [newManager] })
    const newProject = await newManager.getProject(projectId)
    t.after(() => newProject.$sync.disconnectServers())
    assert(
      await waitForServerPeer(newProject),
      'current client learned about the server peer'
    )

    // Disconnect p2p so that data can only flow via the server
    await disconnect()

    // Old client writes an observation and syncs it to the server
    oldProject.$sync.start()
    oldProject.$sync.connectServers()
    const oldObservation = await oldProject.observation.create(
      generateObservationFor(version)
    )
    await waitForSyncWithServer(oldProject, serverPeer.deviceId)
    oldProject.$sync.disconnectServers()
    oldProject.$sync.stop()
    await assert.rejects(
      () => newProject.observation.getByDocId(oldObservation.docId),
      "current client doesn't see the old client's observation yet"
    )

    // Current client syncs with the server: gets the old client's
    // observation, and uploads one of its own
    newProject.$sync.start()
    newProject.$sync.connectServers()
    const newObservation = await newProject.observation.create(
      generateCurrentObservation()
    )
    await waitForSyncWithServer(newProject, serverPeer.deviceId)
    assert(
      await newProject.observation.getByDocId(oldObservation.docId),
      'current client received the old client observation via the server'
    )
    newProject.$sync.disconnectServers()
    newProject.$sync.stop()

    // Old client syncs with the server again: gets the current client's
    // observation
    oldProject.$sync.start()
    oldProject.$sync.connectServers()
    await waitForSyncWithServer(oldProject, serverPeer.deviceId)
    assert(
      await oldProject.observation.getByDocId(newObservation.docId),
      'old client received the current client observation via the server'
    )
  })
}
