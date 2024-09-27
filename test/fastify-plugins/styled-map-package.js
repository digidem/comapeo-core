import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'

import { plugin } from '../../src/fastify-plugins/maps/styled-map-package.js'

const NON_EXISTENT_MAP_PATH = new URL(
  '../fixtures/maps/does-not-exist',
  import.meta.url
).pathname

const SMP_FIXTURE_PATH = new URL(
  '../fixtures/styled-map-packages/basic.smp',
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

test('fetches basic resources', async (t) => {
  const prefix = 'smp'

  const server = setup(t, {
    prefix,
    filepath: SMP_FIXTURE_PATH,
  })

  const address = await server.listen()

  const styleJsonResp = await server.inject({
    method: 'GET',
    url: `${address}/${prefix}/style.json`,
  })

  assert(styleJsonResp.statusCode === 200)

  const styleJson = styleJsonResp.json()

  const sourceWithTileUrl = Object.values(styleJson.sources).find(
    /**
     * @param {*} source
     * @returns {source is { tiles: string[] }}
     */
    (source) => {
      return 'tiles' in source && Array.isArray(source.tiles) && source.tiles[0]
    }
  )

  const tileUrl = sourceWithTileUrl?.tiles[0]

  assert(tileUrl)

  const tileResp = await server.inject({
    method: 'GET',
    url: tileUrl.replace('{x}', '0').replace('{y}', '0').replace('{z}', '0'),
  })

  assert(tileResp.statusCode === 200)
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
