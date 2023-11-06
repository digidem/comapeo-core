import { test } from 'brittle'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { KeyManager } from '@mapeo/crypto'
import RAM from 'random-access-memory'

import { MapeoManager } from '../src/mapeo-manager.js'

const BLOB_FIXTURES_DIR = fileURLToPath(
  new URL('../tests/fixtures/blob-api/', import.meta.url)
)

test('retrieving blobs urls', async (t) => {
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

  await t.exception(async () => {
    await project.$blobs.getUrl({
      ...blobId,
      variant: 'original',
    })
  }, 'getting blob url fails if manager.start() has not been called yet')

  await manager.start()

  const blobUrl = await project.$blobs.getUrl({
    ...blobId,
    variant: 'original',
  })

  t.ok(
    new URL(blobUrl),
    'retrieving url based on media server resolves after starting it'
  )

  await manager.stop()

  await t.exception(async () => {
    await project.$blobs.getUrl({ ...blobId, variant: 'original' })
  }, 'getting url after manager.stop() has been called fails')
})

// TODO: Add icon urls test here
