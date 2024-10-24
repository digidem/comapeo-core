import test from 'node:test'
import assert from 'node:assert/strict'
// @ts-ignore
import { pipelinePromise as pipeline } from 'streamx'
import { randomBytes } from 'node:crypto'
import fs from 'fs'
import { readFile } from 'fs/promises'
import {
  replicate,
  createCoreManager,
  waitForCores,
} from '../helpers/core-manager.js'
import {
  BlobStore,
  SUPPORTED_BLOB_VARIANTS,
} from '../../src/blob-store/index.js'
import { setTimeout } from 'node:timers/promises'
import { concat } from '../helpers/blob-store.js'
import { discoveryKey } from 'hypercore-crypto'
import { setTimeout as delay } from 'node:timers/promises'

// Test with buffers that are 3 times the default blockSize for hyperblobs
const TEST_BUF_SIZE = 3 * 64 * 1024

test('blobStore.put(blobId, buf) and blobStore.get(blobId)', async () => {
  const { blobStore } = testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const bndlbuf = await blobStore.get({ ...blobId, driveId })
  assert.deepEqual(bndlbuf, diskbuf, 'should be equal')
})

test('get(), driveId not found', async () => {
  const { blobStore } = testenv()
  await assert.rejects(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId: randomBytes(32).toString('hex'),
      })
  )
})

test('get(), valid driveId, missing file', async () => {
  const { blobStore, coreManager } = testenv()
  const driveId = discoveryKey(
    coreManager.getWriterCore('blobIndex').key
  ).toString('hex')

  await assert.rejects(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId,
      })
  )
})

test('get(), uninitialized drive', async () => {
  const { blobStore, coreManager } = testenv()
  const driveKey = randomBytes(32)
  const driveId = discoveryKey(driveKey).toString('hex')
  coreManager.addCore(driveKey, 'blobIndex')
  await assert.rejects(
    async () =>
      await blobStore.get({
        type: 'photo',
        variant: 'original',
        name: 'test-file',
        driveId,
      })
  )
})

test('get(), initialized but unreplicated drive', async () => {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const driveId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicate(cm1, cm2)
  await waitForCores(cm2, [cm1.getWriterCore('blobIndex').key])

  /** @type {any} */
  const { core: replicatedCore } = cm2.getCoreByDiscoveryKey(
    Buffer.from(driveId, 'hex')
  )
  await replicatedCore.update({ wait: true })
  await destroy()
  assert.equal(replicatedCore.contiguousLength, 0, 'data is not downloaded')
  assert(replicatedCore.length > 0, 'proof of length has updated')
  await assert.rejects(async () => await bs2.get({ ...blob1Id, driveId }))
})

test('get(), replicated blobIndex, but blobs not replicated', async () => {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })

  const blob1 = randomBytes(TEST_BUF_SIZE)
  const blob1Id = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'blob1',
  })
  const driveId = await bs1.put(blob1Id, blob1)

  const { destroy } = replicate(cm1, cm2)
  await waitForCores(cm2, [cm1.getWriterCore('blobIndex').key])
  /** @type {any} */
  const { core: replicatedCore } = cm2.getCoreByDiscoveryKey(
    Buffer.from(driveId, 'hex')
  )
  await replicatedCore.update({ wait: true })
  await replicatedCore.download({ end: replicatedCore.length }).done()
  await destroy()

  assert.equal(
    replicatedCore.contiguousLength,
    replicatedCore.length,
    'blobIndex has downloaded'
  )
  assert(replicatedCore.length > 0)
  await assert.rejects(async () => await bs2.get({ ...blob1Id, driveId }))
})

test('blobStore.createWriteStream(blobId) and blobStore.createReadStream(blobId)', async () => {
  const { blobStore } = testenv()
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
  assert.deepEqual(bndlbuf, diskbuf, 'should be equal')
})

test('blobStore.entry includes metadata if present', async () => {
  const { blobStore } = testenv()

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const ws = blobStore.createWriteStream(blobId, {
    metadata: {
      foo: 'bar',
      baz: [1, 2, 3],
    },
  })
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)

  const entry = await blobStore.entry({
    ...blobId,
    driveId: ws.driveId,
  })
  assert.deepEqual(entry?.value.metadata, {
    foo: 'bar',
    baz: [1, 2, 3],
  })
})

