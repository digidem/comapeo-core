// @ts-check
import { test } from 'brittle'
import FakeTimers from '@sinonjs/fake-timers'
import { BLOBS_PREFIX, ICONS_PREFIX, MediaServer } from '../src/media-server.js'

const MEDIA_TYPES = /** @type {const} */ ([BLOBS_PREFIX, ICONS_PREFIX])

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
  const clock = FakeTimers.install({ shouldAdvanceTime: true })

  t.teardown(() => clock.uninstall())

  const server = new MediaServer({
    getProject: async () => {
      throw new Error("Shouldn't be calling")
    },
  })

  const exceptionPromise = t.exception(async () => {
    await server.getMediaAddress('blobs')
  }, 'getMediaAddress() throws before start() is called')

  clock.tick(10_000)

  await exceptionPromise

  const startOptsFixtures = [
    {},
    { port: 1234 },
    { port: 4321, host: '0.0.0.0' },
    { host: '0.0.0.0' },
  ]

  for (const startOpts of startOptsFixtures) {
    const exceptionPromiseBlobs = t.exception(async () => {
      await server.getMediaAddress('blobs')
    }, 'getting media address fails if start() has not been called yet')

    clock.tick(10_000)

    await exceptionPromiseBlobs

    const exceptionPromiseIcons = t.exception(async () => {
      await server.getMediaAddress('icons')
    }, 'getting media address fails if start() has not been called yet')

    clock.tick(10_000)

    await exceptionPromiseIcons

    await server.start(startOpts)

    for (const mediaType of MEDIA_TYPES) {
      const address = await server.getMediaAddress(mediaType)

      t.ok(address, 'address is retrievable after starting server')

      const parsedUrl = new URL(address)

      t.ok(
        parsedUrl.pathname.startsWith('/' + mediaType),
        `${mediaType} url starts with '${mediaType}' prefix`
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
      const exceptionPromise = t.exception(async () => {
        await server.getMediaAddress(mediaType)
      }, `getting ${mediaType} media address fails if stop() has been called`)

      clock.tick(10_000)

      await exceptionPromise
    }
  }
})
