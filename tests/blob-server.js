import { randomBytes } from 'node:crypto'
import test from 'brittle'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'
import { createBlobServer } from '../lib/blob-server/index.js'
import { replicateBlobs } from './helpers/blob-store.js'

test('Plugin handles prefix option properly', async (t) => {
  const prefix = '/blobs'
  const { data, server, projectId } = await testenv({ prefix })

  for (const { blobId } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        prefix,
        projectId,
      }),
    })

    t.is(res.statusCode, 200, 'request successful')
  }
})

test('Unsupported blob type and variant params are handled properly', async (t) => {
  const { data, server, projectId } = await testenv()

  for (const { blobId } of data) {
    const unsupportedVariantRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
        variant: 'foo',
      }),
    })

    t.is(unsupportedVariantRes.statusCode, 400)
    t.is(unsupportedVariantRes.json().code, 'FST_ERR_VALIDATION')

    const unsupportedTypeRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
        type: 'foo',
      }),
    })

    t.is(unsupportedTypeRes.statusCode, 400)
    t.is(unsupportedTypeRes.json().code, 'FST_ERR_VALIDATION')
  }
})

test('Invalid variant-type combination returns error', async (t) => {
  const { server, projectId } = await testenv()

  const url = buildRouteUrl({
    projectId,
    driveId: Buffer.alloc(32).toString('hex'),
    name: 'foo',
    type: 'video',
    variant: 'thumbnail',
  })

  const response = await server.inject({ method: 'GET', url })

  t.is(response.statusCode, 400)
  t.ok(response.json().message.startsWith('Unsupported variant'))
})

test('Incorrect project id returns 404', async (t) => {
  const { data, server } = await testenv()

  const incorrectProjectId = randomBytes(32).toString('hex')

  for (const { blobId } of data) {
    const incorrectProjectIdRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId: incorrectProjectId,
      }),
    })

    t.is(incorrectProjectIdRes.statusCode, 404)
  }
})

test('Missing blob name or variant returns 404', async (t) => {
  const { data, server, projectId } = await testenv()

  for (const { blobId } of data) {
    const nameMismatchRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
        name: 'foo',
      }),
    })

    t.is(nameMismatchRes.statusCode, 404)

    const variantMismatchRes = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
        variant: 'thumbnail',
      }),
    })

    t.is(variantMismatchRes.statusCode, 404)
  }
})

test('GET photo returns correct blob payload', async (t) => {
  const { data, server, projectId } = await testenv()

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
      }),
    })

    t.alike(res.rawPayload, image.data, 'should be equal')
  }
})

test('GET photo returns inferred content header if metadata is not found', async (t) => {
  const { data, server, projectId } = await testenv()

  for (const { blobId, image } of data) {
    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
      }),
    })

    const expectedContentHeader =
      getImageMimeType(image.ext) || 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo uses mime type from metadata if found', async (t) => {
  const { data, server, projectId, blobStore } = await testenv()

  for (const { blobId, image } of data) {
    const imageMimeType = getImageMimeType(image.ext)
    const metadata = imageMimeType ? { mime: imageMimeType } : undefined

    const driveId = await blobStore.put(blobId, image.data, {
      metadata: imageMimeType ? { mime: imageMimeType } : undefined,
    })

    const res = await server.inject({
      method: 'GET',
      url: buildRouteUrl({
        ...blobId,
        projectId,
        driveId,
      }),
    })

    const expectedContentHeader = metadata
      ? metadata.mime
      : 'application/octet-stream'

    t.is(res.headers['content-type'], expectedContentHeader, 'should be equal')
  }
})

test('GET photo returns 404 when trying to get non-replicated blob', async (t) => {
  const { data, projectId, coreManager: cm1 } = await testenv()
  const projectKey = Buffer.from(projectId, 'hex')
  const { blobStore: bs2, coreManager: cm2 } = await createBlobStore({
    projectKey,
  })

  const [{ blobId }] = data

  const { destroy } = replicateBlobs(cm1, cm2)

  /** @type {any}*/
  const replicatedCore = cm2.getCoreByKey(Buffer.from(blobId.driveId, 'hex'))
  await replicatedCore.update({ wait: true })
  await replicatedCore.download({ end: replicatedCore.length }).done()
  await destroy()

  const server = createBlobServer({ blobStore: bs2, projectId })

  const res = await server.inject({
    method: 'GET',
    url: buildRouteUrl({ ...blobId, projectId }),
  })

  t.is(res.statusCode, 404)
})

function createBlobStore(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

async function testenv({ prefix } = {}) {
  const projectKey = randomBytes(32)
  const projectId = projectKey.toString('hex')
  const { blobStore, coreManager } = await createBlobStore({ projectKey })
  const data = await populateStore(blobStore)
  const server = createBlobServer({ blobStore, projectId, prefix })
  return { data, server, projectId, coreManager, blobStore }
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

/**
 *
 * @param {object} opts
 * @param {string} [opts.prefix]
 * @param {string} opts.projectId
 * @param {string} opts.driveId
 * @param {string} opts.type
 * @param {string} opts.variant
 * @param {string} opts.name
 *
 * @returns {string}
 */
function buildRouteUrl({
  prefix = '',
  projectId,
  driveId,
  type,
  variant,
  name,
}) {
  return `${prefix}/${projectId}/${driveId}/${type}/${variant}/${name}`
}
