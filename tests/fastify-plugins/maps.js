import { test } from 'brittle'
import path from 'node:path'
import Fastify from 'fastify'
import { MockAgent, setGlobalDispatcher } from 'undici'

import {
  DEFAULT_MAPBOX_STYLE_URL,
  plugin as MapServerPlugin,
} from '../../src/fastify-plugins/maps/index.js'
import { plugin as StaticMapsPlugin } from '../../src/fastify-plugins/maps/static-maps.js'
import { plugin as OfflineFallbackMapPlugin } from '../../src/fastify-plugins/maps/offline-fallback-map.js'
import { readFileSync } from 'node:fs'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

const MAP_STYLE_FIXTURES_PATH = new URL(
  '../fixtures/map-style-definitions',
  import.meta.url
).pathname

const MAPEO_FALLBACK_MAP_PATH = new URL(
  '../../node_modules/mapeo-offline-map',
  import.meta.url
).pathname

setupFetchMock()

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

test('mapeoMaps decorator context', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    staticRootDir: MAP_FIXTURES_PATH,
  })

  server.register(MapServerPlugin, { prefix: 'maps' })

  const address = await server.listen()

  t.ok(server.hasDecorator('mapeoMaps'), 'decorator added')

  t.test('mapeoMaps.getStyleJsonUrl()', async (st) => {
    const styleJsonUrl = await server.mapeoMaps.getStyleJsonUrl()
    st.is(styleJsonUrl, new URL('/maps/style.json', address).href)
  })
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
    // Including the `key` query param here to simulate successfully getting an online style.json
    query: `?key=pk.abc-123`,
  })

  t.is(response.statusCode, 200)

  t.is(
    response.json().name,
    // Based on the mapbox-outdoors-v12.json fixture
    'Mapbox Outdoors',
    'gets online style.json'
  )
})

test('defaultOnlineStyleUrl opt works', async (t) => {
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
  server.register(MapServerPlugin, {
    // Note that we're specifying a different option than the default
    defaultOnlineStyleUrl: 'https://api.protomaps.com/styles/v2/dark.json',
  })

  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
    // Including the `key` query param here to simulate successfully getting an online style.json
    query: `?key=abc-123`,
  })

  t.is(response.statusCode, 200)
  t.is(
    response.json().name,
    // Based on the protomaps-dark.v2.json fixture
    'style@2.0.0-alpha.4 theme@dark',
    'gets online style.json'
  )
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
    // Omitting the `key` query param here to simulate not being able to get the online style.json
  })

  t.is(response.json().id, 'blank', 'gets fallback style.json')
  t.is(response.statusCode, 200)
})

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

function setupFetchMock() {
  const mockAgent = new MockAgent({
    keepAliveMaxTimeout: 10,
    keepAliveTimeout: 10,
  })

  mockAgent.disableNetConnect()

  setGlobalDispatcher(mockAgent)

  // Default map style provider (Mapbox)
  {
    const upstreamUrl = new URL(DEFAULT_MAPBOX_STYLE_URL)
    const mockPool = mockAgent.get(upstreamUrl.origin)

    /** @type {any} */
    let cachedStyle = null

    mockPool
      .intercept({
        method: 'GET',
        path: (path) => {
          return path.startsWith(upstreamUrl.pathname)
        },
      })
      .reply((req) => {
        const searchParams = new URL(req.path, req.origin).searchParams

        if (searchParams.has('access_token')) {
          if (!cachedStyle) {
            cachedStyle = readStyleFixture('mapbox-outdoors-v12.json')
          }

          return {
            statusCode: 200,
            responseOptions: {
              headers: {
                'Content-Type': 'application/json;charset=UTF-8',
              },
            },
            data: cachedStyle,
          }
        } else {
          return { statusCode: 401, data: { message: 'Unauthorized' } }
        }
      })
      .persist()
  }

  // Some alternative map style provider (Protomaps)
  {
    const upstreamUrl = new URL('https://api.protomaps.com/styles/v2/dark.json')

    const mockPool = mockAgent.get(upstreamUrl.origin)

    /** @type {any} */
    let cachedStyle = null

    mockPool
      .intercept({
        method: 'GET',
        path: (path) => {
          return path.startsWith(upstreamUrl.pathname)
        },
      })
      .reply((req) => {
        const searchParams = new URL(req.path, req.origin).searchParams

        if (searchParams.has('key')) {
          if (!cachedStyle) {
            cachedStyle = readStyleFixture('protomaps-dark-v2.json')
          }

          return {
            statusCode: 200,
            responseOptions: {
              headers: {
                'Content-Type': 'text/plain;charset=UTF-8',
              },
            },
            data: cachedStyle,
          }
        } else {
          return { statusCode: 403, data: { message: 'Forbidden' } }
        }
      })
      .persist()
  }
}

/**
 * @param {string} name
 */
function readStyleFixture(name) {
  return JSON.parse(
    readFileSync(path.join(MAP_STYLE_FIXTURES_PATH, name), 'utf-8')
  )
}
