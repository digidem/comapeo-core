import test from 'node:test'
import assert from 'node:assert/strict'
import { generate } from '@mapeo/mock-data'
import { valueOf } from '@comapeo/schema'
import {
  makeObservationFeature,
  makeTrackFeature,
} from '../src/data-exporter.js'

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
  const observation = makeObservation({
    lat: undefined,
    lon: undefined,
    metadata: undefined,
  })

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

  const feature = makeObservationFeature(observation, {
    attachmentNames: ['photo_original.jpg', null, 'drawing_preview.png'],
  })

  assert.equal(feature.properties.attachment_1, 'photo_original.jpg')
  assert.equal(feature.properties.attachment_2, null)
  assert.equal(feature.properties.attachment_3, 'drawing_preview.png')
})

test('makeObservationFeature adds $category from categoryName', () => {
  const observation = makeObservation({
    presetRef: { docId: 'cat-a', versionId: 'v-1' },
  })

  const feature = makeObservationFeature(observation, {
    categoryName: 'Trees',
  })

  assert.equal(feature.properties.$categoryId, 'cat-a')
  assert.equal(feature.properties.$category, 'Trees')
})

test('makeObservationFeature adds $author from authorName', () => {
  const observation = makeObservation({ createdBy: 'device-abc' })

  const feature = makeObservationFeature(observation, {
    authorName: 'Alice',
  })

  assert.equal(feature.properties.$authorId, 'device-abc')
  assert.equal(feature.properties.$author, 'Alice')
})

test('makeObservationFeature omits $category when categoryName not provided', () => {
  const observation = makeObservation({
    presetRef: { docId: 'cat-a', versionId: 'v-1' },
  })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.$categoryId, 'cat-a')
  assert.equal(feature.properties.$category, undefined)
})

test('makeObservationFeature omits $author when authorName not provided', () => {
  const observation = makeObservation({ createdBy: 'device-abc' })

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.$authorId, 'device-abc')
  assert.equal(feature.properties.$author, undefined)
})

test('makeObservationFeature skips attachments when not provided', () => {
  const observation = makeObservation()

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.attachment_1, undefined)
})

/**
 * Build a valid track from the mock-data generator plus the stored-doc fields
 * that {@link makeTrackFeature} reads.
 * @param {object} [overrides]
 * @returns {import('@comapeo/schema').Track & import('../src/datatype/index.js').DerivedDocFields}
 */
function makeTrack(overrides = {}) {
  const generated = valueOf(generate('track')[0])
  return {
    ...generated,
    docId: 'track-1',
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

test('makeTrackFeature returns correct shape', () => {
  const track = makeTrack({
    locations: [
      { coords: { latitude: 10.5, longitude: 20.3, altitude: 100 } },
      { coords: { latitude: 11.0, longitude: 21.0 } },
    ],
    tags: { name: 'hike', distance: 5 },
    presetRef: { docId: 'cat-b', versionId: 'v-2' },
  })

  const feature = makeTrackFeature(track)

  assert.equal(feature.type, 'Feature')
  assert.equal(feature.properties.$id, track.docId)
  assert.equal(feature.properties.$createdAt, track.createdAt)
  assert.equal(feature.properties.$updatedAt, track.updatedAt)
  assert.equal(feature.properties.$categoryId, 'cat-b')
  assert.equal(feature.properties.name, 'hike')
  assert.equal(feature.properties.distance, '5')
  assert.equal(feature.$comapeo, track)
  assert.equal(feature.geometry?.type, 'LineString')
  assert.deepStrictEqual(feature.geometry?.coordinates[0], [20.3, 10.5, 100])
  assert.deepStrictEqual(feature.geometry?.coordinates[1], [21.0, 11.0])
})

test('makeTrackFeature adds $category from categoryName', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0 } }],
    presetRef: { docId: 'cat-x', versionId: 'v-1' },
  })

  const feature = makeTrackFeature(track, { categoryName: 'Trails' })

  assert.equal(feature.properties.$categoryId, 'cat-x')
  assert.equal(feature.properties.$category, 'Trails')
})

test('makeTrackFeature adds $author from authorName', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0 } }],
    createdBy: 'device-xyz',
  })

  const feature = makeTrackFeature(track, { authorName: 'Bob' })

  assert.equal(feature.properties.$authorId, 'device-xyz')
  assert.equal(feature.properties.$author, 'Bob')
})

test('makeTrackFeature omits $category when categoryName not provided', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0 } }],
    presetRef: { docId: 'cat-x', versionId: 'v-1' },
  })

  const feature = makeTrackFeature(track)
  assert.equal(feature.properties.$categoryId, 'cat-x')
  assert.equal(feature.properties.$category, undefined)
})

test('makeTrackFeature omits $author when authorName not provided', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0 } }],
    createdBy: 'device-xyz',
  })

  const feature = makeTrackFeature(track)
  assert.equal(feature.properties.$authorId, 'device-xyz')
  assert.equal(feature.properties.$author, undefined)
})

test('makeTrackFeature handles missing presetRef', () => {
  const track = makeTrack({ presetRef: undefined })

  const feature = makeTrackFeature(track)
  assert.equal(feature.properties.$categoryId, undefined)
})

test('makeTrackFeature handles empty locations', () => {
  const track = makeTrack({ locations: [] })

  const feature = makeTrackFeature(track)
  assert.equal(feature.geometry?.type, 'LineString')
  assert.deepStrictEqual(feature.geometry?.coordinates, [])
})

test('makeTrackFeature skips null tag values', () => {
  const track = makeTrack({ tags: { a: 'present', b: null } })

  const feature = makeTrackFeature(track)
  assert.equal(feature.properties.a, 'present')
  assert.equal(feature.properties.b, undefined)
})

test('makeTrackFeature serializes array tags as CSV', () => {
  const track = makeTrack({
    tags: { stops: [1, 2, 3], names: ['a', 'b'] },
  })

  const feature = makeTrackFeature(track)
  assert.equal(feature.properties.stops, '1,2,3')
  assert.equal(feature.properties.names, 'a,b')
})

test('makeTrackFeature includes altitude when present', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0, altitude: 500 } }],
  })

  const feature = makeTrackFeature(track)
  assert.deepStrictEqual(feature.geometry?.coordinates[0], [0, 0, 500])
})

test('makeTrackFeature omits altitude when not a number', () => {
  const track = makeTrack({
    locations: [{ coords: { latitude: 0, longitude: 0, altitude: undefined } }],
  })

  const feature = makeTrackFeature(track)
  assert.deepStrictEqual(feature.geometry?.coordinates[0], [0, 0])
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
