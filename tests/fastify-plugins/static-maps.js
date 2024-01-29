import fs from 'node:fs'
import path from 'node:path'
import { test } from 'brittle'
import Fastify from 'fastify'

import { plugin } from '../../src/fastify-plugins/maps/static-maps.js'

const MAP_FIXTURES_PATH = new URL('../fixtures/maps', import.meta.url).pathname

test('decorator', async (t) => {
  const server = setup(t)
  await server.ready()
  t.ok(server.hasDecorator('mapeoStaticMaps'), 'decorator is set up')
})

test('list map styles', async (t) => {
  const server = setup(t)
  const address = await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/',
  })

  t.is(response.statusCode, 200)

  const data = response.json()

  t.is(data.length, 2, 'data has expected number of items')
  t.alike(
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

      t.is(response.statusCode, 200)

      const data = response.json()

      t.not(
        data,
        JSON.parse(rawStyleJson),
        'response data is different from raw style file content'
      )
      t.alike(
        data,
        JSON.parse(rawStyleJson.replace(/\{host\}/gm, `${address}/${styleId}`)),
        'response data has correct'
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

      t.is(response.statusCode, 200)
      t.alike(response.json(), expectedJson)
    })
  )
})

test('get tile (image)', async (t) => {
  const server = setup(t)
  await server.listen()

  const styleIds = fs.readdirSync(MAP_FIXTURES_PATH)

  for (const styleId of styleIds) {
    t.test('non-existing tile', async (st) => {
      // With extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/0/0/0.png`,
        })

        st.is(response.statusCode, 404)
      }

      // Without extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/0/0/0`,
        })

        st.is(response.statusCode, 404)
      }
    })

    t.test('non-existing tile id', async (st) => {
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/foo.bar/6/10/24.png`,
        })

        st.is(response.statusCode, 404)
      }
    })

    t.test('existing tile', async (st) => {
      // With extension
      {
        const response = await server.inject({
          method: 'GET',
          url: `/${styleId}/tiles/mapbox.satellite/6/10/24.png`,
        })

        st.is(response.statusCode, 200)
        st.is(
          response.headers['content-type'],
          'image/png',
          'content type correct'
        )
        st.is(
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

        st.is(response.statusCode, 200)
        st.is(
          response.headers['content-type'],
          'image/png',
          'content type correct'
        )
        st.is(
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

  t.is(response.statusCode, 200)

  t.is(
    response.headers['content-type'],
    'application/x-protobuf',
    'content type correct'
  )

  t.is(response.headers['content-encoding'], 'gzip', 'gzip encoding enabled')
  t.is(getContentLength(response.headers), 49229, 'correct file length')
})

test('get font pbf', async (t) => {
  const server = setup(t)
  await server.listen()

  const response = await server.inject({
    method: 'GET',
    url: '/streets-sat-style/fonts/DIN Offc Pro Bold,Arial Unicode MS Bold/0-255.pbf',
  })

  t.is(response.statusCode, 200)

  t.is(
    response.headers['content-type'],
    'application/x-protobuf',
    'content type correct'
  )

  t.is(getContentLength(response.headers), 75287, 'correct file length')
})

/**
 * @param {import('brittle').TestInstance} t
 */
function setup(t) {
  const server = Fastify({ logger: false, forceCloseConnections: true })

  server.register(plugin, { staticRootDir: MAP_FIXTURES_PATH })

  t.teardown(async () => {
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
