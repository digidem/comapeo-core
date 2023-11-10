// @ts-check
import { randomBytes } from 'node:crypto'
import test from 'brittle'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import fastify from 'fastify'

import { BlobStore } from '../../src/blob-store/index.js'
import BlobServerPlugin from '../../src/fastify-plugins/blobs.js'
import { projectKeyToPublicId } from '../../src/utils.js'
import { replicateBlobs } from '../helpers/blob-store.js'
import { createCoreManager, waitForCores } from '../helpers/core-manager.js'

test('Plugin throws error if missing getBlobStore option', async (t) => {
  const server = fastify()
  await t.exception(() => server.register(BlobServerPlugin))
})

test('Plugin handles prefix option properly', async (t) => {
  const prefix = '/blobs'
  const { data, server, projectPublicId } = await setup({ prefix })

  for (const { blobId } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        prefix,
        projectPublicId,
      }),
    })

    t.is(res.statusCode, 200, 'request successful')
  }
})

test('Unsupported blob type and variant params are handled properly', async (t) => {
  const { data, server, projectPublicId } = await setup()

  for (const { blobId } of data) {
    const unsupportedVariantRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        variant: 'foo',
      }),
    })

    t.is(unsupportedVariantRes.statusCode, 400)
    t.is(unsupportedVariantRes.json().code, 'FST_ERR_VALIDATION')

    const unsupportedTypeRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        type: 'foo',
      }),
    })

    t.is(unsupportedTypeRes.statusCode, 400)
    t.is(unsupportedTypeRes.json().code, 'FST_ERR_VALIDATION')
  }
})

test('Invalid variant-type combination returns error', async (t) => {
  const { server, projectPublicId } = await setup()

  const url = buildRouteUrl({
    projectPublicId,
    driveId: Buffer.alloc(32).toString('hex'),
    name: 'foo',
    type: 'video',
    variant: 'thumbnail',
  })

  const response = await server.inject({ method: 'GET', url })

  t.is(response.statusCode, 400)
  t.ok(response.json().message.startsWith('Unsupported variant'))
})

test('Incorrect project public id returns 404', async (t) => {
  const { data, server } = await setup()

  const incorrectProjectPublicId = projectKeyToPublicId(randomBytes(32))

  for (const { blobId } of data) {
    const incorrectProjectPublicIdRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId: incorrectProjectPublicId,
      }),
    })

    t.is(incorrectProjectPublicIdRes.statusCode, 404)
  }
})

test('Incorrectly formatted project public id returns 400', async (t) => {
  const { data, server } = await setup()

  const hexString = randomBytes(32).toString('hex')

  for (const { blobId } of data) {
    const incorrectProjectPublicIdRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId: hexString,
      }),
    })

    t.is(incorrectProjectPublicIdRes.statusCode, 400)
  }
})

test('Missing blob name or variant returns 404', async (t) => {
  const { data, server, projectPublicId } = await setup()

  for (const { blobId } of data) {
    const nameMismatchRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        name: 'foo',
      }),
    })

    t.is(nameMismatchRes.statusCode, 404)

    const variantMismatchRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        variant: 'thumbnail',
      }),
    })

    t.is(variantMismatchRes.statusCode, 404)
  }
})

test('GET photo returns correct blob payload', async (t) => {
  const { data, server, projectPublicId } = await setup()

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
      }),
    })

    t.alike(res.rawPayload, image.data, 'should be equal')
  }
})

