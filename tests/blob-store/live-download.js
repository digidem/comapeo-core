// @ts-check
import { LiveDownload } from '../../lib/blob-store/live-download.js'
import Hyperdrive from 'hyperdrive'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import test from 'brittle'

test('live download', async t => {
  const store1 = new Corestore(RAM)
  const store2 = new Corestore(RAM)
  const drive1 = new Hyperdrive(store1)
  await drive1.ready()
  const drive2 = new Hyperdrive(store2, drive1.key)

  await drive1.put('/foo/greeting', Buffer.from('hello'))

  const s = store1.replicate(true)
  s.pipe(store2.replicate(false)).pipe(s)

  const download = new LiveDownload(drive2)

  download.on('state', console.log)

  await waitForState(download, 'downloaded')

  await drive1.put('/foo/leaving', Buffer.from('goodbye'))

  await waitForState(download, 'downloaded')
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
