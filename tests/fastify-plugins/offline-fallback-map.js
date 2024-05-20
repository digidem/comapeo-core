import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'

import { plugin as OfflineFallbackMapPlugin } from '../../src/fastify-plugins/maps/offline-fallback-map.js'

const MAPEO_FALLBACK_MAP_PATH = new URL(
  '../../node_modules/mapeo-offline-map',
  import.meta.url
).pathname

test('decorator', async (t) => {
  const server = setup(t)
  await server.ready()
  assert(server.hasDecorator('mapeoFallbackMap'), 'decorator is set up')
})

test('/style.json', async (t) => {
  const server = setup(t)
  const address = await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  assert.equal(response.statusCode, 200)

  const styleJson = response.json()

  assert.deepEqual(
    styleJson.sources,
    {
      'boundaries-source': {
        type: 'geojson',
        data: `${address}/boundaries.json`,
      },
      'graticule-source': {
        type: 'geojson',
        data: `${address}/graticule.json`,
      },
      'lakes-source': {
        type: 'geojson',
        data: `${address}/lakes.json`,
      },
      'land-source': {
        type: 'geojson',
        data: `${address}/land.json`,
      },
      'rivers-source': {
        type: 'geojson',
        data: `${address}/rivers.json`,
      },
    },
    'expected `sources` field in response body'
  )

  for (const [sourceName, { data }] of Object.entries(styleJson.sources)) {
    const response = await server.inject({
      method: 'GET',
      url: data,
    })

    assert.equal(response.statusCode, 200, `can reach ${sourceName}`)
  }
})

/**
 * @param {import('node:test').TestContext} t
 */
function setup(t) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  server.register(OfflineFallbackMapPlugin, {
    styleJsonPath: path.join(MAPEO_FALLBACK_MAP_PATH, 'style.json'),
    sourcesDir: path.join(MAPEO_FALLBACK_MAP_PATH, 'dist'),
  })

  t.after(async () => {
    await server.close()
  })

  return server
}
