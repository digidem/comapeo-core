// @ts-check
import test, { solo } from 'brittle'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import Fastify from 'fastify'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'
import BlobServerPlugin from '../lib/blob-server/fastify-plugin.js'

const IMAGE_FIXTURES_PATH = new URL('./fixtures/images', import.meta.url)
  .pathname

const IMAGE_FIXTURES = readdirSync(IMAGE_FIXTURES_PATH)

const SUPPORTED_IMAGE_EXTENSIONS = /** @type {const} */ (['png', 'jpg', 'jpeg'])

test('Plugin handles prefix option properly', async (t) => {
  const { blobStore, server } = await testenv()

  const prefix = '/blobs'

  server.register(BlobServerPlugin, { blobStore, prefix })

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

    const res = await server.inject({
      method: 'GET',
      url: `${prefix}/${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    t.is(res.statusCode, 200, 'request successful')
  }
})

solo(
  'Unsupported blob type and variant params are handled properly',
  async (t) => {
    const { blobStore, server } = await testenv()

    server.register(BlobServerPlugin, { blobStore })

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

      const unsupportedVariantRes = await server.inject({
        method: 'GET',
        url: `/${driveId}/${blobId.type}/foo/${blobId.name}`,
      })

      t.is(unsupportedVariantRes.statusCode, 400)
      t.is(unsupportedVariantRes.json().code, 'FST_ERR_VALIDATION')

      const unsupportedTypeRes = await server.inject({
        method: 'GET',
        url: `/${driveId}/foo/${blobId.variant}/${blobId.name}`,
      })

      t.is(unsupportedTypeRes.statusCode, 400)
      t.is(unsupportedTypeRes.json().code, 'FST_ERR_VALIDATION')
    }
  }
)

test('GET photo returns correct blob payload', async (t) => {
  const { blobStore, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

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

    const res = await server.inject({
      method: 'GET',
      url: `/${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    t.alike(res.rawPayload, diskbuf, 'should be equal')
  }
})

test('GET photo returns inferred content header if metadata is not found', async (t) => {
  const { blobStore, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

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

    const res = await server.inject({
      method: 'GET',
      url: `/${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    const expectedContentHeader =
      getImageMimeType(parsedFixture.ext) || 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo uses mime type from metadata if found', async (t) => {
  const { blobStore, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

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

    const res = await server.inject({
      method: 'GET',
      url: `/${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    const expectedContentHeader = metadata
      ? metadata.mime
      : 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

async function testenv(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  const server = Fastify()

  return { blobStore, coreManager, server }
}

function getImageMimeType(extension) {
  if (extension.startsWith('.')) extension = extension.substring(1)

  if (!SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
    return null
  }

  return `image/${extension === 'jpg' ? 'jpeg' : extension}`
}
