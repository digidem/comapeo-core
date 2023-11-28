import { test } from 'brittle'
import { randomBytes } from 'crypto'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { KeyManager } from '@mapeo/crypto'
import FakeTimers from '@sinonjs/fake-timers'
import { Agent, fetch as uFetch } from 'undici'
import fs from 'fs/promises'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/mapeo-manager.js'

const BLOB_FIXTURES_DIR = fileURLToPath(
  new URL('../tests/fixtures/blob-api/', import.meta.url)
)

const projectMigrationsFolder = new URL('../drizzle/project', import.meta.url)
  .pathname
const clientMigrationsFolder = new URL('../drizzle/client', import.meta.url)
  .pathname

test('retrieving blobs using url', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const project = await manager.getProject(await manager.createProject())

  const exceptionPromise1 = t.exception(async () => {
    await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })
  }, 'getting blob url fails if manager.start() has not been called yet')

  clock.tick(100_000)
  await exceptionPromise1

  await manager.start()

  await t.test('blob does not exist', async (st) => {
    const blobUrl = await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })

    st.ok(
      new URL(blobUrl),
      'retrieving url based on media server resolves after starting it'
    )

    const response = await fetch(blobUrl)

    st.is(response.status, 404, 'response is 404')
  })

  await t.test('blob exists', async (st) => {
    const blobId = await project.$blobs.create(
      { original: join(BLOB_FIXTURES_DIR, 'original.png') },
      { mimeType: 'image/png' }
    )

    const blobUrl = await project.$blobs.getUrl({
      ...blobId,
      variant: 'original',
    })

    st.ok(
      new URL(blobUrl),
      'retrieving url based on media server resolves after starting it'
    )

    const response = await fetch(blobUrl)

    st.is(response.status, 200, 'response status ok')
    st.is(
      response.headers.get('content-type'),
      'image/png',
      'matching content type header'
    )

    const expected = await fs.readFile(join(BLOB_FIXTURES_DIR, 'original.png'))
    const body = Buffer.from(await response.arrayBuffer())

    st.alike(body, expected, 'matching reponse body')
  })

  await manager.stop()

  const exceptionPromise2 = t.exception(async () => {
    await project.$blobs.getUrl({
      driveId: randomBytes(32).toString('hex'),
      name: 'foo',
      type: 'photo',
      variant: 'original',
    })
  }, 'getting url after manager.stop() has been called fails')
  clock.tick(100_000)
  await exceptionPromise2
})

test('retrieving icons using url', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    projectMigrationsFolder,
    clientMigrationsFolder,
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const project = await manager.getProject(await manager.createProject())

  const exceptionPromise1 = t.exception(async () => {
    await project.$icons.getIconUrl(randomBytes(32).toString('hex'), {
      mimeType: 'image/png',
      pixelDensity: 1,
      size: 'small',
    })
  }, 'getting icon url fails if manager.start() has not been called yet')

  clock.tick(100_000)
  await exceptionPromise1

  await manager.start()

  await t.test('icon does not exist', async (st) => {
    const nonExistentIconId = randomBytes(32).toString('hex')

    const iconUrl = await project.$icons.getIconUrl(nonExistentIconId, {
      size: 'small',
      mimeType: 'image/png',
      pixelDensity: 1,
    })

    st.ok(
      new URL(iconUrl),
      'retrieving url based on media server resolves after starting it'
    )

    const response = await fetch(iconUrl)

    st.is(response.status, 404, 'response is 404')
  })

  await t.test('icon exists', async (st) => {
    const iconBuffer = randomBytes(128)

    const iconId = await project.$icons.create({
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

    st.ok(
      new URL(iconUrl),
      'retrieving url based on media server resolves after starting it'
    )

    const response = await fetch(iconUrl)

    st.is(response.status, 200, 'response status ok')
    st.is(
      response.headers.get('content-type'),
      'image/png',
      'matching content type header'
    )
    const body = Buffer.from(await response.arrayBuffer())
    st.alike(body, iconBuffer, 'matching response body')
  })

  await manager.stop()

  const exceptionPromise2 = t.exception(async () => {
    await project.$icons.getIconUrl(randomBytes(32).toString('hex'), {
      mimeType: 'image/png',
      pixelDensity: 1,
      size: 'small',
    })
  }, 'getting url after manager.stop() has been called fails')
  clock.tick(100_000)
  await exceptionPromise2
})

/**
 * @param {string} url
 */
async function fetch(url) {
  return uFetch(url, {
    // Noticed that the process was hanging (on Node 18, at least) after calling manager.stop() further below
    // Probably related to https://github.com/nodejs/undici/issues/2348
    // Adding the below seems to fix it
    dispatcher: new Agent({ keepAliveMaxTimeout: 100 }),
  })
}