test('blobStore.createReadStream should not wait', async () => {
  const { blobStore } = testenv()
  const expected = await readFile(new URL(import.meta.url))

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })

  await assert.rejects(
    async () => {
      const result = blobStore.createReadStream({
        ...blobId,
        driveId: blobStore.writerDriveId,
      })
      await concat(result)
    },
    { message: 'Blob does not exist' }
  )

  const { blobStore: blobStore2 } = testenv()

  const ws = blobStore.createWriteStream(blobId)
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws)

  {
    const stream = blobStore.createReadStream({
      ...blobId,
      driveId: blobStore.writerDriveId,
    })
    const blob = await concat(stream)
    assert.deepEqual(blob, expected, 'should be equal')
  }

  await assert.rejects(
    async () => {
      const stream = blobStore2.createReadStream({
        ...blobId,
        driveId: blobStore2.writerDriveId,
      })
      await concat(stream)
    },
    { message: 'Blob does not exist' }
  )

  const ws2 = blobStore2.createWriteStream(blobId)
  await pipeline(fs.createReadStream(new URL(import.meta.url)), ws2)

  {
    const stream = blobStore2.createReadStream({
      ...blobId,
      driveId: blobStore2.writerDriveId,
    })
    const blob = await concat(stream)
    assert.deepEqual(blob, expected, 'should be equal')

    await blobStore2.clear({
      ...blobId,
      driveId: blobStore2.writerDriveId,
    })

    await assert.rejects(
      async () => {
        const stream = blobStore2.createReadStream({
          ...blobId,
          driveId: blobStore2.writerDriveId,
        })
        await concat(stream)
      },
      { message: 'Block not available' }
    )
  }
})

test('blobStore.writerDriveId', async () => {
  {
    const { blobStore } = testenv()
    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: 'test-file',
    })
    const ws = blobStore.createWriteStream(blobId)
    assert.equal(
      ws.driveId,
      blobStore.writerDriveId,
      'writerDriveId is same as driveId used for createWriteStream'
    )
  }
  {
    const { blobStore } = testenv()
    const blobId = /** @type {const} */ ({
      type: 'photo',
      variant: 'original',
      name: 'test-file',
    })
    const driveId = await blobStore.put(blobId, Buffer.from('hello'))
    assert.equal(
      driveId,
      blobStore.writerDriveId,
      'writerDriveId is same as driveId returned by put()'
    )
  }
})

// Tests:
// A) Downloads from peers connected when download() is first called
// B) Downloads from peers connected after download() is first called
test.skip('live download', async function () {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = testenv({ projectKey })

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
  const { destroy: destroy1 } = replicate(cm1, cm3)
  // STEP 3: Start live download to CM3
  const liveDownload = bs3.download()
  // STEP 4: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 5: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicate(cm2, cm3)
  // STEP 6: Write a blob to CM2
  const driveId2 = await bs2.put(blob2Id, blob2)
  // STEP 7: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 8: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  assert.deepEqual(
    await bs3.get({ ...blob1Id, driveId: driveId1 }),
    blob1,
    'blob1 was downloaded'
  )
  assert.deepEqual(
    await bs3.get({ ...blob2Id, driveId: driveId2 }),
    blob2,
    'blob2 was downloaded'
  )
})

test.skip('sparse live download', async function () {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })

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

  const { destroy } = replicate(cm1, cm2)

  const liveDownload = bs2.download({
    filter: { photo: ['original', 'preview'] },
  })
  await downloaded(liveDownload)

  await destroy()

  assert.deepEqual(
    await bs2.get({ ...blob1Id, driveId }),
    blob1,
    'blob1 was downloaded'
  )
  assert.deepEqual(
    await bs2.get({ ...blob2Id, driveId }),
    blob2,
    'blob2 was downloaded'
  )
  await assert.rejects(
    () => bs2.get({ ...blob3Id, driveId }),
    'blob3 was not downloaded'
  )
})

