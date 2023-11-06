// @ts-check
import { test } from 'brittle'

import {
  MEDIA_SERVER_BLOBS_PREFIX,
  MEDIA_SERVER_ICONS_PREFIX,
  MediaServer,
} from '../src/media-server.js'

const MEDIA_TYPES = /** @type {const} */ ([
  MEDIA_SERVER_BLOBS_PREFIX,
  MEDIA_SERVER_ICONS_PREFIX,
])

test('lifecycle', async (t) => {
  const server = new MediaServer({
    getProject: async () => {
      throw new Error("Shouldn't be calling")
    },
  })

  const startOptsFixtures = [
    {},
    { port: 1234 },
    { port: 4321, host: '0.0.0.0' },
    { host: '0.0.0.0' },
  ]

  for (const opts of startOptsFixtures) {
    await server.start(opts)
    await server.start(opts)
    await server.stop()
    await server.stop()

    server.start(opts)
    await server.started()
    await server.started()
    await server.stop()

    t.pass('server lifecycle works with valid opts')
  }
})

test('getMediaAddress()', async (t) => {
  const server = new MediaServer({
    getProject: async () => {
      throw new Error("Shouldn't be calling")
    },
  })

  t.exception(async () => {
    await server.getMediaAddress('blobs')
  }, 'getMediaAddress() throws before start() is called')

  const startOptsFixtures = [
    {},
    { port: 1234 },
    { port: 4321, host: '0.0.0.0' },
    { host: '0.0.0.0' },
  ]

  await Promise.all(
    startOptsFixtures.map(async (startOpts) => {
      await t.exception(async () => {
        await server.getMediaAddress('blobs')
      }, 'getting media address fails if start() has not been called yet')

      await t.exception(async () => {
        await server.getMediaAddress('icons')
      }, 'getting media address fails if start() has not been called yet')

      await server.start(startOpts)

      for (const mediaType of MEDIA_TYPES) {
        const address = await server.getMediaAddress(mediaType)

        t.ok(address, 'address is retrievable after starting server')

        const parsedUrl = new URL(address)

        const mediaPrefix =
          mediaType === 'blobs'
            ? MEDIA_SERVER_BLOBS_PREFIX
            : MEDIA_SERVER_ICONS_PREFIX

        t.ok(
          parsedUrl.pathname.startsWith('/' + mediaPrefix),
          'blob url starts with blobs prefix'
        )

        t.is(parsedUrl.protocol, 'http:', 'url uses http protocol')

        const expectedHostname = startOpts.host || '127.0.0.1'

        t.is(parsedUrl.hostname, expectedHostname, 'expected hostname')

        if (typeof startOpts.port === 'number') {
          t.is(
            parsedUrl.port,
            startOpts.port.toString(),
            'port matches value specified when calling start()'
          )
        } else {
          t.ok(
            !isNaN(parseInt(parsedUrl.port, 10)),
            'port automatically assigned when not specified in start()'
          )
        }
      }

      await server.stop()

      for (const mediaType of MEDIA_TYPES) {
        await t.exception(async () => {
          await server.getMediaAddress(mediaType)
        }, `getting ${mediaType} media address fails if stop() has been called`)
      }
    })
  )
})
