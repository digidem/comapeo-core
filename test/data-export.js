import test from 'node:test'
import assert from 'node:assert/strict'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import { makeObservationFeature } from '../src/data-exporter.js'

/**
 * Build a valid observation from the mock-data generator plus the stored-doc
 * fields that {@link makeObservationFeature} reads.
 * @param {object} [overrides]
 * @returns {import('@comapeo/schema').Observation & import('../src/datatype/index.js').DerivedDocFields}
 */
function makeObservation(overrides = {}) {
  const generated = valueOf(generate('observation')[0])
  return {
    ...generated,
    docId: 'obs-1',
    versionId: 'v-1',
    originalVersionId: 'v-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    links: [],
    forks: [],
    deleted: false,
    ...overrides,
  }
}

test('makeObservationFeature returns correct shape', () => {
  const observation = makeObservation({
    lat: 10.5,
    lon: 20.3,
    tags: { name: 'tree', count: 42 },
    presetRef: { docId: 'cat-a', versionId: 'v-1' },
  })

  const feature = makeObservationFeature(observation)

  assert.equal(feature.type, 'Feature')
  assert.equal(feature.properties.$id, observation.docId)
  assert.equal(feature.properties.$createdAt, observation.createdAt)
  assert.equal(feature.properties.$categoryId, 'cat-a')
  assert.equal(feature.properties.name, 'tree')
  assert.equal(feature.properties.count, '42')
  assert.equal(feature.$comapeo, observation)
  assert.ok(
    feature.geometry?.type === 'Point' &&
      feature.geometry.coordinates[0] === 20.3 &&
      feature.geometry.coordinates[1] === 10.5
  )
})

test('makeObservationFeature handles missing presetRef', () => {
  const observation = makeObservation({ presetRef: undefined })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.$categoryId, undefined)
})

test('makeObservationFeature handles null geometry', () => {
  const observation = makeObservation({ lat: undefined, lon: undefined })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.geometry, null)
})

test('makeObservationFeature skips null tag values', () => {
  const observation = makeObservation({ tags: { a: 'present', b: null } })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.a, 'present')
  assert.equal(feature.properties.b, undefined)
})

test('makeObservationFeature serializes array tags as CSV', () => {
  const observation = makeObservation({
    tags: { numbers: [1, 2, 3], words: ['a', 'b'], mixed: [true, 42, 'x'] },
  })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.numbers, '1,2,3')
  assert.equal(feature.properties.words, 'a,b')
  assert.equal(feature.properties.mixed, 'true,42,x')
})

test('makeObservationFeature adds attachment file names', () => {
  const observation = makeObservation()

  const feature = makeObservationFeature(observation, [
    'photo_original.jpg',
    null,
    'drawing_preview.png',
  ])

  assert.equal(feature.properties.attachment_1, 'photo_original.jpg')
  assert.equal(feature.properties.attachment_2, null)
  assert.equal(feature.properties.attachment_3, 'drawing_preview.png')
})

test('makeObservationFeature skips attachments when not provided', () => {
  const observation = makeObservation()

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.attachment_1, undefined)
})

test('makeObservationFeature falls back to metadataCoords', () => {
  const observation = makeObservation({
    lat: undefined,
    lon: undefined,
    metadata: {
      position: {
        coords: { latitude: 33, longitude: 44 },
      },
    },
  })

  const feature = makeObservationFeature(observation)
  assert.deepEqual(feature.geometry, {
    type: 'Point',
    coordinates: [44, 33],
  })
})
