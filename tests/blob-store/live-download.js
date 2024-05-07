// @ts-check
import assert from 'node:assert/strict'
import { DriveLiveDownload } from '../../src/blob-store/live-download.js'
import Hyperdrive from 'hyperdrive'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import test from 'brittle'
import { setTimeout } from 'node:timers/promises'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
/** @typedef {import('../../src/blob-store/live-download.js').BlobDownloadState} BlobDownloadState */
/** @typedef {import('../../src/blob-store/live-download.js').BlobDownloadStateError} BlobDownloadStateError */

// Test with buffers that are 3 times the default blockSize for hyperblobs
const TEST_BUF_SIZE = 3 * 64 * 1024

test('live download', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  await drive1.put('/foo', randomBytes(TEST_BUF_SIZE))
  const drive1Entry = await drive1.entry('/foo')
  assert(drive1Entry)
  const {
    value: { blob: blob1 },
  } = drive1Entry

  const stream = replicate()
  const blobCore2 = (await drive2.getBlobs())?.core
  assert(blobCore2)

  const download = new DriveLiveDownload(drive2)
  await waitForState(download, 'downloaded')
  // Can't use `drive2.get()` here because connected to replication stream, so
  // it would download anyway (no `waitFor = false` support for Hyperdrive yet)
  t.ok(
    await blobCore2.has(
      blob1.blockOffset,
      blob1.blockOffset + blob1.blockLength
    ),
    'First blob is downloaded'
  )
  t.ok(blob1.blockLength > 1, 'Blob is more than one block length')

  const expected = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/bar', expected)

  await waitForState(download, 'downloaded')
  stream.destroy()
  await once(stream, 'close')

  t.alike(await drive2.get('/bar'), expected, 'Second blob is downloaded')
})

test('sparse live download', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  const buf1 = randomBytes(TEST_BUF_SIZE)
  const buf2 = randomBytes(TEST_BUF_SIZE)

  await drive1.put('photo/original/one', buf1)
  await drive1.put('video/original/one', randomBytes(TEST_BUF_SIZE))

  const stream = replicate()

  const download = new DriveLiveDownload(drive2, {
    filter: { photo: ['original'] },
  })
  await waitForState(download, 'downloaded')

  await drive1.put('photo/original/two', buf2)
  await drive1.put('video/original/two', randomBytes(TEST_BUF_SIZE))
  await waitForState(download, 'downloaded')

  stream.destroy()
  await once(stream, 'close')

  t.alike(await drive2.get('photo/original/one'), buf1)
  t.alike(await drive2.get('photo/original/two'), buf2)

  await t.exception(
    drive2.get('video/original/one', { wait: false }),
    /BLOCK_NOT_AVAILABLE/,
    'Block not available'
  )
  await t.exception(
    drive2.get('video/original/two', { wait: false }),
    /BLOCK_NOT_AVAILABLE/,
    'Block not available'
  )
})

test('Abort download (same tick)', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()
  await drive1.put('/foo', randomBytes(TEST_BUF_SIZE))
  const stream = replicate()
  const controller = new AbortController()
  const download = new DriveLiveDownload(drive2, { signal: controller.signal })
  controller.abort()
  stream.destroy()
  await once(stream, 'close')
  t.alike(download.state, {
    haveCount: 0,
    haveBytes: 0,
    wantCount: 0,
    wantBytes: 0,
    error: null,
    status: 'aborted',
  })
  t.is(await drive2.get('/foo'), null, 'nothing downloaded')
})

test('Abort download (next event loop)', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()
  await drive1.put('/one', randomBytes(TEST_BUF_SIZE))
  const stream = replicate()
  const controller = new AbortController()
  const download = new DriveLiveDownload(drive2, { signal: controller.signal })
  // This is the only way to trigger abort before the entryStream loop
  await drive2.getBlobs()
  controller.abort()
  stream.destroy()
  await once(stream, 'close')
  t.alike(download.state, {
    haveCount: 0,
    haveBytes: 0,
    wantCount: 0,
    wantBytes: 0,
    error: null,
    status: 'aborted',
  })
  await t.exception(
    drive2.get('/foo', { wait: false }),
    /Block not available locally/,
    'Block not available locally'
  )
})

test('Abort download (after initial download)', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  const buf1 = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/one', buf1)

  const stream = replicate()
  const controller = new AbortController()
  const download = new DriveLiveDownload(drive2, { signal: controller.signal })
  await waitForState(download, 'downloaded')

  controller.abort()

  await drive1.put('/two', randomBytes(TEST_BUF_SIZE))

  // Nothing should happen here, but allow some time to see if it does
  await setTimeout(200)

  stream.destroy()
  await once(stream, 'close')

  t.alike(await drive2.get('/one'), buf1, 'First blob is downloaded')
  await t.exception(
    drive2.get('/two', { wait: false }),
    /BLOCK_NOT_AVAILABLE/,
    'Second blob is not downloaded'
  )
})

