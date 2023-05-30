// @ts-check
import test from 'brittle'
// @ts-ignore
import { pipelinePromise as pipeline, Writable } from 'streamx'
import { randomBytes } from 'node:crypto'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { createCoreManager, replicate } from '../helpers/core-manager.js'
import { Blobstore } from '../../lib/blob-store/index.js'
import { setTimeout } from 'node:timers/promises'

// Test with buffers that are 3 times the default blockSize for hyperblobs
const TEST_BUF_SIZE = 3 * 64 * 1024

test('blobStore.put(blobId, buf) and blobStore.get(blobId)', async (t) => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const bndlbuf = await blobStore.get({ ...blobId, driveId })
  t.alike(bndlbuf, diskbuf, 'should be equal')
})

test('get(), driveId not found', async (t) => {
  const { blobStore } = await testenv()
  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId: randomBytes(32).toString('hex'),
      })
  )
})

test('get(), valid driveId, missing file', async (t) => {
  const { blobStore, coreManager } = await testenv()
  const driveId = coreManager.getWriterCore('blobIndex').key.toString('hex')
  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId,
      })
  )
})

test('get(), uninitialized drive', async (t) => {
  const { blobStore, coreManager } = await testenv()
  const driveKey = randomBytes(32)
  const driveId = driveKey.toString('hex')
  coreManager.addCore(driveKey, 'blobIndex')
  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId,
      })
  )
})

test('get(), initialized but unreplicated drive', async (t) => {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const driveId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicateBlobs(cm1, cm2)
  /** @type {any} */
  const replicatedCore = cm2.getCoreByKey(Buffer.from(driveId, 'hex'))
  await replicatedCore.update()
  await destroy()
  t.is(replicatedCore.contiguousLength, 0, 'data is not downloaded')
  t.ok(replicatedCore.length > 0, 'proof of length has updated')
  await t.exception(
    async () =>
      await bs2.get({
        ...blob1Id,
        driveId,
      })
  )
})

test('get(), replicated blobIndex, but blobs not replicated', async (t) => {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const driveId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicateBlobs(cm1, cm2)
  /** @type {any} */
  const replicatedCore = cm2.getCoreByKey(Buffer.from(driveId, 'hex'))
  await replicatedCore.update()
  await replicatedCore.download({ end: replicatedCore.length }).done()
  await destroy()

  t.is(
    replicatedCore.contiguousLength,
    replicatedCore.length,
    'blobIndex has downloaded'
  )
  t.ok(replicatedCore.length > 0)
  await t.exception(
    async () =>
      await bs2.get({
        ...blob1Id,
        driveId,
      })
  )
})

test('blobStore.createWriteStream(blobId) and blobStore.createReadStream(blobId)', async (t) => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const ws = blobStore.createWriteStream(blobId)
  const { driveId } = ws
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)
  const bndlbuf = await concat(
    blobStore.createReadStream({ ...blobId, driveId })
  )
  t.alike(bndlbuf, diskbuf, 'should be equal')
})

// Tests:
// A) Downloads from peers connected when download() is first called
// B) Downloads from peers connected after download() is first called
test('live download', async function (t) {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = await testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const blob2 = randomBytes(TEST_BUF_SIZE)
  const blob2Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob2',
  })

  // STEP 1: Write a blob to CM1
  const driveId1 = await bs1.put(blob1Id, blob1)
  // STEP 2: Replicate CM1 with CM3
  const { destroy: destroy1 } = replicateBlobs(cm1, cm3)
  // STEP 3: Start live download to CM3
  const liveDownload = bs3.download()
  // STEP 4: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 5: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicateBlobs(cm2, cm3)
  // STEP 6: Write a blob to CM2
  const driveId2 = await bs2.put(blob2Id, blob2)
  // STEP 7: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 8: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

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

test('sparse live download', async function (t) {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const blob2 = randomBytes(TEST_BUF_SIZE)
  const blob2Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'preview',
    name: 'blob2',
  })
  const blob3 = randomBytes(TEST_BUF_SIZE)
  const blob3Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'thumbnail',
    name: 'blob3',
  })

  const driveId = await bs1.put(blob1Id, blob1)
  await bs1.put(blob2Id, blob2)
  await bs1.put(blob3Id, blob3)

  const { destroy } = replicateBlobs(cm1, cm2)

  const liveDownload = bs2.download({ photo: ['original', 'preview'] })
  await downloaded(liveDownload)

  await destroy()

  t.alike(await bs2.get({ ...blob1Id, driveId }), blob1, 'blob1 was downloaded')
  t.alike(await bs2.get({ ...blob2Id, driveId }), blob2, 'blob2 was downloaded')
  await t.exception(
    () => bs2.get({ ...blob3Id, driveId }),
    'blob3 was not downloaded'
  )
})

test('cancelled live download', async function (t) {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = await testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = await testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = await testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const blob2 = randomBytes(TEST_BUF_SIZE)
  const blob2Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob2',
  })

  // STEP 1: Write a blob to CM1
  const driveId1 = await bs1.put(blob1Id, blob1)
  // STEP 2: Replicate CM1 with CM3
  const { destroy: destroy1 } = replicateBlobs(cm1, cm3)
  // STEP 3: Start live download to CM3
  const ac = new AbortController()
  const liveDownload = bs3.download(undefined, { signal: ac.signal })
  // STEP 4: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 5: Cancel download
  ac.abort()
  // STEP 6: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicateBlobs(cm2, cm3)
  // STEP 7: Write a blob to CM2
  const driveId2 = await bs2.put(blob2Id, blob2)
  // STEP 8: Wait for blobs to (not) download
  await setTimeout(200)
  // STEP 9: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  t.alike(
    await bs3.get({ ...blob1Id, driveId: driveId1 }),
    blob1,
    'blob1 was downloaded'
  )
  await t.exception(
    async () => bs3.get({ ...blob2Id, driveId: driveId2 }),
    'blob2 was not downloaded'
  )
})

async function testenv(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new Blobstore({ coreManager })
  return { blobStore, coreManager }
}

/**
 * Resolve when liveDownload status is 'downloaded'
 *
 * @param {ReturnType<Blobstore['download']>} liveDownload
 * @returns {Promise<void>}
 */
async function downloaded(liveDownload) {
  return new Promise((res) => {
    liveDownload.on('state', function onState(state) {
      if (state.status !== 'downloaded') return
      liveDownload.off('state', onState)
      res()
    })
  })
}

/**
 *
 * @param {import('../../lib/core-manager/index.js').CoreManager} cm1
 * @param {import('../../lib/core-manager/index.js').CoreManager} cm2
 */
function replicateBlobs(cm1, cm2) {
  cm1.addCore(cm2.getWriterCore('blobIndex').key, 'blobIndex')
  cm2.addCore(cm1.getWriterCore('blobIndex').key, 'blobIndex')
  const {
    rsm: [rsm1, rsm2],
    destroy,
  } = replicate(cm1, cm2)
  rsm1.enableNamespace('blobIndex')
  rsm1.enableNamespace('blob')
  rsm2.enableNamespace('blobIndex')
  rsm2.enableNamespace('blob')
  return {
    rsm: /** @type {const} */ ([rsm1, rsm2]),
    destroy,
  }
}

async function concat(rs) {
  let buf = null
  await pipeline(
    rs,
    new Writable({
      write(data, cb) {
        if (buf) buf = data.concat(buf)
        else buf = data
        return cb(null)
      },
    })
  )
  return buf
}
