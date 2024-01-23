import { test } from 'brittle'
import path from 'node:path'
import Fastify from 'fastify'

import { plugin as MapServerPlugin } from '../../src/fastify-plugins/maps/index.js'
import { plugin as StaticMapsPlugin } from '../../src/fastify-plugins/maps/static-maps.js'
import { plugin as OfflineFallbackMapPlugin } from '../../src/fastify-plugins/maps/offline-fallback-map.js'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

const MAPEO_FALLBACK_MAP_PATH = new URL(
  '../../node_modules/mapeo-offline-map',
  import.meta.url
).pathname

test('fails to register when dependent plugins are not registered', async (t) => {
  const server = setup(t)

  await t.exception(async () => {
    await server.register(MapServerPlugin)
  }, 'fails to register if dependencies are not registered')
})

test('prefix opt is handled correctly', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    staticRootDir: MAP_FIXTURES_PATH,
  })
  server.register(OfflineFallbackMapPlugin, {
    prefix: 'fallback',
    styleJsonPath: path.join(MAPEO_FALLBACK_MAP_PATH, 'style.json'),
    sourcesDir: path.join(MAPEO_FALLBACK_MAP_PATH, 'dist'),
  })

  server.register(MapServerPlugin, { prefix: 'maps' })

  await server.listen()

  {
    const response = await server.inject({
      method: 'GET',
      url: '/style.json',
    })

    t.is(response.statusCode, 404, 'endpoint missing at root prefix')
  }

  {
    // TODO: Use inject approach when necessary fixtures are set up
    t.ok(
      server.hasRoute({
        method: 'GET',
        url: '/maps/style.json',
      }),
      'endpoint found at specified prefix'
    )
  }
})

test('/style.json resolves style.json of local "default" static map when available', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    staticRootDir: MAP_FIXTURES_PATH,
  })
  server.register(OfflineFallbackMapPlugin, {
    prefix: 'fallback',
    styleJsonPath: path.join(MAPEO_FALLBACK_MAP_PATH, 'style.json'),
    sourcesDir: path.join(MAPEO_FALLBACK_MAP_PATH, 'dist'),
  })
  server.register(MapServerPlugin)

  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  t.is(response.statusCode, 200)
})

test('/style.json resolves style.json of offline fallback map when static and online are not available', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    // Need to choose a directory that doesn't have any map fixtures
    staticRootDir: path.resolve(MAP_FIXTURES_PATH, '../does-not-exist'),
  })
  server.register(OfflineFallbackMapPlugin, {
    prefix: 'fallback',
    styleJsonPath: path.join(MAPEO_FALLBACK_MAP_PATH, 'style.json'),
    sourcesDir: path.join(MAPEO_FALLBACK_MAP_PATH, 'dist'),
  })
  server.register(MapServerPlugin)

  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  t.is(response.json().id, 'blank', 'gets fallback style.json')
  t.is(response.statusCode, 200)
})

// TODO: add test for proxying online map style.json

/**
 * @param {import('brittle').TestInstance} t
 */
function setup(t) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  t.teardown(async () => {
    await server.close()
  })

  return server
}
