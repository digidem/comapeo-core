import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import Fastify from 'fastify'

import { plugin } from '../../src/fastify-plugins/maps/static-maps.js'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

test('decorator', async (t) => {
  const server = setup(t)
  await server.ready()
  assert(server.hasDecorator('mapeoStaticMaps'), 'decorator is set up')
})

test('list map styles', async (t) => {
  const server = setup(t)
  const address = await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/',
  })

  assert.equal(response.statusCode, 200)

  const data = response.json()

  assert.deepEqual(
    data,
    [
      {
        id: 'default',
        name: 'Satellite',
        styleUrl: `${address}/default/style.json`,
      },
      {
        id: 'streets-sat-style',
        name: 'Mapbox Satellite Streets',
        styleUrl: `${address}/streets-sat-style/style.json`,
      },
    ],
    'data has expected shape'
  )
})

test('get style.json', async (t) => {
  const server = setup(t)
  const address = await server.listen()
  const styleIds = fs.readdirSync(MAP_FIXTURES_PATH)

  await Promise.all(
    styleIds.map(async (styleId) => {
      const rawStyleJson = fs.readFileSync(
        path.join(MAP_FIXTURES_PATH, styleId, 'style.json'),
        'utf-8'
      )

      const response = await server.inject({
        method: 'GET',
        url: `/${styleId}/style.json`,
      })

      assert.equal(response.statusCode, 200)

      const data = response.json()

      assert.deepEqual(
        data,
        JSON.parse(rawStyleJson.replace(/\{host\}/gm, `${address}/${styleId}`)),
        'response data is correct'
      )
    })
  )
})

test('get sprite.json', async (t) => {
  const server = setup(t)
  await server.listen()

  const styleIds = fs.readdirSync(MAP_FIXTURES_PATH)

  await Promise.all(
    styleIds.map(async (styleId) => {
      const expectedJson = JSON.parse(
        fs.readFileSync(
          path.join(MAP_FIXTURES_PATH, styleId, 'sprites', 'sprite.json'),
          'utf-8'
        )
      )

      const response = await server.inject({
        method: 'GET',
        url: `/${styleId}/sprites/sprite.json`,
      })

      assert.equal(response.statusCode, 200)
      assert.deepEqual(response.json(), expectedJson)
    })
  )
})

test('get tile (image)', async (t) => {
  const server = setup(t)
  await server.listen()

  const styleIds = fs.readdirSync(MAP_FIXTURES_PATH)

  for (const styleId of styleIds) {
    await t.test('non-existing tile', async () => {
      // With extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/0/0/0.png`,
        })

        assert.equal(response.statusCode, 404)
      }

      // Without extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/0/0/0`,
        })

        assert.equal(response.statusCode, 404)
      }
    })

    await t.test('non-existing tile id', async () => {
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/foo.bar/6/10/24.png`,
        })

        assert.equal(response.statusCode, 404)
      }
    })

    await t.test('existing tile', async () => {
      // With extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/6/10/24.png`,
        })

        assert.equal(response.statusCode, 200)
        assert.equal(
          response.headers['content-type'],
          'image/png',
          'content type correct'
        )
        assert.equal(
          getContentLength(response.headers),
          21014,
          'correct content length'
        )
      }

      // Without extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/6/10/24`,
        })

        assert.equal(response.statusCode, 200)
        assert.equal(
          response.headers['content-type'],
          'image/png',
          'content type correct'
        )
        assert.equal(
          getContentLength(response.headers),
          21014,
          'correct content length'
        )
      }
    })
  }
})

test('get tile (pbf)', async (t) => {
  const server = setup(t)
  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/streets-sat-style/tiles/mapbox.mapbox-streets-v7/12/656/1582.vector.pbf',
  })

  assert.equal(response.statusCode, 200)

  assert.equal(
    response.headers['content-type'],
    'application/x-protobuf',
    'content type correct'
  )

  assert.equal(getContentLength(response.headers), 49229, 'correct file length')
})

test('get font pbf', async (t) => {
  const server = setup(t)
  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/streets-sat-style/fonts/DIN Offc Pro Bold,Arial Unicode MS Bold/0-255.pbf',
  })

  assert.equal(response.statusCode, 200)

  assert.equal(
    response.headers['content-type'],
    'application/x-protobuf',
    'content type correct'
  )

  assert.equal(getContentLength(response.headers), 75287, 'correct file length')
})

/**
 * @param {import('node:test').TestContext} t
 */
function setup(t) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  server.register(plugin, { staticRootDir: MAP_FIXTURES_PATH })

  t.after(async () => {
    await server.close()
  })

  return server
}

/**
 * @param {import('node:http').OutgoingHttpHeaders} headers
 * @returns {number | undefined}
 */
function getContentLength(headers) {
  const contentLength = headers['content-length']

  if (Array.isArray(contentLength))
    throw new Error('Cannot parse content-length header')
  if (typeof contentLength === 'number') return contentLength
  if (typeof contentLength === 'string') return parseInt(contentLength, 10)
  return contentLength
}