test.skip('cancelled live download', async function () {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = testenv({ projectKey })

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
  const { destroy: destroy1 } = replicate(cm1, cm3)
  // STEP 3: Start live download to CM3
  const liveDownload = bs3.download()
  // STEP 4: Wait for blobs to be downloaded
  await downloaded(liveDownload)
  // STEP 5: Cancel download
  liveDownload.destroy()
  // STEP 6: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicate(cm2, cm3)
  // STEP 7: Write a blob to CM2
  const driveId2 = await bs2.put(blob2Id, blob2)
  // STEP 8: Wait for blobs to (not) download
  await setTimeout(200)
  // STEP 9: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  // Both blob1 and blob2 (from CM1 and CM2) should have been downloaded to CM3
  assert.deepEqual(
    await bs3.get({ ...blob1Id, driveId: driveId1 }),
    blob1,
    'blob1 was downloaded'
  )
  await assert.rejects(
    async () => bs3.get({ ...blob2Id, driveId: driveId2 }),
    'blob2 was not downloaded'
  )
})

test('blobStore.getEntryBlob(driveId, entry)', async () => {
  const { blobStore } = testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const entry = await blobStore.entry({ ...blobId, driveId })
  assert(entry)

  const buf = await blobStore.getEntryBlob(driveId, entry)

  assert.deepEqual(buf, diskbuf, 'should be equal')
})

test('blobStore.getEntryReadStream(driveId, entry)', async () => {
  const { blobStore } = testenv()
  const diskbuf = await readFile(new URL(import.meta.url))
  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })
  const driveId = await blobStore.put(blobId, diskbuf)
  const entry = await blobStore.entry({ ...blobId, driveId })
  assert(entry)

  const buf = await concat(
    await blobStore.createReadStreamFromEntry(driveId, entry)
  )

  assert.deepEqual(buf, diskbuf, 'should be equal')
})

test('blobStore.getEntryReadStream(driveId, entry) should not wait', async () => {
  const { blobStore } = testenv()

  const expected = await readFile(new URL(import.meta.url))

  const blobId = /** @type {const} */ ({
    type: 'photo',
    variant: 'original',
    name: 'test-file',
  })

  const driveId = await blobStore.put(blobId, expected)
  const entry = await blobStore.entry({ ...blobId, driveId })
  assert(entry)
  await blobStore.clear({ ...blobId, driveId: blobStore.writerDriveId })

  await assert.rejects(
    async () => {
      const stream = await blobStore.createReadStreamFromEntry(driveId, entry)
      await concat(stream)
    },
    { message: 'Block not available' }
  )
})

