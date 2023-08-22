import { join, basename } from 'node:path'
import { fileURLToPath } from 'url'
import test from 'brittle'
import { BlobApi } from '../src/blob-api.js'
import { createBlobServer, getPort } from '../src/blob-server/index.js'
import { createBlobStore } from './helpers/blob-store.js'
import { timeoutException } from './helpers/index.js'

test('get port after listening event with explicit port', async (t) => {
  const blobStore = createBlobStore()
  const server = await createBlobServer({ blobStore })

  t.ok(await timeoutException(getPort(server.server)))

  await new Promise((resolve) => {
    server.listen({ port: 3456 }, (err, address) => {
      resolve(address)
    })
  })

  const port = await getPort(server.server)

  t.is(typeof port, 'number')
  t.is(port, 3456)

  t.teardown(async () => {
    await server.close()
  })
})

test('get port after listening event with unset port', async (t) => {
  const blobStore = createBlobStore()
  const server = await createBlobServer({ blobStore })

  t.ok(await timeoutException(getPort(server.server)))

  await new Promise((resolve) => {
    server.listen({ port: 0 }, (err, address) => {
      resolve(address)
    })
  })

  const port = await getPort(server.server)

  t.is(typeof port, 'number', 'port is a number')
  t.teardown(async () => {
    await server.close()
  })
})

test('get url from blobId', async (t) => {
  const projectId = '1234'
  const driveId = '1234'
  const type = 'image'
  const variant = 'original'
  const name = '1234'

  const blobStore = createBlobStore()
  const blobServer = await createBlobServer({ blobStore })
  const blobApi = new BlobApi({ projectId: '1234', blobStore, blobServer })

  await new Promise((resolve) => {
    blobServer.listen({ port: 0 }, (err, address) => {
      resolve(address)
    })
  })

  const url = await blobApi.getUrl({ driveId, type, variant, name })

  t.is(
    url,
    `http://127.0.0.1:${
      blobServer.server.address().port
    }/${projectId}/${driveId}/${type}/${variant}/${name}`
  )
  t.teardown(async () => {
    await blobServer.close()
  })
})

test('create blobs', async (t) => {
  const projectId = '1234'
  const driveId = '1234'
  const type = 'image'
  const variant = 'original'
  const name = '1234'

  const { blobStore } = createBlobStore()
  const blobServer = await createBlobServer({ blobStore })
  const blobApi = new BlobApi({ projectId: '1234', blobStore, blobServer })

  await new Promise((resolve) => {
    blobServer.listen({ port: 0 }, (err, address) => {
      resolve(address)
    })
  })

  const directory = fileURLToPath(
    new URL('./fixtures/blob-api/', import.meta.url)
  )

  const blobIds = await blobApi.create(
    {
      original: join(directory, 'original.png'),
      preview: join(directory, 'preview.png'),
      thumbnail: join(directory, 'thumbnail.png'),
    },
    {
      mimeType: 'image/png',
    }
  )

  t.is(blobIds.original.type, 'photo')
  t.is(blobIds.original.variant, 'original')
  t.ok(blobIds.original.name.includes('_original.png'))

  t.is(blobIds.preview.type, 'photo')
  t.is(blobIds.preview.variant, 'preview')
  t.ok(blobIds.preview.name.includes('_preview.png'))

  t.is(blobIds.thumbnail.type, 'photo')
  t.is(blobIds.thumbnail.variant, 'thumbnail')
  t.ok(blobIds.thumbnail.name.includes('_thumbnail.png'))

  t.teardown(async () => {
    await blobServer.close()
  })
})
