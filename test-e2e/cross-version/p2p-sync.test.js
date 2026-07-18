import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createManager,
  createOldManager,
  invite,
  waitForPeers,
} from '../utils.js'
import { VERSIONS } from './versions.js'
import {
  generateCurrentObservation,
  generateObservationFor,
} from './fixtures.js'

for (const version of VERSIONS) {
  test(`p2p sync: current <-> @comapeo/core@${version.coreVersion} (${version.appRelease})`, async (t) => {
    const oldManager = await createOldManager(version.coreVersion, t, 'old')
    await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })
    const newManager = createManager('new', t)
    await newManager.setDeviceInfo({ name: 'new', deviceType: 'mobile' })

    const disconnect = connectPeers([oldManager, newManager])
    t.after(disconnect)
    await waitForPeers([oldManager, newManager])

    // The old device owns the project, so the current version must read the
    // project auth & config data written by the old version.
    const projectId = await oldManager.createProject({ name: 'cross-version' })
    await invite({ projectId, invitor: oldManager, invitees: [newManager] })

    const [oldProject, newProject] = await Promise.all([
      oldManager.getProject(projectId),
      newManager.getProject(projectId),
    ])
    assert.equal(
      (await newProject.$getProjectSettings()).name,
      'cross-version',
      'current version reads project settings written by the old version'
    )

    oldProject.$sync.start()
    newProject.$sync.start()

    // Data written on both sides covers both directions on the wire,
    // including newer schema fields being dropped by the old peer.
    const [oldObservation, newObservation] = await Promise.all([
      oldProject.observation.create(generateObservationFor(version)),
      newProject.observation.create(generateCurrentObservation()),
    ])

    await Promise.all([
      oldProject.$sync.waitForSync('full'),
      newProject.$sync.waitForSync('full'),
    ])

    assert(
      await oldProject.observation.getByDocId(newObservation.docId),
      'old version reads observation written by current version'
    )
    assert(
      await newProject.observation.getByDocId(oldObservation.docId),
      'current version reads observation written by old version'
    )
  })
}
