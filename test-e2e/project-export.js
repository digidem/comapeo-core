import test from 'node:test'
import assert from 'node:assert/strict'
import * as b4a from 'b4a'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import { temporaryDirectoryTask } from 'tempy'
import StreamZip from 'node-stream-zip'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createReadStream } from 'node:fs'

import {
  connectPeers,
  createManager,
  createManagers,
  invite,
  waitForSync,
} from './utils.js'

/** @import { Readable } from 'streamx' */

const DEFAULT_OBSERVATIONS = 2
const DEFAULT_TRACKS = 2
const OBSERVATIONS_PER_TRACK = 2

const BLOB_FIXTURES = fileURLToPath(
  new URL('../test/fixtures/blob-api/', import.meta.url)
)

test('Project export empty GeoJSON to stream', async (t) => {
  const manager = createManager('test', t)
  const { project } = await setupProject(manager)

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir)
    const stream = createReadStream(geoJSONFile)

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
})

test('Project export observations GeoJSON to stream', async (t) => {
  const manager = createManager('test', t)
  const { project } = await setupProject(manager, { makeObservations: true })

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir)
    const stream = createReadStream(geoJSONFile)
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
})

test('Project export ignore observations', async (t) => {
  const manager = createManager('test', t)
  const { project } = await setupProject(manager, { makeObservations: true })

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir, {
      tracks: false,
      observations: false,
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
      0,
      'Exported GeoJSON has no features'
    )
  })
})

test('Project export tracks GeoJSON to stream', async (t) => {
  const manager = createManager('test', t)
  const { project } = await setupProject(manager, { makeTracks: true })

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir, {
      tracks: true,
      observations: false,
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
      DEFAULT_TRACKS + DEFAULT_TRACKS * OBSERVATIONS_PER_TRACK,
      'Exported GeoJSON has expected number of features'
    )
  })
})

test('Project export ignore tracks', async (t) => {
  const manager = createManager('test', t)
  const { project } = await setupProject(manager, { makeTracks: true })

  await temporaryDirectoryTask(async (dir) => {
    const geoJSONFile = await project.exportGeoJSONFile(dir, {
      tracks: false,
      observations: false,
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
      0,
      'Exported GeoJSON has no features'
    )
  })
})

test('Project export tracks and observations GeoJSON to file', async (t) => {
  const manager = createManager('test', t)
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

test('Project export tracks and observations to zip stream', async (t) => {
  const manager = createManager('test', t)
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
    const entries = Object.keys(await zip.entries())

    const geoJSONFile = entries.find((name) => name.endsWith('.geojson'))

    assert(geoJSONFile, 'Zip file contains geojson file')

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

    assert.equal(entries.length, 2, 'Zip has geoJSON and one attachment')

    const hasPng = entries.some((name) => name.endsWith('.png'))
    assert(hasPng, 'Zip has exported PNG')
  })
})

test('Async project and export tracks and observations to zip stream', async (t) => {
  const managers = await createManagers(2, t)
  const [invitor, invitee] = managers
  const disconnectPeers = connectPeers(managers)
  t.after(disconnectPeers)

  const { project: invitorProject, projectId } = await setupProject(invitor, {
    makeTracks: true,
    makeObservations: true,
    makeAttachments: true,
  })

  await invite({
    invitor,
    invitees: [invitee],
    projectId,
  })

  const project = await invitee.getProject(projectId)

  project.$sync.start({ autostopDataSyncAfter: 10_000 })

  invitorProject.$sync.start({ autostopDataSyncAfter: 10_000 })

  await waitForSync([invitorProject, project], 'full')

  await temporaryDirectoryTask(async (dir) => {
    const zipFile = await project.exportZipFile(dir, {
      tracks: true,
      observations: true,
      attachments: true,
    })
    const zip = new StreamZip.async({ file: zipFile })
    const entries = Object.keys(await zip.entries())

    const geoJSONFile = entries.find((name) => name.endsWith('.geojson'))

    assert(geoJSONFile, 'Zip file contains geojson file')

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

    assert.equal(entries.length, 2, 'Zip has geoJSON and one attachment')

    const hasPng = entries.some((name) => name.endsWith('.png'))
    assert(hasPng, 'Zip has exported PNG')
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

/**
 *
 * @param {import('../src/mapeo-manager.js').MapeoManager} manager
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
  const projectId = await manager.createProject({ name: 'Export test' })
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

  return { project, projectId, observations, tracks }
}
