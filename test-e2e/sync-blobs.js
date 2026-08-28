import test from 'node:test'
import assert from 'node:assert/strict'
import { request } from 'undici'
import { createHash } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { COORDINATOR_ROLE_ID } from '../src/roles.js'
import {
  connectPeers,
  createManagers,
  invite,
  seedProjectBlobs,
  waitForSync,
} from './utils.js'
/** @import { BlobId } from '../src/types.js' */
/** @import { MapeoProject } from '../src/mapeo-project.js' */

// Blob sync and archive-device filtering: non-archive devices only sync
// preview/thumbnail variants, and can switch archive mode mid-project. Blob
// counts are deliberately large (50 photos + 20 audio = hundreds of blob
// blocks and multi-megabyte cores) to exercise real transfer volumes.

test('syncing blobs', async (t) => {
  const managers = await createManagers(4, t)
  const [invitor, ...invitees] = managers

  let disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })
  await disconnectPeers()

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject] = projects

  const blobs = await seedProjectBlobs(invitorProject, t, {
    photoCount: 50,
    audioCount: 20,
  })

  disconnectPeers = connectPeers(managers)
  await syncProjects(projects)

  for (const { blobId, hashes } of blobs) {
    for (const project of projects) {
      for (const variant of ['original', 'preview', 'thumbnail']) {
        if (blobId.type !== 'photo' && variant !== 'original') continue
        await assertHasBlob(
          project,
          // @ts-expect-error
          { ...blobId, variant },
          // @ts-expect-error
          hashes[variant]
        )
      }
    }
  }
})

test('non-archive devices only sync a subset of blobs', async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, invitee1, invitee2] = managers

  invitee1.setIsArchiveDevice(false)

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees: [invitee1, invitee2], projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, invitee1Project, invitee2Project] = projects
  const [invitorBlobs, invitee1Blobs, invitee2Blobs] = await Promise.all(
    projects.map((p) =>
      seedProjectBlobs(p, t, { photoCount: 50, audioCount: 20 })
    )
  )

  await t.test('originals do not sync to non-archive devices', async () => {
    await syncProjects(projects)

    // Invitee1 should not have the original variants
    for (const { blobId } of [invitorBlobs, invitee2Blobs].flat()) {
      await assertDoesNotHaveBlob(invitee1Project, {
        ...blobId,
        variant: 'original',
      })
    }

    // Invitor and invitee2 should have all blobs, invitee1 should only have
    // the preview and thumbnail variants
    for (const { blobId, hashes } of [
      invitorBlobs,
      invitee1Blobs,
      invitee2Blobs,
    ].flat()) {
      await assertHasBlob(
        invitorProject,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertHasBlob(
        invitee2Project,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      if (blobId.type !== 'photo') continue
      for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
        for (const project of projects) {
          await assertHasBlob(
            project,
            { ...blobId, variant },
            // @ts-expect-error
            hashes[variant]
          )
        }
      }
    }
  })

  await t.test(
    'originals sync when a device switches to be an archive device',
    async () => {
      invitee1.setIsArchiveDevice(true)
      await syncProjects(projects)

      for (const { blobId, hashes } of [
        invitorBlobs,
        invitee1Blobs,
        invitee2Blobs,
      ].flat()) {
        await assertHasBlob(
          invitee1Project,
          { ...blobId, variant: 'original' },
          hashes.original
        )
      }
    }
  )

  await t.test('device can toggle archive status while syncing', async (t) => {
    projects.map((p) => p.$sync.start())
    await waitForSync(projects, 'all')

    invitee2.setIsArchiveDevice(false)
    const newInvitorBlobs = await seedProjectBlobs(invitorProject, t, {
      photoCount: 10,
      audioCount: 5,
    })
    await waitForSync(projects, 'all')

    for (const { blobId, hashes } of newInvitorBlobs) {
      await assertHasBlob(
        invitorProject,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertHasBlob(
        invitee1Project,
        { ...blobId, variant: 'original' },
        hashes.original
      )
      await assertDoesNotHaveBlob(invitee2Project, {
        ...blobId,
        variant: 'original',
      })
      if (blobId.type !== 'photo') continue
      for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
        for (const project of projects) {
          await assertHasBlob(
            project,
            { ...blobId, variant },
            // @ts-expect-error
            hashes[variant]
          )
        }
      }
    }
  })
})

// This test catches a bug where when a peer does not want any blobs from a
// particular core, the sync state thinks the peer still wants all blobs, if
// that core is added via sync after the device has already set themselves as a
// non-archive device. We simulate this scenario by only writing audio blobs to
// seed the database, which do not have any previews or thumbnails, so nothing
// should sync with a non-archive device.
test('non-archive devices sync subset when nothing to downlad', async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, invitee1, invitee2] = managers

  invitee1.setIsArchiveDevice(false)

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees: [invitee1, invitee2], projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [invitorProject, invitee1Project, invitee2Project] = projects
  const [invitorBlobs, invitee1Blobs, invitee2Blobs] = await Promise.all(
    projects.map((p) =>
      seedProjectBlobs(p, t, { photoCount: 0, audioCount: 50 })
    )
  )

  await syncProjects(projects)

  // Invitee1 should not have the original variants
  for (const { blobId } of [invitorBlobs, invitee2Blobs].flat()) {
    await assertDoesNotHaveBlob(invitee1Project, {
      ...blobId,
      variant: 'original',
    })
  }

  // Invitor and invitee2 should have all blobs, invitee1 should only have
  // the preview and thumbnail variants
  for (const { blobId, hashes } of [
    invitorBlobs,
    invitee1Blobs,
    invitee2Blobs,
  ].flat()) {
    await assertHasBlob(
      invitorProject,
      { ...blobId, variant: 'original' },
      hashes.original
    )
    await assertHasBlob(
      invitee2Project,
      { ...blobId, variant: 'original' },
      hashes.original
    )
    if (blobId.type !== 'photo') continue
    for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
      for (const project of projects) {
        await assertHasBlob(
          project,
          { ...blobId, variant },
          // @ts-expect-error
          hashes[variant]
        )
      }
    }
  }
})

