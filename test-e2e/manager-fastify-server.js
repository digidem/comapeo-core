import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'crypto'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { KeyManager } from '@mapeo/crypto'
import FakeTimers from '@sinonjs/fake-timers'
import { Agent, fetch as uFetch } from 'undici'
import fs from 'fs/promises'
import RAM from 'random-access-memory'
import Fastify from 'fastify'

import { MapeoManager } from '../src/mapeo-manager.js'
import { FastifyController } from '../src/fastify-controller.js'
import { blobMetadata } from '../test/helpers/blob-store.js'

const BLOB_FIXTURES_DIR = fileURLToPath(
  new URL('../test/fixtures/blob-api/', import.meta.url)
)

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('start/stop lifecycle', async () => {
  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  // Manager should await for the server to start internally
  fastifyController.start()

  const project = await manager.getProject(await manager.createProject())

  const blobUrl1 = await project.$blobs.getUrl({
    driveId: randomBytes(32).toString('hex'),
    name: randomBytes(8).toString('hex'),
    type: 'photo',
    variant: 'original',
  })
  const response1 = await fetch(blobUrl1)
  assert.equal(response1.status, 404, 'server started and listening')

  const blobUrl2 = await project.$blobs.getUrl({
    driveId: randomBytes(32).toString('hex'),
    name: randomBytes(8).toString('hex'),
    type: 'video',
    variant: 'original',
  })
  assert.equal(
    new URL(blobUrl1).port,
    new URL(blobUrl2).port,
    'server port is the same'
  )

  await fastifyController.stop()

  await assert.rejects(async () => {
    await fetch(blobUrl2)
  }, 'failed to fetch due to connection error')

  // Manager should await for the server to start internally
  fastifyController.start()

  const blobUrl3 = await project.$blobs.getUrl({
    driveId: randomBytes(32).toString('hex'),
    name: randomBytes(8).toString('hex'),
    type: 'audio',
    variant: 'original',
  })
  const response3 = await fetch(blobUrl3)
  assert.equal(response3.status, 404, 'server started and listening')

  await fastifyController.stop()

  await assert.rejects(async () => {
    await fetch(blobUrl3)
  }, 'failed to fetch due to connection error')
})

test('retrieving blobs using url', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  const project = await manager.getProject(await manager.createProject())

  const exceptionPromise1 = assert.rejects(async () => {
    await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })
  }, 'getting blob url fails if fastifyController.start() has not been called yet')

  clock.tick(100_000)
  await exceptionPromise1

  // Manager should await for the server to start internally
  fastifyController.start()

  await t.test('blob does not exist', async () => {
    const blobUrl = await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })

    assert(
      new URL(blobUrl),
      'retrieving url based on HTTP server resolves after starting it'
    )

    const response = await fetch(blobUrl)

    assert.equal(response.status, 404, 'response is 404')
  })

  await t.test('blob exists', async () => {
    const blobId = await project.$blobs.create(
      { original: join(BLOB_FIXTURES_DIR, 'original.png') },
      blobMetadata({ mimeType: 'image/png' })
    )

    const blobUrl = await project.$blobs.getUrl({
      ...blobId,
      variant: 'original',
    })

    assert(
      new URL(blobUrl),
      'retrieving url based on HTTP server resolves after starting it'
    )

    const response = await fetch(blobUrl)

    assert.equal(response.status, 200, 'response status ok')
    assert.equal(
      response.headers.get('content-type'),
      'image/png',
      'matching content type header'
    )

    const expected = await fs.readFile(join(BLOB_FIXTURES_DIR, 'original.png'))
    const body = Buffer.from(await response.arrayBuffer())

    assert.deepEqual(body, expected, 'matching reponse body')
  })

  await fastifyController.stop()

  const exceptionPromise2 = assert.rejects(async () => {
    await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })
  }, 'getting url after fastifyController.stop() has been called fails')
  clock.tick(100_000)
  await exceptionPromise2
})