test('GET photo returns inferred content header if metadata is not found', async (t) => {
  const { data, server, projectPublicId } = await setup()

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
      }),
    })

    const expectedContentHeader =
      getImageMimeType(image.ext) || 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo uses mime type from metadata if found', async (t) => {
  const { data, server, projectPublicId, blobStore } = await setup()

  for (const { blobId, image } of data) {
    const imageMimeType = getImageMimeType(image.ext)
    const metadata = imageMimeType ? { mimeType: imageMimeType } : undefined

    const driveId = await blobStore.put(blobId, image.data, {
      metadata: imageMimeType ? { mimeType: imageMimeType } : undefined,
    })

    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        driveId,
      }),
    })

    const expectedContentHeader = metadata
      ? metadata.mimeType
      : 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo returns 404 when trying to get non-replicated blob', async (t) => {
  const projectKey = randomBytes(32)

  const {
    data,
    projectPublicId,
    coreManager: cm1,
  } = await setup({ projectKey })

  const { blobStore: bs2, coreManager: cm2 } = createBlobStore({
    projectKey,
  })

  const [{ blobId }] = data

  const { destroy } = replicateBlobs(cm1, cm2)

  await waitForCores(cm2, [cm1.getWriterCore('blobIndex').key])

  /** @type {any}*/
  const { core: replicatedCore } = cm2.getCoreByDiscoveryKey(
    Buffer.from(blobId.driveId, 'hex')
  )
  await replicatedCore.update({ wait: true })
  await replicatedCore.download({ end: replicatedCore.length }).done()
  await destroy()

  const server = createServer({ blobStore: bs2, projectKey })

  const res = await server.inject({
    method: 'GET',
    url: buildRouteUrl({ ...blobId, projectPublicId }),
  })

  t.is(res.statusCode, 404)
})

test('GET photo returns 404 when trying to get non-existent blob', async (t) => {
  const projectKey = randomBytes(32)

  const { projectPublicId, blobStore } = await setup({ projectKey })

  const expected = await readFile(new URL(import.meta.url))

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })

  const server = createServer({ blobStore, projectKey })

  // Test that the blob does not exist
  {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectPublicId,
        driveId: blobStore.writerDriveId,
      }),
    })

    t.is(res.statusCode, 404)
  }

  const driveId = await blobStore.put(blobId, expected)
  await blobStore.clear({ ...blobId, driveId: blobStore.writerDriveId })

  // Test that the entry exists but blob does not
  {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({ ...blobId, projectPublicId, driveId }),
    })

    t.is(res.statusCode, 404)
  }
})

function createBlobStore(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

/**
 * @param {object} opts
 * @param {string} [opts.prefix]
 * @param {import('../../src/blob-store/index.js').BlobStore} opts.blobStore
 * @param {Buffer} opts.projectKey
 */
function createServer(opts) {
  return fastify().register(BlobServerPlugin, {
    prefix: opts.prefix,
    getBlobStore: async (projectPublicId) => {
      if (projectPublicId !== projectKeyToPublicId(opts.projectKey))
        throw new Error(
          `Could not get blobStore for project id ${projectPublicId}`
        )
      return opts.blobStore
    },
  })
}

/**
 * @param {object} [opts]
 * @param {string} [opts.prefix]
 * @param {Buffer} [opts.projectKey]
 */
async function setup({ prefix, projectKey = randomBytes(32) } = {}) {
  const { blobStore, coreManager } = createBlobStore({ projectKey })
  const data = await populateStore(blobStore)

  const server = createServer({ prefix, blobStore, projectKey })

  const projectPublicId = projectKeyToPublicId(projectKey)

  return { data, server, projectPublicId, coreManager, blobStore }
}

const IMAGE_FIXTURES_PATH = new URL('../fixtures/images', import.meta.url)
  .pathname

const IMAGE_FIXTURES = readdirSync(IMAGE_FIXTURES_PATH)

/**
 * @param {import('../../src/blob-store').BlobStore} blobStore
 */
async function populateStore(blobStore) {
  /** @type {{blobId: import('../../src/types').BlobId, image: {data: Buffer, ext: string}}[]} */
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

/**
 *
 * @param {object} opts
 * @param {string} [opts.prefix]
 * @param {string} opts.projectPublicId
 * @param {string} opts.driveId
 * @param {string} opts.type
 * @param {string} opts.variant
 * @param {string} opts.name
 *
 * @returns {string}
 */
function buildRouteUrl({
  prefix = '',
  projectPublicId,
  driveId,
  type,
  variant,
  name,
}) {
  return `${prefix}/${projectPublicId}/${driveId}/${type}/${variant}/${name}`
}
