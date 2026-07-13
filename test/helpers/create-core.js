import { temporaryDirectory } from 'tempy'
import fsPromises from 'node:fs/promises'
import Hypercore from 'hypercore'
import { patchCoreReplicator } from '../../src/utils.js'

/*** @param {import('node:test').TestContext} t
 * @param {any} [key]
 * */
export async function createCore(t, key) {
  const storage = temporaryDirectory()

  t.after(async () =>
    fsPromises.rm(storage, {
      recursive: true,
    })
  )
  const core = new Hypercore(storage, key)

  // Send over entire local bitfield
  core.on('peer-add', (peer) => {
    sendWants(core, peer)
  })

  core.once('append', () => {
    for (const peer of core.peers) {
      sendWants(core, peer)
    }
  })

  patchCoreReplicator(core)
  await core.ready()
  return core
}

/**
 * @param {Hypercore} core
 * @param {import('../../src/types.js').HypercorePeer} peer
 */
function sendWants(core, peer) {
  // How much of the contiguousLength do we have locally?
  const contig = /** @type {number} */ (
    // @ts-ignore
    Math.min(peer.core.state.length, peer.core.header.hints.contiguousLength)
  )

  // @ts-ignore
  for (const msg of peer.core.bitfield.want(contig, core.length)) {
    // @ts-ignore
    peer.wireBitfield.send(msg)
  }
}
