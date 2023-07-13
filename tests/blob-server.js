// @ts-check
import test from 'brittle'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'
import { BlobServer } from '../lib/blob-server/index.js'
import { inject } from 'light-my-request'

const IMAGE_FIXTURES_PATH = new URL('./fixtures/images', import.meta.url)
  .pathname

const IMAGE_FIXTURES = readdirSync(IMAGE_FIXTURES_PATH)

const SUPPORTED_IMAGE_EXTENSIONS = /** @type {const} */ (['png', 'jpg', 'jpeg'])

test('GET photo returns correct blob payload', async (t) => {
  const { blobStore } = await testenv()

  for (const fixture of IMAGE_FIXTURES) {
    const imagePath = path.resolve(IMAGE_FIXTURES_PATH, fixture)
    const parsedFixture = path.parse(fixture)
    const diskbuf = await readFile(imagePath)

    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: parsedFixture.name,
    })

    const driveId = await blobStore.put(blobId, diskbuf)
    const server = new BlobServer({ blobStore })
    const res = await inject(server.requestHandler.bind(server)).get(
      `${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`
    )

    t.alike(res.rawPayload, diskbuf, 'should be equal')
  }
})

test('GET photo returns inferred content header if metadata is not found', async (t) => {
  const { blobStore } = await testenv()

  for (const fixture of IMAGE_FIXTURES) {
    const imagePath = path.resolve(IMAGE_FIXTURES_PATH, fixture)
    const parsedFixture = path.parse(fixture)
    const diskbuf = await readFile(imagePath)

    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: parsedFixture.name,
    })

    const driveId = await blobStore.put(blobId, diskbuf)
    const server = new BlobServer({ blobStore })
    const res = await inject(server.requestHandler.bind(server)).get(
      `${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`
    )

    const expectedContentHeader =
      getImageMimeType(parsedFixture.ext) || 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo uses mime type from metadata if found', async (t) => {
  const { blobStore } = await testenv()

  for (const fixture of IMAGE_FIXTURES) {
    const imagePath = path.resolve(IMAGE_FIXTURES_PATH, fixture)
    const parsedFixture = path.parse(fixture)
    const diskbuf = await readFile(imagePath)

    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: parsedFixture.name,
    })

    const imageMimeType = getImageMimeType(parsedFixture.ext)
    const metadata = imageMimeType ? { mime: imageMimeType } : undefined

    const driveId = await blobStore.put(blobId, diskbuf, {
      metadata: imageMimeType ? { mime: imageMimeType } : undefined,
    })

    const server = new BlobServer({ blobStore })
    const res = await inject(server.requestHandler.bind(server)).get(
      `${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`
    )

    const expectedContentHeader = metadata
      ? metadata.mime
      : 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

async function testenv(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

function getImageMimeType(extension) {
  if (extension.startsWith('.')) extension = extension.substring(1)

  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
    return null
  }

  return `image/${extension === 'jpg' ? 'jpeg' : extension}`
}
