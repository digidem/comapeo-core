// @ts-check
import { LiveDownload } from '../../lib/blob-store/live-download.js'
import Hyperdrive from 'hyperdrive'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import test from 'brittle'
import { setTimeout } from 'timers/promises'
import { once } from 'events'
import { randomBytes } from 'node:crypto'

// Test with buffers that are 3 times the default blockSize for hyperblobs
const TEST_BUF_SIZE = 3 * 64 * 1024

test('live download', async t => {
  const { drive1, drive2, replicate } = await testEnv()

  await drive1.put('/foo', randomBytes(TEST_BUF_SIZE))
  const {
    value: { blob: blob1 }
  } = await drive1.entry('/foo')

  const stream = replicate()
  const blobCore2 = (await drive2.getBlobs()).core

  const download = new LiveDownload(drive2)
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

test('sparse live download', async t => {
  const { drive1, drive2, replicate } = await testEnv()

  const buf1 = randomBytes(TEST_BUF_SIZE)
  const buf2 = randomBytes(TEST_BUF_SIZE)

  await drive1.put('foo/one', buf1)
  await drive1.put('bar/one', randomBytes(TEST_BUF_SIZE))

  const stream = replicate()

  const download = new LiveDownload(drive2, { folder: '/foo' })
  await waitForState(download, 'downloaded')

  await drive1.put('foo/two', buf2)
  await drive1.put('bar/two', randomBytes(TEST_BUF_SIZE))
  await waitForState(download, 'downloaded')

  stream.destroy()
  await once(stream, 'close')

  t.alike(await drive2.get('/foo/one'), buf1)
  t.alike(await drive2.get('/foo/two'), buf2)
  await t.exception(() => drive2.get('/bar/one'), 'Block not available')
  await t.exception(() => drive2.get('/bar/two'), 'Block not available')
})

/** @returns {Promise<void>} */
async function waitForState (download, status) {
  return new Promise(res => {
    download.on('state', function onState (state) {
      if (state.status !== status) return
      download.off('state', onState)
      res()
    })
  })
}

async function testEnv () {
  const store1 = new Corestore(RAM)
  const store2 = new Corestore(RAM)
  const drive1 = new Hyperdrive(store1)
  await drive1.ready()
  const drive2 = new Hyperdrive(store2, drive1.key)
  await drive2.ready()

  function replicate () {
    const s = store1.replicate(true)
    s.pipe(store2.replicate(false)).pipe(s)
    return s
  }

  return {
    drive1,
    drive2,
    replicate
  }
}
