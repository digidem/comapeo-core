// @ts-check
import test from 'brittle'
// @ts-ignore
import { pipelinePromise as pipeline, Writable } from 'streamx'
import { randomBytes } from 'node:crypto'
import fs from 'fs'
import { readFile } from 'fs/promises'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { createCoreManager } from '../helpers/core-manager.js'
import { BlobStore } from '../../lib/blob-store/index.js'

// Test with buffers that are 3 times the default blockSize for hyperblobs
const TEST_BUF_SIZE = 3 * 64 * 1024

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
  t.alike(bndlbuf, diskbuf, 'should be equal')
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
  const { driveId } = ws
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)
  let bndlbuf = null
  await pipeline(
    blobStore.createReadStream({ ...blobId, driveId }),
    new Writable({
      write (data, cb) {
        if (bndlbuf) bndlbuf = data.concat(bndlbuf)
        else bndlbuf = data
        return cb(null)
      }
    })
  )
  t.alike(bndlbuf, diskbuf, 'should be equal')
})

test('live download', async function (t) {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = await testenv({ projectKey })

  const n1 = new NoiseSecretStream(true)
  const n2 = new NoiseSecretStream(false)
  const n3 = new NoiseSecretStream(true)
  const n4 = new NoiseSecretStream(false)
  n1.rawStream.pipe(n2.rawStream).pipe(n1.rawStream)
  n3.rawStream.pipe(n4.rawStream).pipe(n3.rawStream)

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    size: 'original',
    name: 'blob1'
  })
  const blob2 = randomBytes(TEST_BUF_SIZE)
  const blob2Id = /** @type {const} */ ({
    type: 'photo',
    size: 'original',
    name: 'blob2'
  })

  // STEP 1: Write a blob to CM1
  const driveId1 = await bs1.put(blob1Id, blob1)

  // STEP 2: Replicate CM1 with CM3
  const rsm1 = cm1.replicate(n1)
  const rsm2 = cm3.replicate(n2)

  // STEP 3: Add the CM1 blob core to CM3, and enable replication of blob and blobIndex namespaces
  cm3.addCore(cm1.getWriterCore('blobIndex').key, 'blobIndex')
  rsm1.enableNamespace('blobIndex')
  rsm1.enableNamespace('blob')
  rsm2.enableNamespace('blobIndex')
  rsm2.enableNamespace('blob')

  // STEP 4: Start live download to CM3
  const liveDownload = bs3.download()

  // STEP 5: Wait for blobs to be downloaded
  await downloaded(liveDownload)

  // STEP 6: Replicate CM2 with CM3
  const rsm3 = cm2.replicate(n3)
  const rsm4 = cm3.replicate(n4)

  // STEP 7: Add the CM2 blob core to CM3, and enable replication of blob and blobIndex namespaces
  cm3.addCore(cm2.getWriterCore('blobIndex').key, 'blobIndex')
  rsm3.enableNamespace('blobIndex')
  rsm3.enableNamespace('blob')
  rsm4.enableNamespace('blobIndex')
  rsm4.enableNamespace('blob')

  // STEP 8: Write a blob to CM2
  const driveId2 = await bs2.put(blob2Id, blob2)

  // STEP 9: Wait for blobs to be downloaded
  await downloaded(liveDownload)

  // STEP 10: destroy all the replication streams
  await Promise.all([destroy(n1), destroy(n2), destroy(n3), destroy(n4)])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  t.alike(
    await bs3.get({ ...blob1Id, driveId: driveId1 }),
    blob1,
    'blob1 was downloaded'
  )
  t.alike(
    await bs3.get({ ...blob2Id, driveId: driveId2 }),
    blob2,
    'blob2 was downloaded'
  )
})

async function testenv (opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

/**
 *
 * @param {ReturnType<BlobStore['download']>} liveDownload
 * @returns {Promise<void>}
 */
async function downloaded (liveDownload) {
  return new Promise(res => {
    liveDownload.on('state', function onState (state) {
      if (state.status !== 'downloaded') return
      liveDownload.off('state', onState)
      res()
    })
  })
}

/**
 *
 * @param {import('streamx').Duplex} stream
 * @returns {Promise<void>}
 */
async function destroy (stream) {
  return new Promise(res => {
    stream.once('close', res)
    stream.destroy()
  })
}
