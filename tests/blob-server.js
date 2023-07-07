// @ts-check
import test from 'brittle'
import { readFile } from 'fs/promises'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'
import { BlobServer } from '../lib/blob-server/index.js'
import { inject } from 'light-my-request'


test('GET photo', async t => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file'
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const server = new BlobServer({ blobStore })
  const res = await inject(server.requestHandler.bind(server)).get(
    `${driveId}/${blobId.type}/${blobId.variant}/${blobId.name}`
  )
  t.alike(res.rawPayload, diskbuf, 'should be equal')
})

async function testenv (opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}
