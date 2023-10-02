// @ts-check
import test from 'brittle'
// @ts-ignore
import { pipelinePromise as pipeline } from 'streamx'
import { randomBytes } from 'node:crypto'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { createCoreManager, waitForCores } from '../helpers/core-manager.js'
import { BlobStore } from '../../src/blob-store/index.js'
import { setTimeout } from 'node:timers/promises'
import { replicateBlobs, concat } from '../helpers/blob-store.js'
import { discoveryKey } from 'hypercore-crypto'

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
  const driveDiscoveryId = await blobStore.put(blobId, diskbuf)
  const bndlbuf = await blobStore.get({
    ...blobId,
    driveDiscoveryId: driveDiscoveryId,
  })
  t.alike(bndlbuf, diskbuf, 'should be equal')
})

test('get(), driveDiscoveryId not found', async (t) => {
  const { blobStore } = await testenv()
  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveDiscoveryId: randomBytes(32).toString('hex'),
      })
  )
})

test('get(), valid driveDiscoveryId, missing file', async (t) => {
  const { blobStore, coreManager } = await testenv()
  const driveDiscoveryId = discoveryKey(
    coreManager.getWriterCore('blobIndex').key
  ).toString('hex')

  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveDiscoveryId: driveDiscoveryId,
      })
  )
})

test('get(), uninitialized drive', async (t) => {
  const { blobStore, coreManager } = await testenv()
  const driveKey = randomBytes(32)
  const driveDiscoveryId = discoveryKey(driveKey).toString('hex')
  coreManager.addCore(driveKey, 'blobIndex')
  await t.exception(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveDiscoveryId,
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
  const driveDiscoveryId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicateBlobs(cm1, cm2)
  await waitForCores(cm2, [cm1.getWriterCore('blobIndex').key])

  /** @type {any} */
  const replicatedCore = cm2.getCoreByDiscoveryKey(
    Buffer.from(driveDiscoveryId, 'hex')
  )
  await replicatedCore.update({ wait: true })
  await destroy()
  t.is(replicatedCore.contiguousLength, 0, 'data is not downloaded')
  t.ok(replicatedCore.length > 0, 'proof of length has updated')
  await t.exception(
    async () =>
      await bs2.get({
        ...blob1Id,
        driveDiscoveryId,
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
  const driveDiscoveryId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicateBlobs(cm1, cm2)
  await waitForCores(cm2, [cm1.getWriterCore('blobIndex').key])
  /** @type {any} */
  const replicatedCore = cm2.getCoreByDiscoveryKey(
    Buffer.from(driveDiscoveryId, 'hex')
  )
  await replicatedCore.update({ wait: true })
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
        driveDiscoveryId,
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
  const { driveDiscoveryId } = ws
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)
  const bndlbuf = await concat(
    blobStore.createReadStream({
      ...blobId,
      driveDiscoveryId,
    })
  )
  t.alike(bndlbuf, diskbuf, 'should be equal')
})

test('blobStore.createReadStream should not wait', async (t) => {
  const { blobStore } = await testenv()
  const expected = await readFile(new URL(import.meta.url))

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })

  try {
    const result = blobStore.createReadStream({
      ...blobId,
      driveDiscoveryId: blobStore.writerDriveDiscoveryId,
    })
    await concat(result)
  } catch (error) {
    t.is(error.message, 'Blob does not exist')
  }

  const { blobStore: blobStore2 } = await testenv()

  const ws = blobStore.createWriteStream(blobId)
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)

  {
    const stream = blobStore.createReadStream({
      ...blobId,
      driveDiscoveryId: blobStore.writerDriveDiscoveryId,
    })
    const blob = await concat(stream)
    t.alike(blob, expected, 'should be equal')
  }

  try {
    const stream = blobStore2.createReadStream({
      ...blobId,
      driveDiscoveryId: blobStore2.writerDriveDiscoveryId,
    })
    await concat(stream)
  } catch (error) {
    t.is(error.message, 'Blob does not exist')
  }

  const ws2 = blobStore2.createWriteStream(blobId)
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws2)

  {
    const stream = blobStore2.createReadStream({
      ...blobId,
      driveDiscoveryId: blobStore2.writerDriveDiscoveryId,
    })
    const blob = await concat(stream)
    t.alike(blob, expected, 'should be equal')

    await blobStore2.clear({
      ...blobId,
      driveDiscoveryId: blobStore2.writerDriveDiscoveryId,
    })

    try {
      const stream = blobStore2.createReadStream({
        ...blobId,
        driveDiscoveryId: blobStore2.writerDriveDiscoveryId,
      })
      await concat(stream)
    } catch (error) {
      t.is(error.message, 'Block not available')
    }
  }
})

