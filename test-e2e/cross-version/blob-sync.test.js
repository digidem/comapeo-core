import assert from 'node:assert/strict'
import fsPromises from 'node:fs/promises'
import test from 'node:test'
import {
  connectPeers,
  createManager,
  createOldManager,
  invite,
  waitForPeers,
} from '../utils.js'
import { versionsWithCapability } from './versions.js'

const FIXTURE_PATH = new URL(
  '../../test/fixtures/images/02-digidem-logo.jpg',
  import.meta.url
).pathname

/**
 * Create a photo blob on `writerProject` and assert that, after sync,
 * `readerProject` serves it over HTTP with the same content.
 *
 * Projects are `any` because either side may be an old @comapeo/core version.
 *
 * @param {any} writerProject
 * @param {any} readerProject
 * @param {string} message
 */
async function assertBlobSyncs(writerProject, readerProject, message) {
  const blob = await writerProject.$blobs.create(
    { original: FIXTURE_PATH },
    { mimeType: 'image/jpeg' }
  )
  await Promise.all([
    writerProject.$sync.waitForSync('full'),
    readerProject.$sync.waitForSync('full'),
  ])
  const blobUrl = await readerProject.$blobs.getUrl({
    ...blob,
    variant: 'original',
  })
  const response = await fetch(blobUrl)
  assert.equal(response.status, 200, `${message}: blob URL responds with 200`)
  assert.deepEqual(
    Buffer.from(await response.arrayBuffer()),
    await fsPromises.readFile(FIXTURE_PATH),
    message
  )
}

for (const version of versionsWithCapability('blobSync')) {
  test(`blob sync: current <-> @comapeo/core@${version.coreVersion} (${version.appRelease})`, async (t) => {
    const oldManager = await createOldManager(version.coreVersion, t, 'old')
    await oldManager.setDeviceInfo({ name: 'old', deviceType: 'mobile' })
    const newManager = createManager('new', t)
    await newManager.setDeviceInfo({ name: 'new', deviceType: 'mobile' })

    const disconnect = connectPeers([oldManager, newManager])
    t.after(disconnect)
    await waitForPeers([oldManager, newManager])

    const projectId = await oldManager.createProject({ name: 'cross-version' })
    await invite({ projectId, invitor: oldManager, invitees: [newManager] })

    const [oldProject, newProject] = await Promise.all([
      oldManager.getProject(projectId),
      newManager.getProject(projectId),
    ])
    oldProject.$sync.start()
    newProject.$sync.start()

    await assertBlobSyncs(
      oldProject,
      newProject,
      'current version serves photo written by old version'
    )
    await assertBlobSyncs(
      newProject,
      oldProject,
      'old version serves photo written by current version'
    )
  })
}
