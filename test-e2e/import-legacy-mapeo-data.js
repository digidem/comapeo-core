import Fastify from 'fastify'
import assert from 'node:assert/strict'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { request } from 'undici'
import { createManager } from './utils.js'

const FIXTURE_PATH = fileURLToPath(
  new URL('../test/fixtures/legacy-mapeo-data.mlef', import.meta.url)
)

/**
 * @param {Array<unknown>} a
 * @param {Array<unknown>} b
 * @returns {boolean}
 */
const arraysMatch = (a, b) =>
  a.length === b.length &&
  a.every((value, index) => valuesMatch(value, b[index]))

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
const isRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
const valuesMatch = (a, b) =>
  a === b ||
  (Array.isArray(a) && Array.isArray(b) && arraysMatch(a, b)) ||
  (isRecord(a) && isRecord(b) && objectsMatch(a, b))

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {boolean}
 */
const objectsMatch = (a, b) =>
  Object.entries(b).every(([key, bValue]) => valuesMatch(a[key], bValue))

test('imports legacy Mapeo data', async (t) => {
  const fastify = Fastify()
  const mapeoManager = createManager('test', t, { fastify })

  await fastify.listen()
  t.after(() => fastify.close())

  const projectId = await mapeoManager.createProject({ name: 'test project' })
  const project = await mapeoManager.getProject(projectId)
  t.after(() => project.close())

  await project.$importLegacyMapeoData(FIXTURE_PATH)

  const observations = await project.observation.getMany()

  assert.strictEqual(
    observations.length,
    4,
    'expected 4 observations to be imported'
  )

  for (const observation of observations) {
    assert(
      observation.migrationMetadata?.originalDocument,
      'expected original doc to be saved'
    )
    assert(
      observation.migrationMetadata?.hypercore,
      'expected hypercore data be saved'
    )
  }

  const observationWithAttachments = observations.find((observation) =>
    objectsMatch(observation, {
      lat: -34.5819587,
      lon: -58.5067392,
      tags: {
        place: 'village',
        categoryId: 'community',
      },
      metadata: {
        position: {
          timestamp: new Date(1718823274077).toISOString(),
          coords: {
            altitude: 34.4,
            heading: 0,
            altitudeAccuracy: 20.899999618530273,
            latitude: -34.5819587,
            speed: 0.001650038524530828,
            longitude: -58.5067392,
            accuracy: 3.9000000953674316,
          },
        },
        positionProvider: {
          gpsAvailable: true,
          passiveAvailable: true,
          locationServicesEnabled: true,
          networkAvailable: true,
        },
      },
    })
  )
  assert(observationWithAttachments, 'expected village observation to be found')
  assert.equal(
    observationWithAttachments.attachments.length,
    1,
    'expected 1 attachment'
  )
  const [attachment] = observationWithAttachments.attachments
  assert(attachment)
  const attachmentUrl = await project.$blobs.getUrl({
    ...attachment,
    driveId: attachment.driveDiscoveryId,
    type: 'photo',
    variant: 'original',
  })
  const attachmentResponse = await request(attachmentUrl, { reset: true })
  assert.equal(attachmentResponse.statusCode, 200)

  const versionedObservation = observations.find((observation) =>
    objectsMatch(observation, {
      lon: -58.5067235,
      lat: -34.5819385,
      attachments: [],
      tags: {
        type: 'craft',
        craft: 'clay',
        categoryId: 'clay',
        notes: 'Nada de verdas posta, pero esta vez de verdas',
      },
      metadata: {
        position: {
          timestamp: new Date(1718822620160).toISOString(),
          coords: {
            altitude: 42.80000305175781,
            heading: 220.94805908203125,
            altitudeAccuracy: 2.857691764831543,
            latitude: -34.5819385,
            speed: 0.4037386178970337,
            longitude: -58.5067235,
            accuracy: 5.980000019073486,
          },
        },
        positionProvider: {
          gpsAvailable: true,
          passiveAvailable: true,
          locationServicesEnabled: true,
          networkAvailable: true,
        },
      },
    })
  )
  assert(versionedObservation, 'expected versioned observation to be found')

  assert.equal(
    versionedObservation.links.length,
    1,
    'expected versioned observation to have 1 parent'
  )
  const [previousVersionId1] = versionedObservation.links
  assert(previousVersionId1)
  const previousVersion1 = await project.observation.getByVersionId(
    previousVersionId1
  )
  assert.equal(previousVersion1.tags.notes, 'Nada de verdas posta')

  assert.equal(
    previousVersion1.links.length,
    1,
    'expected versioned observation to have 1 grandparent'
  )
  const [previousVersionId2] = previousVersion1.links
  assert(previousVersionId2)
  const previousVersion2 = await project.observation.getByVersionId(
    previousVersionId2
  )
  assert.equal(previousVersion2.tags.notes, 'Nada')
  assert.equal(previousVersion2.links.length, 0, 'has no great-grandparents')
})
