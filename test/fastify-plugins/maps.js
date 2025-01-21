import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import Fastify from 'fastify'
import { Reader } from 'styled-map-package'
import { MockAgent, setGlobalDispatcher } from 'undici'

import {
  CUSTOM_MAP_PREFIX,
  FALLBACK_MAP_PREFIX,
  plugin as MapServerPlugin,
} from '../../src/fastify-plugins/maps.js'
import {
  DEFAULT_FALLBACK_MAP_FILE_PATH,
  DEFAULT_ONLINE_STYLE_URL,
} from '../../src/mapeo-manager.js'

const SAMPLE_SMP_FIXTURE_PATH = new URL(
  '../fixtures/maps/maplibre-demotiles.smp',
  import.meta.url
).pathname

const mockAgent = setupFetchMock()

test('prefix opt is handled correctly', async (t) => {
  const server = setup(t)

  setupMockIntercepts(t, DEFAULT_ONLINE_STYLE_URL)

  const prefix = 'maps'

  server.register(MapServerPlugin, {
    prefix,
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  {
    const response = await server.inject({
      method: 'GET',
      url: '/style.json',
    })

    assert.equal(response.statusCode, 404, 'endpoint missing at root prefix')
  }

  {
    const response = await server.inject({
      method: 'GET',
      url: `/${prefix}/style.json`,
    })

    assert.equal(response.statusCode, 302, 'endpoint exists with prefix')
  }
})

test('/style.json resolves style.json of custom map when available', async (t) => {
  const server = setup(t)

  const smpReader = new Reader(SAMPLE_SMP_FIXTURE_PATH)

  t.after(async () => {
    await smpReader.close()
  })

  server.register(MapServerPlugin, {
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    customMapPath: SAMPLE_SMP_FIXTURE_PATH,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const styleResponse = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  assert.equal(
    styleResponse.statusCode,
    302,
    'style response uses redirect status code'
  )

  assert.equal(
    styleResponse.headers['cache-control'],
    'no-cache',
    'style response disables caching'
  )

  assert.equal(
    styleResponse.headers['access-control-allow-origin'],
    '*',
    'style response enables CORS'
  )

  const location = styleResponse.headers['location']

  assert.equal(
    location,
    `${address}/${CUSTOM_MAP_PREFIX}/style.json`,
    'location header matches style.json endpoint for custom map'
  )

  const customStyleResponse = await server.inject({
    method: 'GET',
    url: location,
  })

  assert.equal(customStyleResponse.statusCode, 200)

  const expectedCustomStyleJson = await smpReader.getStyle(
    server.listeningOrigin + `/${CUSTOM_MAP_PREFIX}`
  )

  assert.deepEqual(
    customStyleResponse.json(),
    expectedCustomStyleJson,
    'matches custom map style json'
  )
})

test('/style.json resolves online style.json when custom is not available', async (t) => {
  const server = setup(t)

  setupMockIntercepts(t, DEFAULT_ONLINE_STYLE_URL)

  server.register(MapServerPlugin, {
    // Not necessary to specify but just to be explicit for the purpose of the test
    customMapPath: undefined,
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  assert.equal(
    response.statusCode,
    302,
    'style response uses redirect status code'
  )

  assert.equal(
    response.headers['cache-control'],
    'no-cache',
    'style response disables caching'
  )

  assert.equal(
    response.headers['access-control-allow-origin'],
    '*',
    'style response enables CORS'
  )

  assert.equal(
    response.headers['location'],
    DEFAULT_ONLINE_STYLE_URL,
    'location header matches specified default online style url'
  )
})

test('/style.json resolves style.json of fallback map when custom and online are not available', async (t) => {
  const server = setup(t)

  const smpReader = new Reader(DEFAULT_FALLBACK_MAP_FILE_PATH)

  t.after(async () => {
    await smpReader.close()
  })

  server.register(MapServerPlugin, {
    // Not necessary to specify but just to be explicit for the purpose of the test
    customMapPath: undefined,
    // Note that we're specifying a garbage url
    defaultOnlineStyleUrl: 'https://foobar.com/does/not/exist/style.json',
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const styleResponse = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

  assert.equal(
    styleResponse.statusCode,
    302,
    'style response uses redirect status code'
  )

  assert.equal(
    styleResponse.headers['cache-control'],
    'no-cache',
    'style response disables caching'
  )

  assert.equal(
    styleResponse.headers['access-control-allow-origin'],
    '*',
    'style response enables CORS'
  )

  const location = styleResponse.headers['location']

  assert.equal(
    location,
    `${address}/${FALLBACK_MAP_PREFIX}/style.json`,
    'location header matches style.json endpoint for fallback map'
  )

  const fallbackStyleResponse = await server.inject({
    method: 'GET',
    url: location,
  })

  assert.equal(fallbackStyleResponse.statusCode, 200)

  const expectedFallbackStyleJson = await smpReader.getStyle(
    server.listeningOrigin + `/${FALLBACK_MAP_PREFIX}`
  )

  assert.deepEqual(
    fallbackStyleResponse.json(),
    expectedFallbackStyleJson,
    'matches fallback map style json'
  )
})

test('custom map info endpoint not available when custom map path not provided', async (t) => {
  const server = setup(t)

  server.register(MapServerPlugin, {
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const response = await server.inject({
    method: 'GET',
    url: `/${CUSTOM_MAP_PREFIX}/info`,
  })

  assert.equal(response.statusCode, 404)
})

test('custom map info endpoint returns not found error when custom map does not exist', async (t) => {
  const server = setup(t)

  const nonExistentFile =
    path.parse(SAMPLE_SMP_FIXTURE_PATH).dir + '/does/not/exist.smp'

  server.register(MapServerPlugin, {
    customMapPath: nonExistentFile,
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const response = await server.inject({
    method: 'GET',
    url: `/${CUSTOM_MAP_PREFIX}/info`,
  })

  assert.equal(response.statusCode, 404)
  assert.match(response.json().error, /Not Found/)
})

test('custom map info endpoint returns server error when custom map is invalid', async (t) => {
  const server = setup(t)

  const invalidFile = new URL(import.meta.url).pathname

  server.register(MapServerPlugin, {
    customMapPath: invalidFile,
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const response = await server.inject({
    method: 'GET',
    url: `/${CUSTOM_MAP_PREFIX}/info`,
  })

  assert.equal(response.statusCode, 500)
  assert.match(response.json().error, /Internal Server Error/)
})

test('custom map info endpoint returns expected info when valid custom map is available', async (t) => {
  const server = setup(t)

  const smpStats = await fs.stat(SAMPLE_SMP_FIXTURE_PATH)

  server.register(MapServerPlugin, {
    customMapPath: SAMPLE_SMP_FIXTURE_PATH,
    defaultOnlineStyleUrl: DEFAULT_ONLINE_STYLE_URL,
    fallbackMapPath: DEFAULT_FALLBACK_MAP_FILE_PATH,
  })

  const address = await server.listen()

  mockAgent.enableNetConnect(new URL(address).host)

  const response = await server.inject({
    method: 'GET',
    url: `/${CUSTOM_MAP_PREFIX}/info`,
  })

  assert.equal(response.statusCode, 200)

  const info = response.json()

  assert.deepEqual(info, {
    created: smpStats.ctime.toISOString(),
    size: smpStats.size,
    name: 'MapLibre',
  })
})

/**
 * @param {import('node:test').TestContext} t
 */
function setup(t) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  t.after(async () => {
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

  return mockAgent
}

/**
 * @param {import('node:test').TestContext} t
 * @param {string} url
 */
function setupMockIntercepts(t, url) {
  const mockPool = mockAgent.get(new URL(url).origin)

  t.after(async () => {
    await mockPool.close()
  })

  mockPool
    .intercept({
      method: 'HEAD',
      path: (path) => {
        return path.startsWith(new URL(url).pathname)
      },
    })
    .reply(() => {
      return { statusCode: 200 }
    })

  return mockPool
}
