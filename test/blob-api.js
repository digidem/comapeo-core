import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import * as fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'url'
import { BlobApi } from '../src/blob-api.js'

import { createBlobStore, blobMetadata } from './helpers/blob-store.js'

test('create blobs', async () => {
  const { blobStore } = createBlobStore()

  const blobApi = new BlobApi({
    blobStore,
    getMediaBaseUrl: async () => 'http://127.0.0.1:8080/blobs',
  })

  const directory = fileURLToPath(
    new URL('./fixtures/blob-api/', import.meta.url)
  )

  const hash = createHash('sha256')
  const originalContent = await fs.readFile(join(directory, 'original.png'))

  hash.update(originalContent)

  const attachment = await blobApi.create(
    {
      original: join(directory, 'original.png'),
      preview: join(directory, 'preview.png'),
      thumbnail: join(directory, 'thumbnail.png'),
    },
    blobMetadata({ mimeType: 'image/png' })
  )

  assert.equal(attachment.driveId, blobStore.writerDriveId)
  assert.equal(attachment.type, 'photo')
  assert.deepEqual(attachment.hash, hash.digest('hex'))
})

test('get url from blobId', async () => {
  const type = 'photo'
  const variant = 'original'
  const name = '1234'

  const { blobStore } = createBlobStore()

  let port = 8080
  /** @type {string | undefined} */
  let prefix = undefined

  const blobApi = new BlobApi({
    blobStore,
    getMediaBaseUrl: async () => `http://127.0.0.1:${port}/${prefix || ''}`,
  })

  {
    const url = await blobApi.getUrl({
      driveId: blobStore.writerDriveId,
      type,
      variant,
      name,
    })

    assert.equal(
      url,
      `http://127.0.0.1:${port}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
    )
  }

  // Change port
  port = 1234

  {
    const url = await blobApi.getUrl({
      driveId: blobStore.writerDriveId,
      type,
      variant,
      name,
    })

    assert.equal(
      url,
      `http://127.0.0.1:${port}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
    )
  }

  // Change prefix (this isn't usually dynamic but valid to test)
  prefix = 'blobs'

  {
    const url = await blobApi.getUrl({
      driveId: blobStore.writerDriveId,
      type,
      variant,
      name,
    })

    assert.equal(
      url,
      `http://127.0.0.1:${port}/${prefix}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
    )
  }
})

test('get blob metadata', async () => {
  const variant = 'original'

  const { blobStore } = createBlobStore()

  const blobApi = new BlobApi({
    blobStore,
    getMediaBaseUrl: async () => 'http://127.0.0.1:8080/blobs',
  })

  const directory = fileURLToPath(
    new URL('./fixtures/blob-api/', import.meta.url)
  )

  const attachment = await blobApi.create(
    {
      original: join(directory, 'original.png'),
      preview: join(directory, 'preview.png'),
      thumbnail: join(directory, 'thumbnail.png'),
    },
    blobMetadata({ mimeType: 'image/example' })
  )

  const metadata = await blobApi.getMetadata({ ...attachment, variant })

  assert.ok(metadata)

  assert.equal(metadata.mimeType, 'image/example')
})
