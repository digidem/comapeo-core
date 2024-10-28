import SubEncoder from 'sub-encoder'
import mergeStreams from '@sindresorhus/merge-streams'
import { Transform } from 'node:stream'

/** @import Hyperdrive from 'hyperdrive' */
/** @import { BlobStoreEntriesStream } from '../types.js' */

const keyEncoding = new SubEncoder('files', 'utf-8')

/**
 *
 * @param {import('./index.js').THyperdriveIndex} driveIndex
 * @param {object} opts
 * @param {boolean} [opts.live=false]
 * @returns {BlobStoreEntriesStream}
 */
export function createEntriesStream(driveIndex, { live = false } = {}) {
  const mergedEntriesStreams = mergeStreams(
    [...driveIndex].map((drive) => getHistoryStream(drive.db, { live }))
  )
  driveIndex.on('add-drive', addDrive)
  // Close is always emitted, so we can use it to remove the listener
  mergedEntriesStreams.once('close', () =>
    driveIndex.off('add-drive', addDrive)
  )
  return mergedEntriesStreams

  /** @param {Hyperdrive} drive */
  function addDrive(drive) {
    mergedEntriesStreams.add(getHistoryStream(drive.db, { live }))
  }
}

/**
 *
 * @param {import('hyperbee')} bee
 * @param {object} opts
 * @param {boolean} opts.live
 */
function getHistoryStream(bee, { live }) {
  // This will also include old versions of files, but it is the only way to
  // get a live stream from a Hyperbee, however we currently do not support
  // edits of blobs, so this should not be an issue, and the consequence is
  // that old versions are downloaded too, which is acceptable.
  const historyStream = bee.createHistoryStream({
    live,
    // `keyEncoding` is necessary because hyperdrive stores file index data
    // under the `files` sub-encoding key
    keyEncoding,
  })
  return historyStream.pipe(new AddDriveIds(bee.core))
}

class AddDriveIds extends Transform {
  #core
  #discoveryKey

  /** @param {import('hypercore')} core */
  constructor(core) {
    super({ objectMode: true })
    this.#core = core
    this.#discoveryKey = core.discoveryKey?.toString('hex')
  }

  /** @type {Transform['_transform']} */
  _transform(entry, _, callback) {
    // Minimal performance optimization to only call toString() once.
    // core.discoveryKey will always be defined by the time it starts
    // streaming, but could be null when the instance is first created.
    const driveId =
      this.#discoveryKey || this.#core.discoveryKey?.toString('hex')
    callback(null, { ...entry, driveId })
  }
}
