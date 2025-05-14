import test from 'node:test'
import assert from 'node:assert/strict'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'
import Fastify from 'fastify'
import * as b4a from 'b4a'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import { temporaryDirectoryTask } from 'tempy'
import StreamZip from 'node-stream-zip'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'

import { MapeoManager } from '../src/mapeo-manager.js'
import { kGeoJSONFileName } from '../src/mapeo-project.js'
import { blobMetadata } from '../test//helpers/blob-store.js'

/** @import { Readable } from 'streamx' */

const DEFAULT_OBSERVATIONS = 2
const DEFAULT_TRACKS = 2
const OBSERVATIONS_PER_TRACK = 2

const BLOB_FIXTURES = fileURLToPath(
  new URL('../test/fixtures/blob-api/', import.meta.url)
)

test('Project export empty GeoJSON to stream', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager)

  const stream = project.exportGeoJSONStream()

  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features,
    [],
    'Exported GeoJSON has empty features array'
  )
})

test('Project export observations GeoJSON to stream', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, { makeObservations: true })

  const stream = project.exportGeoJSONStream()
  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features.length,
    DEFAULT_OBSERVATIONS,
    'Exported GeoJSON has expected number of features'
  )
})

test('Project export ignore observations', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, { makeObservations: true })

  const stream = project.exportGeoJSONStream({
    observations: false,
    tracks: false,
  })
  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features.length,
    0,
    'Exported GeoJSON has no features'
  )
})

test('Project export tracks GeoJSON to stream', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, { makeTracks: true })

  const stream = project.exportGeoJSONStream({
    tracks: true,
    observations: false,
  })
  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features.length,
    DEFAULT_TRACKS + DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK,
    'Exported GeoJSON has expected number of features'
  )
})

test('Project export ignore tracks', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, { makeTracks: true })

  const stream = project.exportGeoJSONStream({
    observations: false,
    tracks: false,
  })
  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features.length,
    0,
    'Exported GeoJSON has no features'
  )
})

test('Project export tracks and observations GeoJSON to stream', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, {
    makeTracks: true,
    makeObservations: true,
  })

  const stream = project.exportGeoJSONStream({
    tracks: true,
    observations: true,
  })
  const parsed = await parseGeoJSON(stream)

  assert.equal(
    parsed.type,
    'FeatureCollection',
    'Exported GeoJSON is a FeatureCollection'
  )
  assert.deepEqual(
    parsed.features.length,
    DEFAULT_OBSERVATIONS +
      DEFAULT_TRACKS +
      DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK,
    'Exported GeoJSON has expected number of features'
  )
})

test('Project export tracks and observations GeoJSON to file', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, {
    makeTracks: true,
    makeObservations: true,
  })

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir, {
      tracks: true,
      observations: true,
    })
    const stream = createReadStream(geoJSONFile)
    const parsed = await parseGeoJSON(stream)

    assert.equal(
      parsed.type,
      'FeatureCollection',
      'Exported GeoJSON is a FeatureCollection'
    )
    assert.deepEqual(
      parsed.features.length,
      DEFAULT_OBSERVATIONS +
        DEFAULT_TRACKS +
        DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK,
      'Exported GeoJSON has expected number of features'
    )
  })
})

test('Project export tracks and observations to zip stream', async () => {
  const manager = await setupManager()
  const { project } = await setupProject(manager, {
    makeTracks: true,
    makeObservations: true,
    makeAttachments: true,
  })

  await temporaryDirectoryTask(async (dir) => {
    const zipFile = await project.exportZipFile(dir, {
      tracks: true,
      observations: true,
      attachments: true,
    })
    const zip = new StreamZip.async({ file: zipFile })
    const geoJSONFile = await project[kGeoJSONFileName](true, true)

    const stream = await zip.stream(geoJSONFile)
    const parsed = await parseGeoJSON(stream)
    await zip.close()
    assert.equal(
      parsed.type,
      'FeatureCollection',
      'Exported GeoJSON is a FeatureCollection'
    )
    assert.deepEqual(
      parsed.features.length,
      DEFAULT_OBSERVATIONS +
        DEFAULT_TRACKS +
        DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK,
      'Exported GeoJSON has expected number of features'
    )

    const entriesCount = await zip.entriesCount
    assert.equal(entriesCount, 2, 'Zip has geoJSON and one attachment')
  })
})

/**
 * @param {AsyncIterable<Buffer|Uint8Array|string>} stream
 * @returns {Promise<any>}
 */
async function parseGeoJSON(stream) {
  const chunks = []
  for await (const chunk of stream) {
    if (typeof chunk === 'string') chunks.push(b4a.from(chunk))
    else chunks.push(chunk)
  }

  const wholeBuffer = b4a.concat(chunks)

  assert(wholeBuffer.length > 0, 'Exported buffer not empty')

  const asString = b4a.toString(wholeBuffer, 'utf-8')

  const parsed = JSON.parse(asString)

  return parsed
}

// TODO: Create tracks and assign them observations
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

  let attachment = null

  if (makeAttachments) {
    const { driveId, type, hash, name } = await project.$blobs.create(
      {
        original: join(BLOB_FIXTURES, 'original.png'),
        preview: join(BLOB_FIXTURES, 'preview.png'),
        thumbnail: join(BLOB_FIXTURES, 'thumbnail.png'),
      },
      blobMetadata({ mimeType: 'image/png' })
    )

    attachment = { hash, type, name, driveDiscoveryId: driveId }
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
