import test from 'brittle'
import b4a from 'b4a'
import { pipelinePromise as pipeline, Writable } from 'streamx'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { createCoreManager } from './helpers/core-manager.js'
import { BlobStore } from '../lib/blob-store/index.js'

test('blobStore.put(path, buf) and blobStore.get(path)', async t => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    size: 'original',
    name: 'test-file'
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const bndlbuf = await blobStore.get({ ...blobId, driveId })
  t.is(b4a.compare(diskbuf, bndlbuf), 0)
})

test('blobStore.createWriteStream(path) and blobStore.createReadStream(path)', async t => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    size: 'original',
    name: 'test-file'
  })
  const ws = blobStore.createWriteStream(blobId)
  const {driveId} = ws
  await pipeline(
    fs.createReadStream(new URL(import.meta.url)),
    ws
  )
  let bndlbuf = null
  await pipeline(
    blobStore.createReadStream({ ...blobId, driveId }),
    new Writable({
      write (data, cb) {
        if (bndlbuf) bndlbuf = b4a.concat(bndlbuf, data)
        else bndlbuf = data
        return cb(null)
      }
    })
  )
  t.is(b4a.compare(diskbuf, bndlbuf), 0)
})

async function testenv () {
  const coreManager = createCoreManager()
  const blobStore = new BlobStore({ coreManager })
  return { blobStore }
}
