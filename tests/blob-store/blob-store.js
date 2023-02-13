// @ts-check
import test from 'brittle'
import b4a from 'b4a'
import { pipelinePromise as pipeline, Writable } from 'streamx'
import { randomBytes } from 'crypto'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { setTimeout } from 'timers/promises'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { createCoreManager, replicate } from '../helpers/core-manager.js'
import { BlobStore } from '../../lib/blob-store/index.js'

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

test.solo('replicate blob data', async function (t) {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })
  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)


  console.log('add cores')
  cm1.addCore(cm2.getWriterCore('blobIndex').key, 'blobIndex')
  cm2.addCore(cm1.getWriterCore('blobIndex').key, 'blobIndex')

  await setTimeout(1000)
  console.log('starting replicate')

  const rsm1 = cm1.replicate(n1)
  const rsm2 = cm2.replicate(n2)

  rsm1.enableNamespace('blobIndex')
  // rsm1.enableNamespace('blob')
  rsm2.enableNamespace('blobIndex')
  // rsm2.enableNamespace('blob')

  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    size: 'original',
    name: 'test-file'
  })
  const driveId = await bs1.put(blobId, diskbuf)

  await bs2.download()
  const bndlbuf = await bs2.get({ ...blobId, driveId })

  t.is(b4a.compare(diskbuf, bndlbuf), 0)
})

async function testenv (opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}
