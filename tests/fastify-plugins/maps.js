import { test } from 'brittle'
import Fastify from 'fastify'

import { plugin as MapsPlugin } from '../../src/fastify-plugins/maps/index.js'
import { plugin as StaticMapsPlugin } from '../../src/fastify-plugins/maps/static-maps.js'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

test('fails to register when dependent plugins are not registered', async (t) => {
  const server = setup(t)

  await t.exception(async () => {
    await server.register(MapsPlugin)
  }, 'fails to register if dependencies are not registered')
})

test('prefix opt is handled correctly', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    staticRootDir: MAP_FIXTURES_PATH,
  })

  server.register(MapsPlugin, { prefix: 'maps' })

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

// TODO: Add similar tests/fixtures for proxied online style and offline fallback style
test('/style.json resolves style.json of local "default" static map when available', async (t) => {
  const server = setup(t)

  server.register(StaticMapsPlugin, {
    prefix: 'static',
    staticRootDir: MAP_FIXTURES_PATH,
  })
  server.register(MapsPlugin)

  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/style.json',
  })

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
