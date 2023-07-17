// @ts-check
import test from 'brittle'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import fastify from 'fastify'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'
import BlobServerPlugin from '../lib/blob-server/fastify-plugin.js'

test('Plugin handles prefix option properly', async (t) => {
  const { blobStore, data, server } = await testenv()

  const prefix = '/blobs'

  server.register(BlobServerPlugin, { blobStore, prefix })

  for (const { blobId } of data) {
    const res = await server.inject({
      method: 'GET',
      url: `${prefix}/${blobId.driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    t.is(res.statusCode, 200, 'request successful')
  }
})

test('Unsupported blob type and variant params are handled properly', async (t) => {
  const { blobStore, data, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

  for (const { blobId } of data) {
    const unsupportedVariantRes = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/${blobId.type}/foo/${blobId.name}`,
    })

    t.is(unsupportedVariantRes.statusCode, 400)
    t.is(unsupportedVariantRes.json().code, 'FST_ERR_VALIDATION')

    const unsupportedTypeRes = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/foo/${blobId.variant}/${blobId.name}`,
    })

    t.is(unsupportedTypeRes.statusCode, 400)
    t.is(unsupportedTypeRes.json().code, 'FST_ERR_VALIDATION')
  }
})

test('Missing blob name or variant returns 404', async (t) => {
  const { blobStore, data, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

  for (const { blobId } of data) {
    const nameMismatchRes = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/${blobId.type}/${blobId.variant}/foo`,
    })

    t.is(nameMismatchRes.statusCode, 404)

    const variantMismatchRes = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/${blobId.type}/thumbnail/${blobId.name}`,
    })

    t.is(variantMismatchRes.statusCode, 404)
  }
})

test('GET photo returns correct blob payload', async (t) => {
  const { blobStore, data, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    t.alike(res.rawPayload, image.data, 'should be equal')
  }
})

test('GET photo returns inferred content header if metadata is not found', async (t) => {
  const { blobStore, data, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: `/${blobId.driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`,
    })

    const expectedContentHeader =
      getImageMimeType(image.ext) || 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo uses mime type from metadata if found', async (t) => {
  const { blobStore, data, server } = await testenv()

  server.register(BlobServerPlugin, { blobStore })

  for (const { blobId, image } of data) {
    const imageMimeType = getImageMimeType(image.ext)
    const metadata = imageMimeType ? { mime: imageMimeType } : undefined

    const driveId = await blobStore.put(blobId, image.data, {
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
  const data = await populateStore(blobStore)
  const server = fastify()

  return { blobStore, data, coreManager, server }
}

const IMAGE_FIXTURES_PATH = new URL('./fixtures/images', import.meta.url)
  .pathname

const IMAGE_FIXTURES = readdirSync(IMAGE_FIXTURES_PATH)

/**
 * @param {import('../lib/blob-store').BlobStore} blobStore
 */
async function populateStore(blobStore) {
  /** @type {{blobId: import('../lib/types').BlobId, image: {data: Buffer, ext: string}}[]} */
  const data = []

  for (const fixture of IMAGE_FIXTURES) {
    const imagePath = path.resolve(IMAGE_FIXTURES_PATH, fixture)
    const parsedFixture = path.parse(fixture)
    const diskBuffer = await readFile(imagePath)

    const blobIdBase = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: parsedFixture.name,
    })

    const driveId = await blobStore.put(blobIdBase, diskBuffer)

    data.push({
      blobId: { ...blobIdBase, driveId },
      image: { data: diskBuffer, ext: parsedFixture.ext },
    })
  }

  return data
}

function getImageMimeType(extension) {
  if (extension.startsWith('.')) extension = extension.substring(1)

  if (!['png', 'jpg', 'jpeg'].includes(extension)) {
    return null
  }

  return `image/${extension === 'jpg' ? 'jpeg' : extension}`
}
