import { test } from 'brittle'
import path from 'node:path'
import Fastify from 'fastify'
import { MockAgent, setGlobalDispatcher } from 'undici'

import {
  UPSTREAM_MAP_STYLE_URL,
  plugin as MapServerPlugin,
} from '../../src/fastify-plugins/maps/index.js'
import { plugin as StaticMapsPlugin } from '../../src/fastify-plugins/maps/static-maps.js'
import { plugin as OfflineFallbackMapPlugin } from '../../src/fastify-plugins/maps/offline-fallback-map.js'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

const MAPEO_FALLBACK_MAP_PATH = new URL(
  '../../node_modules/mapeo-offline-map',
  import.meta.url
).pathname

setupFetch()

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

test('/style.json resolves online style.json when local static is not available', async (t) => {
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
    // Including the access_token query param here to simulate successfully getting an online style.json
    query: `?access_token=pk.abc-123`,
  })

  t.is(response.statusCode, 200)
  t.is(response.json().name, 'Mapbox Streets', 'gets online style.json')
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
    // Omitting the access_token query param here to simulate not being able to get the online style.json
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

function setupFetch() {
  const mockAgent = new MockAgent({
    keepAliveMaxTimeout: 10,
    keepAliveTimeout: 10,
  })

  mockAgent.disableNetConnect()

  setGlobalDispatcher(mockAgent)

  const upstreamUrlObj = new URL(UPSTREAM_MAP_STYLE_URL)

  const mockPool = mockAgent.get(upstreamUrlObj.origin)

  mockPool
    .intercept({
      method: 'GET',
      path: (path) => {
        return path.startsWith(upstreamUrlObj.pathname)
      },
    })
    .reply(
      // @ts-expect-error
      (req) => {
        const searchParams = new URL(req.path, req.origin).searchParams

        // Return a very basic (valid) style spec if there's any access token param specified at all
        return searchParams.has('access_token')
          ? {
              statusCode: 200,
              data: {
                version: 8,
                name: 'Mapbox Streets', // Technically an optional property
                sources: {
                  'mapbox-streets': {
                    type: 'vector',
                    url: 'mapbox://mapbox.mapbox-streets-v6',
                  },
                },
                layers: [
                  {
                    id: 'water',
                    source: 'mapbox-streets',
                    'source-layer': 'water',
                    type: 'fill',
                    paint: {
                      'fill-color': '#00ffff',
                    },
                  },
                ],
              },
            }
          : { statusCode: 401, data: { message: 'Unauthorized' } }
      }
    )
    .persist()
}
