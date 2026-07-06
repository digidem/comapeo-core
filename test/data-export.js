import test from 'node:test'
import assert from 'node:assert/strict'
import { makeObservationFeature } from '../src/data-exporter.js'

test('makeObservationFeature returns correct shape', () => {
  const observation = {
    docId: 'obs-1',
    createdAt: '2024-01-01T00:00:00Z',
    lat: 10.5,
    lon: 20.3,
    tags: { name: 'tree', count: 42 },
    presetRef: { docId: 'cat-a' },
    metadata: { position: { coords: { altitude: 100 } } },
  }

  const feature = makeObservationFeature(observation)

  assert.equal(feature.type, 'Feature')
  assert.equal(feature.properties.$id, 'obs-1')
  assert.equal(feature.properties.$createdAt, '2024-01-01T00:00:00Z')
  assert.equal(feature.properties.$categoryId, 'cat-a')
  assert.equal(feature.properties.name, 'tree')
  assert.equal(feature.properties.count, '42') // tags serialized as strings
  assert.equal(feature.$comapeo, observation)
  assert.deepEqual(feature.geometry, {
    type: 'Point',
    coordinates: [20.3, 10.5, 100],
  })
})

test('makeObservationFeature handles missing presetRef', () => {
  const observation = {
    docId: 'obs-2',
    createdAt: '2024-02-01T00:00:00Z',
    lat: 0,
    lon: 0,
    tags: {},
  }

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.$categoryId, undefined)
})

test('makeObservationFeature handles null geometry', () => {
  const observation = {
    docId: 'obs-3',
    createdAt: '2024-03-01T00:00:00Z',
    tags: {},
  }

  const feature = makeObservationFeature(observation)
  assert.equal(feature.geometry, null)
})

test('makeObservationFeature skips null tag values', () => {
  const observation = {
    docId: 'obs-4',
    createdAt: '2024-04-01T00:00:00Z',
    tags: { a: 'present', b: null },
  }

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.a, 'present')
  assert.equal(feature.properties.b, undefined)
})

test('makeObservationFeature serializes array tags as CSV', () => {
  const observation = {
    docId: 'obs-6',
    createdAt: '2024-06-01T00:00:00Z',
    tags: { numbers: [1, 2, 3], words: ['a', 'b'], mixed: [true, 42, 'x'] },
  }

  const feature = makeObservationFeature(observation)
  assert.equal(feature.properties.numbers, '1,2,3')
  assert.equal(feature.properties.words, 'a,b')
  assert.equal(feature.properties.mixed, 'true,42,x')
})

test('makeObservationFeature falls back to metadataCoords', () => {
  const observation = {
    docId: 'obs-5',
    createdAt: '2024-05-01T00:00:00Z',
    tags: {},
    metadata: {
      position: { coords: { latitude: 33, longitude: 44 } },
    },
  }

  const feature = makeObservationFeature(observation)
  assert.deepEqual(feature.geometry, {
    type: 'Point',
    coordinates: [44, 33],
  })
})
