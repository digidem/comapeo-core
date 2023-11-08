import { test } from 'brittle'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { KeyManager } from '@mapeo/crypto'
import FakeTimers from '@sinonjs/fake-timers'
import { Agent, fetch } from 'undici'
import fs from 'fs/promises'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/mapeo-manager.js'

const BLOB_FIXTURES_DIR = fileURLToPath(
  new URL('../tests/fixtures/blob-api/', import.meta.url)
)

test('retrieving blobs urls', async (t) => {
  const clock = FakeTimers.install({ shouldAdvanceTime: true })
  t.teardown(() => clock.uninstall())

  const manager = new MapeoManager({
    rootKey: KeyManager.generateRootKey(),
    dbFolder: ':memory:',
    coreStorage: () => new RAM(),
  })

  const project = await manager.getProject(await manager.createProject())

  const blobId = await project.$blobs.create(
    {
      original: join(BLOB_FIXTURES_DIR, 'original.png'),
    },
    { mimeType: 'image/png' }
  )

  const exceptionPromise1 = t.exception(async () => {
    await project.$blobs.getUrl({
      ...blobId,
      variant: 'original',
    })
  }, 'getting blob url fails if manager.start() has not been called yet')

  clock.tick(100_000)
  await exceptionPromise1

  await manager.start()

  const blobUrl = await project.$blobs.getUrl({
    ...blobId,
    variant: 'original',
  })

  t.ok(
    new URL(blobUrl),
    'retrieving url based on media server resolves after starting it'
  )

  const response = await fetch(blobUrl, {
    // Noticed that the process was hanging (on Node 18, at least) after calling manager.stop() further below
    // Probably related to https://github.com/nodejs/undici/issues/2348
    // Adding the below seems to fix it
    dispatcher: new Agent({ keepAliveMaxTimeout: 100 }),
  })

  t.is(response.status, 200)
  t.is(response.headers.get('content-type'), 'image/png')
  const expected = await fs.readFile(join(BLOB_FIXTURES_DIR, 'original.png'))
  const body = Buffer.from(await response.arrayBuffer())
  t.alike(body, expected)

  await manager.stop()

  const exceptionPromise2 = t.exception(async () => {
    await project.$blobs.getUrl({ ...blobId, variant: 'original' })
  }, 'getting url after manager.stop() has been called fails')
  clock.tick(100_000)
  await exceptionPromise2
})

// TODO: Add icon urls test here