test('blobStore.createEntriesReadStream({ live: false })', async (t) => {
  const { blobStore } = testenv()
  const blobIds = Array.from({ length: 50 }, randomBlobId)

  // Add some blobs with unknown variants and types
  blobIds.push(
    {
      // @ts-expect-error
      type: 'unknownType',
      variant: 'original',
      name: randomBytes(8).toString('hex'),
    },
    {
      type: 'photo',
      variant: 'unknownVariant',
      name: randomBytes(8).toString('hex'),
    },
    {
      type: 'photoExtra',
      variant: 'original',
      name: randomBytes(8).toString('hex'),
    }
  )
  for (const blobId of blobIds) {
    await blobStore.put(blobId, Buffer.from([0]))
  }
  const inputKeys = blobIds.map(blobIdToKey)

  /** @param {import('../../src/types.js').BlobStoreEntriesStream} entriesStream */
  async function getKeys(entriesStream) {
    const keys = new Set()
    for await (const entry of entriesStream) {
      keys.add(entry.key)
    }
    return keys
  }

  await t.test('no folders filter, returns everything', async () => {
    const expectedKeys = new Set(inputKeys)
    const entriesStream = blobStore.createEntriesReadStream()
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns all keys')
  })

  await t.test('[] folders filter, returns everything', async () => {
    const expectedKeys = new Set(inputKeys)
    const entriesStream = blobStore.createEntriesReadStream({ folders: [] })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns all keys')
  })

  await t.test('single folders filter', async () => {
    const folders = ['/photo']
    const unexpectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith(folders[0]))
    )
    const expectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith(addTrailingSlash(folders[0])))
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.notDeepEqual(
      keys,
      unexpectedKeys,
      'does not return keys matched without trailing slash'
    )
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('multiple folders filter, no subfolder', async () => {
    const folders = ['/video/original', '/photo/preview']
    const expectedKeys = new Set(
      inputKeys.filter((key) =>
        folders.find((folder) => key.startsWith(addTrailingSlash(folder)))
      )
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('multiple folders filter, subfolder', async () => {
    const folders = ['/photo/original', '/photo']
    const expectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith(addTrailingSlash(folders[1])))
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('folders filter with trailing slashes', async () => {
    const folders = ['/photo/original/']
    const expectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith(addTrailingSlash(folders[0])))
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('folders filter without leading slash', async () => {
    const folders = ['photo/original']
    const expectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith('/photo/original/'))
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('folders filter windows separator', async () => {
    const folders = ['C:\\photo\\original']
    const expectedKeys = new Set(
      inputKeys.filter((key) => key.startsWith('/photo/original/'))
    )
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys, expectedKeys, 'returns expected keys')
  })

  await t.test('folders filter unknown blob type & variant', async () => {
    const folders = ['/unknownType', '/photo/unknownVariant']
    const entriesStream = blobStore.createEntriesReadStream({ folders })
    const keys = await getKeys(entriesStream)
    assert.deepEqual(keys.size, 2)
  })
})

test('blobStore.createEntriesReadStream({ live: true })', async () => {
  const projectKey = randomBytes(32)
  const { blobStore: bs1, coreManager: cm1 } = testenv({ projectKey })
  const { blobStore: bs2, coreManager: cm2 } = testenv({ projectKey })
  const { blobStore: bs3, coreManager: cm3 } = testenv({ projectKey })

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
  const entries = []

  // STEP 1: Write a blob to CM1
  await bs1.put(blob1Id, blob1)
  // STEP 2: Replicate CM1 with CM3
  const { destroy: destroy1 } = replicate(cm1, cm3)
  // STEP 3: Start live entries stream from CM3
  const entriesStream = bs3.createEntriesReadStream({ live: true })
  entriesStream.on('data', (entry) => entries.push(entry))
  // STEP 4: Wait for replication
  await delay(200)
  assert.equal(entries.length, 1, 'entry from replicated blobStore')
  // STEP 5: Replicate CM2 with CM3
  const { destroy: destroy2 } = replicate(cm2, cm3)
  // STEP 6: Write a blob to CM2
  await bs2.put(blob2Id, blob2)
  // STEP 7: Wait for replication
  await delay(200)
  // STEP 8: destroy all the replication streams
  await Promise.all([destroy1(), destroy2()])

  assert.equal(entries.length, 2, '2 entries from replicated blobStore')
})

/** @returns {import('../../src/types.js').BlobId} */
function randomBlobId() {
  const types = /** @type {import('../../src/types.js').BlobType[]} */ (
    Object.keys(SUPPORTED_BLOB_VARIANTS)
  )
  const type = types[Math.floor(Math.random() * types.length)]
  const variant =
    SUPPORTED_BLOB_VARIANTS[type][
      Math.floor(Math.random() * SUPPORTED_BLOB_VARIANTS[type].length)
    ]
  // @ts-expect-error
  return { type, variant, name: randomBytes(8).toString('hex') }
}

/** @param {import('../../src/types.js').BlobId} blobId */
function blobIdToKey({ name, type, variant }) {
  return `/${type}/${variant}/${name}`
}
/** @param {string} path */
function addTrailingSlash(path) {
  return path.endsWith('/') ? path : `${path}/`
}

/**
 * @param {Parameters<typeof createCoreManager>} args
 */
function testenv(...args) {
  const coreManager = createCoreManager(...args)
  const blobStore = new BlobStore({ coreManager })
  return { blobStore, coreManager }
}

/**
 * Resolve when liveDownload status is 'downloaded'
 *
 * @param {import('../../src/blob-store/downloader.js').Downloader} liveDownload
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