test('blobStore.writerDriveDiscoveryId', async (t) => {
  {
    const { blobStore } = await testenv()
    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: 'test-file',
    })
    const ws = blobStore.createWriteStream(blobId)
    t.is(
      ws.driveDiscoveryId,
      blobStore.writerDriveDiscoveryId,
      'writerDriveDiscoveryId is same as driveDiscoveryId used for createWriteStream'
    )
  }
  {
    const { blobStore } = await testenv()
    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: 'test-file',
    })
    const driveDiscoveryId = await blobStore.put(blobId, Buffer.from('hello'))
    t.is(
      driveDiscoveryId,
      blobStore.writerDriveDiscoveryId,
      'writerDriveDiscoveryId is same as driveDiscoveryId returned by put()'
    )
  }
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
  const driveDiscoveryId1 = await bs1.put(blob1Id, blob1)
  // STEP 2: Replicate CM1 with CM3
  const { destroy: destroy1 } = replicateBlobs(cm1, cm3)
  // STEP 3: Start live download to CM3
  const liveDownload = bs3.download()
  // STEP 4: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 5: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicateBlobs(cm2, cm3)
  // STEP 6: Write a blob to CM2
  const driveDiscoveryId2 = await bs2.put(blob2Id, blob2)
  // STEP 7: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 8: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  t.alike(
    await bs3.get({ ...blob1Id, driveDiscoveryId: driveDiscoveryId1 }),
    blob1,
    'blob1 was downloaded'
  )
  t.alike(
    await bs3.get({ ...blob2Id, driveDiscoveryId: driveDiscoveryId2 }),
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

  const driveDiscoveryId = await bs1.put(blob1Id, blob1)
  await bs1.put(blob2Id, blob2)
  await bs1.put(blob3Id, blob3)

  const { destroy } = replicateBlobs(cm1, cm2)

  const liveDownload = bs2.download({ photo: ['original', 'preview'] })
  await downloaded(liveDownload)

  await destroy()

  t.alike(
    await bs2.get({ ...blob1Id, driveDiscoveryId: driveDiscoveryId }),
    blob1,
    'blob1 was downloaded'
  )
  t.alike(
    await bs2.get({ ...blob2Id, driveDiscoveryId: driveDiscoveryId }),
    blob2,
    'blob2 was downloaded'
  )
  await t.exception(
    () => bs2.get({ ...blob3Id, driveDiscoveryId: driveDiscoveryId }),
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
  const driveDiscoveryId1 = await bs1.put(blob1Id, blob1)
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
  const driveDiscoveryId2 = await bs2.put(blob2Id, blob2)
  // STEP 8: Wait for blobs to (not) download
  await setTimeout(200)
  // STEP 9: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  t.alike(
    await bs3.get({ ...blob1Id, driveDiscoveryId: driveDiscoveryId1 }),
    blob1,
    'blob1 was downloaded'
  )
  await t.exception(
    async () => bs3.get({ ...blob2Id, driveDiscoveryId: driveDiscoveryId2 }),
    'blob2 was not downloaded'
  )
})

test('blobStore.getEntryBlob(driveDiscoveryId, entry)', async (t) => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveDiscoveryId = await blobStore.put(blobId, diskbuf)
  const entry = await blobStore.entry({ ...blobId, driveDiscoveryId })

  const buf = await blobStore.getEntryBlob(driveDiscoveryId, entry)

  t.alike(buf, diskbuf, 'should be equal')
})

test('blobStore.getEntryReadStream(driveDiscoveryId, entry)', async (t) => {
  const { blobStore } = await testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveDiscoveryId = await blobStore.put(blobId, diskbuf)
  const entry = await blobStore.entry({ ...blobId, driveDiscoveryId })

  const buf = await concat(
    await blobStore.createEntryReadStream(driveDiscoveryId, entry)
  )

  t.alike(buf, diskbuf, 'should be equal')
})

test('blobStore.getEntryReadStream(driveDiscoveryId, entry) should not wait', async (t) => {
  const { blobStore } = await testenv()

  const expected = await readFile(new URL(import.meta.url))

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })

  const driveDiscoveryId = await blobStore.put(blobId, expected)
  const entry = await blobStore.entry({ ...blobId, driveDiscoveryId })
  await blobStore.clear({
    ...blobId,
    driveDiscoveryId: blobStore.writerDriveDiscoveryId,
  })

  try {
    const stream = await blobStore.createEntryReadStream(
      driveDiscoveryId,
      entry
    )
    await concat(stream)
  } catch (error) {
    t.is(error.message, 'Block not available', 'Block not available')
  }
})

async function testenv(opts) {
  const coreManager = createCoreManager(opts)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

/**
 * Resolve when liveDownload status is 'downloaded'
 *
 * @param {ReturnType<BlobStore['download']>} liveDownload
 * @returns {Promise<void>}
 */
async function downloaded(liveDownload) {
  return new Promise((res) => {
    liveDownload.on('state', function onState(state) {
      // If liveDownload is created before all cores have been added to the
      // replication stream, then initially it will emit `downloaded` (since it
      // has downloaded the zero data there is available to download), so we
      // also wait for the `downloaded` once data has actually downloaded
      if (state.status !== 'downloaded' || state.haveCount === 0) return
      liveDownload.off('state', onState)
      res()
    })
  })
}
