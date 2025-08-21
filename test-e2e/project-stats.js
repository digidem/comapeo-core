import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import RAM from 'random-access-memory'
import Fastify from 'fastify'
import { pEvent } from 'p-event'

import { KeyManager } from '@mapeo/crypto'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'

import { createManagers, connectPeers } from './utils.js'
import { MapeoManager, roles } from '../src/index.js'

/** @import { Readable } from 'streamx' */

const DEFAULT_OBSERVATIONS = 2
const DEFAULT_TRACKS = 2
const OBSERVATIONS_PER_TRACK = 2

const BLOB_FIXTURES = fileURLToPath(
  new URL('../test/fixtures/blob-api/', import.meta.url)
)

test('Tracks exist for project', async () => {
  const manager = setupManager()
  const { project } = await setupProject(manager, {
    makeObservations: true,
    makeTracks: true,
  })

  const { project: id, stats } = project.$getStats()

  assert(id, 'id exists')

  const [{ week, observations, tracks, members }] = stats

  assert(
    week.startsWith(new Date().getFullYear().toString()),
    'Week for this year'
  )
  const expectedObservations =
    DEFAULT_OBSERVATIONS + DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK
  assert.equal(observations, expectedObservations, 'Count of observations')
  assert.equal(tracks, DEFAULT_TRACKS, 'Count of tracks')
  assert(members !== undefined, 'Members exists')
})

test('sendStats state persists', async () => {
  const manager = setupManager()

  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  const { sendStats: initialSendStats } = await project.$getProjectSettings()

  assert(initialSendStats !== true, 'default sendStats not true')

  await project.$setProjectSettings({ sendStats: true })

  const { sendStats: updatedSendStats } = await project.$getProjectSettings()

  assert(updatedSendStats, 'send stats got updated')
})

test('sendStats set inside invite', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  const project = await invitor.getProject(projectId)
  await project.$setProjectSettings({ sendStats: true })

  const gotInvite = pEvent(invitee.invite, 'invite-received')
  project.$member.invite(invitee.deviceId, {
    roleId: roles.MEMBER_ROLE_ID,
  })

  const invite = await gotInvite

  assert(invite.sendStats, 'Invite mentions send stats')
})

/**
 *
 * @param {MapeoManager} manager
 * @param {object} options
 * @param {boolean} [options.makeObservations=false]
 * @param {boolean} [options.makeTracks=false]
 * @param {boolean} [options.makeAttachments=false]
 * @returns
 */
async function setupProject(
  manager,
  { makeObservations = false, makeTracks = false, makeAttachments = false } = {}
) {
  const projectId = await manager.createProject()
  const project = await manager.getProject(projectId)

  /** @type {import('../src/types.js').Attachment | null} */
  let attachment = null

  if (makeAttachments) {
    const { driveId, type, hash, name } = await project.$blobs.create(
      {
        original: join(BLOB_FIXTURES, 'original.png'),
        preview: join(BLOB_FIXTURES, 'preview.png'),
        thumbnail: join(BLOB_FIXTURES, 'thumbnail.png'),
      },
      { mimeType: 'image/png' }
    )

    attachment = {
      hash,
      type,
      name,
      driveDiscoveryId: driveId,
      external: false,
    }
  }

  /** @type {import('@comapeo/schema').Observation[]} */
  let observations = []
  if (makeObservations) {
    const count = DEFAULT_OBSERVATIONS
    const generated = generate('observation', { count }).map(valueOf)

    observations = await Promise.all(
      generated.map((observation) => {
        if (attachment !== null) {
          observation.attachments = [attachment]
        } else {
          observation.attachments = []
        }
        return project.observation.create(observation)
      })
    )
  }

  /** @type {import('@comapeo/schema').Track[]} */
  let tracks = []

  if (makeTracks) {
    const count = DEFAULT_TRACKS
    const generated = generate('track', { count }).map(valueOf)

    tracks = await Promise.all(
      generated.map(async (track) => {
        const generatedObservations = generate('observation', {
          count: OBSERVATIONS_PER_TRACK,
        }).map(valueOf)

        const trackObservations = await Promise.all(
          generatedObservations.map((observation) => {
            if (attachment !== null) {
              observation.attachments = [attachment]
            } else {
              observation.attachments = []
            }

            return project.observation.create(observation)
          })
        )

        observations.push(...trackObservations)

        track.observationRefs = trackObservations.map(
          ({ docId, versionId }) => ({
            docId,
            versionId,
          })
        )

        return project.track.create(track)
      })
    )
  }

  return { project, observations, tracks }
}

/**
 * @returns {MapeoManager}
 */
function setupManager() {
  const fastify = Fastify()

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder: new URL('../drizzle/project', import.meta.url)
      .pathname,
    clientMigrationsFolder: new URL('../drizzle/client', import.meta.url)
      .pathname,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  return manager
}
