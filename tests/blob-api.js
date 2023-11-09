// @ts-check
import { join } from 'node:path'
import * as fs from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'url'
import test from 'brittle'
import { BlobApi } from '../src/blob-api.js'
import { projectKeyToPublicId } from '../src/utils.js'

import { createBlobStore } from './helpers/blob-store.js'

test('create blobs', async (t) => {
  const { blobStore } = createBlobStore()

  const blobApi = new BlobApi({
    projectPublicId: projectKeyToPublicId(randomBytes(32)),
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
    { mimeType: 'image/png' }
  )

  t.is(attachment.driveId, blobStore.writerDriveId)
  t.is(attachment.type, 'photo')
  t.alike(attachment.hash, hash.digest('hex'))
})

test('get url from blobId', async (t) => {
  const projectPublicId = projectKeyToPublicId(randomBytes(32))
  const type = 'photo'
  const variant = 'original'
  const name = '1234'

  const { blobStore } = createBlobStore()

  let port = 8080
  /** @type {string | undefined} */
  let prefix = undefined

  const blobApi = new BlobApi({
    projectPublicId,
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

    t.is(
      url,
      `http://127.0.0.1:${port}/${projectPublicId}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
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

    t.is(
      url,
      `http://127.0.0.1:${port}/${projectPublicId}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
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

    t.is(
      url,
      `http://127.0.0.1:${port}/${prefix}/${projectPublicId}/${blobStore.writerDriveId}/${type}/${variant}/${name}`
    )
  }
})
