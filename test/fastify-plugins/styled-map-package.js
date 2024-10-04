import test, { describe } from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'

import { plugin } from '../../src/fastify-plugins/maps/styled-map-package.js'

const NON_EXISTENT_MAP_PATH = new URL(
  '../fixtures/maps/does-not-exist',
  import.meta.url
).pathname

const SMP_FIXTURE_PATH = new URL(
  '../fixtures/styled-map-packages/demotiles-maplibre.smp',
  import.meta.url
).pathname

test('decorator', async (t) => {
  const server = setup(t, {
    filepath: SMP_FIXTURE_PATH,
  })

  await server.ready()

  assert(server.hasDecorator('comapeoSmp'), 'decorator is set up')
})

test('decorator methods work when provided valid file', async (t) => {
  const server = setup(t, {
    filepath: SMP_FIXTURE_PATH,
  })

  const address = await server.listen()

  assert(
    await server.comapeoSmp.getStyle(address),
    'getStyle() resolves with valid result'
  )

  assert(
    await server.comapeoSmp.getResource('style.json'),
    'comapeoSmp.getResource() resolves with valid result'
  )
})

test('decorator methods do not work when provided invalid file path', async (t) => {
  const server = setup(t, {
    lazy: true,
    filepath: NON_EXISTENT_MAP_PATH,
  })

  const address = await server.listen()

  await assert.rejects(
    async () => {
      await server.comapeoSmp.getStyle(address)
    },
    /ENOENT: no such file or directory/,
    'comapeoSmp.getStyle() throws due to ENOENT'
  )

  await assert.rejects(
    async () => {
      await server.comapeoSmp.getResource('style.json')
    },
    /ENOENT: no such file or directory/,
    'comapeoSmp.getResource() throws due to ENOENT'
  )
})

test('respects prefix', async (t) => {
  const prefix = 'smp'

  const server = setup(t, {
    prefix,
    filepath: SMP_FIXTURE_PATH,
  })

  const address = await server.listen()

  const badStyleResp = await server.inject({
    method: 'GET',
    url: `${address}/style.json`,
  })

  assert.equal(
    badStyleResp.statusCode,
    404,
    'style request responds with 404 when request URL is missing prefix'
  )

  const goodStyleResp = await server.inject({
    method: 'GET',
    url: `${address}/${prefix}/style.json`,
  })

  assert.equal(
    goodStyleResp.statusCode,
    200,
    'style request with 200 when request URL contains correct prefix'
  )
})

describe('basic resource fetching works', async () => {
  test('no prefix', async (t) => {
    const server = setup(t, {
      filepath: SMP_FIXTURE_PATH,
    })

    await run(server)
  })

  test('using prefix', async (t) => {
    const prefix = 'smp'
    const server = setup(t, {
      prefix,
      filepath: SMP_FIXTURE_PATH,
    })

    await run(server, prefix)
  })

  /**
   * @param {import('fastify').FastifyInstance} server
   * @param {string} [prefix]
   */
  async function run(server, prefix) {
    const address = await server.listen()

    const baseUrl = address + (prefix ? `/${prefix}` : '')

    const styleResp = await server.inject({
      method: 'GET',
      url: `${baseUrl}/style.json`,
    })

    assert.equal(styleResp.statusCode, 200)

    const localTileUrl = getFirstLocalTileUrl(styleResp.json(), address)

    assert(localTileUrl, 'local tile URL exists')
    assert(
      localTileUrl.startsWith(baseUrl),
      'local tile URL uses expected base url'
    )

    const tileResp = await server.inject({
      method: 'GET',
      url: interpolateTileUrl(localTileUrl, { x: 0, y: 0, z: 0 }),
    })

    assert.equal(tileResp.statusCode, 200, 'can fetch tile from local tile URL')
  }
})

/**
 * @param {import('node:test').TestContext} t
 * @param {import('../../src/fastify-plugins/maps/styled-map-package.js').StyledMapPackagePluginOpts} opts
 */
function setup(t, opts) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  server.register(plugin, opts)

  t.after(async () => {
    await server.close()
  })

  return server
}

/**
 * @param {*} styleJson
 * @param {string} address
 * @returns {string | undefined}
 */
function getFirstLocalTileUrl(styleJson, address) {
  for (const source of Object.values(styleJson.sources)) {
    if ('tiles' in source && Array.isArray(source.tiles)) {
      const u = source.tiles.find((/** @type {string} */ url) => {
        return url.startsWith(address)
      })

      if (u) {
        return u
      }
    }
  }
}

/**
 * @param {string} url
 * @param {Object} opts
 * @param {number} opts.x
 * @param {number} opts.y
 * @param {number} opts.z
 * @returns {string}
 */
function interpolateTileUrl(url, opts) {
  return url
    .replace('{x}', opts.x.toString())
    .replace('{y}', opts.y.toString())
    .replace('{z}', opts.z.toString())
}