test('retrieving icons using url', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  const project = await manager.getProject(await manager.createProject())

  const exceptionPromise1 = assert.rejects(async () => {
    await project.$icons.getIconUrl(randomBytes(32).toString('hex'), {
      mimeType: 'image/png',
      pixelDensity: 1,
      size: 'small',
    })
  }, 'getting icon url fails if fastifyController.start() has not been called yet')

  clock.tick(100_000)
  await exceptionPromise1

  await fastifyController.start()

  await t.test('icon does not exist', async () => {
    const nonExistentIconId = randomBytes(32).toString('hex')

    const iconUrl = await project.$icons.getIconUrl(nonExistentIconId, {
      size: 'small',
      mimeType: 'image/png',
      pixelDensity: 1,
    })

    assert(
      new URL(iconUrl),
      'retrieving url based on HTTP server resolves after starting it'
    )

    const response = await fetch(iconUrl)

    assert.equal(response.status, 404, 'response is 404')
  })

  await t.test('icon exists', async () => {
    const iconBuffer = randomBytes(128)

    const { docId: iconId } = await project.$icons.create({
      name: 'foo',
      variants: [
        {
          blob: iconBuffer,
          mimeType: 'image/png',
          pixelDensity: 1,
          size: 'small',
        },
      ],
    })

    const iconUrl = await project.$icons.getIconUrl(iconId, {
      size: 'small',
      mimeType: 'image/png',
      pixelDensity: 1,
    })

    assert(
      new URL(iconUrl),
      'retrieving url based on HTTP server resolves after starting it'
    )

    const response = await fetch(iconUrl)

    assert.equal(response.status, 200, 'response status ok')
    assert.equal(
      response.headers.get('content-type'),
      'image/png',
      'matching content type header'
    )
    const body = Buffer.from(await response.arrayBuffer())
    assert.deepEqual(body, iconBuffer, 'matching response body')
  })

  await fastifyController.stop()

  const exceptionPromise2 = assert.rejects(async () => {
    await project.$icons.getIconUrl(randomBytes(32).toString('hex'), {
      mimeType: 'image/png',
      pixelDensity: 1,
      size: 'small',
    })
  }, 'getting url after fastifyController.stop() has been called fails')
  clock.tick(100_000)
  await exceptionPromise2
})

test('retrieving audio file', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  const project = await manager.getProject(await manager.createProject())

  // Manager should await for the server to start internally
  fastifyController.start()
  await t.test('creating audio', async () => {
    const blobId = await project.$blobs.create(
      { original: join(BLOB_FIXTURES_DIR, 'audio.mp3') },
      blobMetadata({ mimeType: 'audio/mp3' })
    )
    const blobUrl = await project.$blobs.getUrl({
      ...blobId,
      variant: 'original',
    })
    assert(
      new URL(blobUrl),
      'retrieving url based on HTTP server resolves after starting it'
    )

    const response = await fetch(blobUrl)

    assert.equal(response.status, 200, 'response status ok')
    assert.equal(
      response.headers.get('content-type'),
      'audio/mp3',
      'matching content type header'
    )
    const expected = await fs.readFile(join(BLOB_FIXTURES_DIR, 'audio.mp3'))
    const body = Buffer.from(await response.arrayBuffer())
    assert.deepEqual(body, expected, 'matching reponse body')
  })

  await fastifyController.stop()
  clock.tick(100_000)
})

test('retrieving style.json using stable url', { only: true }, async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.after(() => clock.uninstall())

  const fastify = Fastify()

  const fastifyController = new FastifyController({ fastify })
  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
    fastify,
  })

  const exceptionPromise1 = assert.rejects(async () => {
    await manager.getMapStyleJsonUrl()
  }, 'cannot retrieve style json url before HTTP server starts')

  clock.tick(100_000)
  await exceptionPromise1

  fastifyController.start({ port: 1234 })

  const styleJsonUrl = await manager.getMapStyleJsonUrl()

  assert(new URL(styleJsonUrl))

  const response = await fetch(styleJsonUrl)

  assert.equal(response.status, 200, 'expected response')

  await fastifyController.stop()

  const exceptionPromise2 = assert.rejects(async () => {
    await manager.getMapStyleJsonUrl()
  }, 'cannot retrieve style json url after HTTP server closes')

  clock.tick(100_000)
  await exceptionPromise2
})

/**
 * @param {Parameters<typeof uFetch>} args
 */
async function fetch(...args) {
  return uFetch(args[0], {
    ...args[1],
    // Prevents tests from hanging caused by Undici's default behavior
    dispatcher: new Agent({
      keepAliveMaxTimeout: 10,
      keepAliveTimeout: 10,
    }),
  })
}