test('Can switch to non-archive device after creating or joining project', async (t) => {
  const managers = await createManagers(4, t)
  const [invitor, ...invitees] = managers

  const disconnectPeers = connectPeers(managers)
  t.after(() => disconnectPeers())

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const invitee1Blobs = await seedProjectBlobs(projects[1], t, {
    photoCount: 50,
    audioCount: 20,
  })

  await waitForSync(projects, 'initial')

  invitor.setIsArchiveDevice(false)
  invitees[1].setIsArchiveDevice(false)

  await syncProjects(projects)

  for (const { blobId, hashes } of invitee1Blobs) {
    // Non-archive devices should not have the original variants
    await assertDoesNotHaveBlob(projects[0], {
      ...blobId,
      variant: 'original',
    })
    await assertDoesNotHaveBlob(projects[2], {
      ...blobId,
      variant: 'original',
    })
    // Archive devices should have all blobs
    await assertHasBlob(
      projects[1],
      { ...blobId, variant: 'original' },
      hashes.original
    )
    await assertHasBlob(
      projects[3],
      { ...blobId, variant: 'original' },
      hashes.original
    )
  }
})

// Working as designed (decided July 2026): blob originals move only on
// direct contact between the authoring device and a device that wants them.
// A non-archive device never downloads originals, so it cannot relay them —
// an archive device that only ever meets an intermediate non-archive device
// receives previews/thumbnails (which the intermediate holds) but not
// originals, until it meets the authoring device directly.
test('blob originals do not relay through a non-archive device', async (t) => {
  const managers = await createManagers(3, t)
  const [author, intermediate, archive] = managers
  intermediate.setIsArchiveDevice(false)

  // Chain topology: author ↔ intermediate ↔ archive. The author and the
  // archive device never connect (yet).
  const disconnect1 = connectPeers([author, intermediate])
  t.after(() => disconnect1())
  const projectId = await author.createProject({ name: 'Mapeo' })
  await invite({
    invitor: author,
    invitees: [intermediate],
    projectId,
    roleId: COORDINATOR_ROLE_ID,
  })
  const disconnect2 = connectPeers([intermediate, archive])
  t.after(() => disconnect2())
  await invite({ invitor: intermediate, invitees: [archive], projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  const [authorProject, intermediateProject, archiveProject] = projects
  const blobs = await seedProjectBlobs(authorProject, t, {
    photoCount: 20,
    audioCount: 10,
  })

  // waitForSync() waits on every pair, so wait per connected pair, in chain
  // order (data can only flow author → intermediate → archive)
  for (const project of projects) project.$sync.start()
  await waitForSync([authorProject, intermediateProject], 'all')
  await waitForSync([intermediateProject, archiveProject], 'all')
  for (const project of projects) project.$sync.stop()

  for (const { blobId, hashes } of blobs) {
    await assertDoesNotHaveBlob(
      intermediateProject,
      { ...blobId, variant: 'original' },
      'non-archive intermediate never downloads originals'
    )
    await assertDoesNotHaveBlob(
      archiveProject,
      { ...blobId, variant: 'original' },
      'originals cannot be relayed: the intermediate does not hold them'
    )
    if (blobId.type !== 'photo') continue
    for (const variant of /** @type {const} */ (['preview', 'thumbnail'])) {
      await assertHasBlob(
        archiveProject,
        { ...blobId, variant },
        // @ts-expect-error
        hashes[variant],
        'previews/thumbnails DO relay: the intermediate holds them'
      )
    }
  }

  // Direct contact delivers the originals
  const disconnect3 = connectPeers([author, archive])
  t.after(() => disconnect3())
  await syncProjects(projects)

  for (const { blobId, hashes } of blobs) {
    await assertHasBlob(
      archiveProject,
      { ...blobId, variant: 'original' },
      hashes.original,
      'originals arrive once the archive device meets the authoring device'
    )
  }
})

/**
 * @param {MapeoProject[]} projects
 */
async function syncProjects(projects) {
  for (const project of projects) {
    project.$sync.start()
  }
  await waitForSync(projects, 'all')
  for (const project of projects) {
    project.$sync.stop()
  }
}

/**
 * @param {MapeoProject} project
 * @param {BlobId} blobId
 * @param {Buffer} expectedHash
 * @param {string} [message]
 */
async function assertHasBlob(project, blobId, expectedHash, message) {
  const url = await project.$blobs.getUrl(blobId)
  const response = await request(url, { reset: true })
  assert.equal(response.statusCode, 200)
  const hash = createHash('sha256')
  await pipeline(response.body, hash)
  assert.equal(hash.digest('hex'), expectedHash.toString('hex'), message)
}

/**
 * @param {MapeoProject} project
 * @param {BlobId} blobId
 * @param {string} [message]
 */
async function assertDoesNotHaveBlob(project, blobId, message) {
  const url = await project.$blobs.getUrl(blobId)
  const response = await request(url, { reset: true })
  assert.equal(response.statusCode, 404, message)
}