test('Live download when data is already downloaded', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  const buf1 = randomBytes(20)
  await drive1.put('/one', buf1)

  const stream1 = replicate()

  await drive2.db.core.update({ wait: true })
  await drive2.download()
  t.alike(await drive2.get('/one'), buf1, 'First blob is downloaded')

  stream1.destroy()
  await once(stream1, 'close')

  const stream2 = replicate()
  const download = new DriveLiveDownload(drive2)
  await waitForState(download, 'downloaded')
  t.alike(
    download.state,
    {
      haveCount: 1,
      haveBytes: buf1.byteLength,
      wantCount: 0,
      wantBytes: 0,
      error: null,
      status: 'downloaded',
    },
    'Blob already downloaded is included in state'
  )

  const buf2 = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/two', buf2)
  await waitForState(download, 'downloaded')

  stream2.destroy()
  await once(stream2, 'close')

  t.alike(await drive2.get('/two'), buf2, 'Second blob is downloaded')
})

test('Live download continues across disconnection and reconnect', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  const buf1 = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/one', buf1)

  const stream1 = replicate()

  const download = new DriveLiveDownload(drive2)
  await waitForState(download, 'downloaded')

  t.alike(await drive2.get('/one'), buf1, 'First blob is downloaded')

  stream1.destroy()
  await once(stream1, 'close')

  const buf2 = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/two', buf2)

  const stream2 = replicate()
  await waitForState(download, 'downloaded')

  stream2.destroy()
  await once(stream2, 'close')

  t.alike(await drive2.get('/two'), buf2, 'Second blob is downloaded')
})

test('Initial status', async (t) => {
  const { drive1 } = await testEnv()

  const download = new DriveLiveDownload(drive1)
  t.is(download.state.status, 'checking', "initial status is 'checking'")
})

test('Unitialized drive with no data', async (t) => {
  // This test is important because it catches an edge case where a drive might
  // have been added by its key, but has never replicated, so it has no data so
  // the content feed will never be read from the header, which might result in
  // it forever being in the 'checking' status. This tests that we catch this
  // and resolve status to 'downloaded'.
  const { drive2 } = await testEnv()
  const download = new DriveLiveDownload(drive2)
  await waitForState(download, 'downloaded')
  t.is(
    download.state.status,
    'downloaded',
    'uninitialized drive without peers results in `downloaded` state'
  )
})

test('live download started before initial replication', async (t) => {
  const { drive1, drive2, replicate } = await testEnv()

  await drive1.put('/foo', randomBytes(TEST_BUF_SIZE))
  const drive1Entry = await drive1.entry('/foo')
  assert(drive1Entry)
  const {
    value: { blob: blob1 },
  } = drive1Entry

  const download = new DriveLiveDownload(drive2)
  await waitForState(download, 'downloaded')
  // initially drive2 is not replicating and empty, so we expect a 'downloaded' status
  t.is(download.state.status, 'downloaded')

  const stream = replicate()
  const blobCore2 = (await drive2.getBlobs())?.core
  assert(blobCore2)
  await waitForState(download, 'downloaded')

  // Can't use `drive2.get()` here because connected to replication stream, so
  // it would download anyway (no `waitFor = false` support for Hyperdrive yet)
  t.ok(
    await blobCore2.has(
      blob1.blockOffset,
      blob1.blockOffset + blob1.blockLength
    ),
    'First blob is downloaded'
  )
  t.ok(blob1.blockLength > 1, 'Blob is more than one block length')

  const expected = randomBytes(TEST_BUF_SIZE)
  await drive1.put('/bar', expected)

  await waitForState(download, 'downloaded')
  stream.destroy()
  await once(stream, 'close')

  t.alike(await drive2.get('/bar'), expected, 'Second blob is downloaded')
})

/**
 * @param {DriveLiveDownload} download
 * @param {(BlobDownloadState | BlobDownloadStateError)['status']} status
 * @returns {Promise<void>}
 */
async function waitForState(download, status) {
  return new Promise((res) => {
    download.on('state', function onState(state) {
      // console.log('download state', state)
      if (state.status !== status) return
      download.off('state', onState)
      res()
    })
  })
}

async function testEnv() {
  const store1 = new Corestore(() => new RAM())
  const store2 = new Corestore(() => new RAM())
  const drive1 = new Hyperdrive(store1)
  await drive1.ready()
  const drive2 = new Hyperdrive(store2, drive1.key)
  await drive2.ready()

  function replicate() {
    const s = store1.replicate(true)
    s.pipe(store2.replicate(false)).pipe(s)
    return s
  }

  return {
    drive1,
    drive2,
    replicate,
  }
}
