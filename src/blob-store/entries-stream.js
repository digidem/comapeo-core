import SubEncoder from 'sub-encoder'
import mergeStreams from '@sindresorhus/merge-streams'
import { Transform, pipeline } from 'node:stream'
import { noop } from '../utils.js'
import ensureError from 'ensure-error'

/** @import Hyperdrive from 'hyperdrive' */
/** @import { BlobStoreEntriesStream } from '../types.js' */
/** @import { THyperdriveIndex } from './hyperdrive-index.js' */

const keyEncoding = new SubEncoder('files', 'utf-8')

/**
 *
 * @param {THyperdriveIndex} driveIndex
 * @param {object} opts
 * @param {boolean} [opts.live=false]
 * @returns {BlobStoreEntriesStream}
 */
export function createEntriesStream(driveIndex, { live = false } = {}) {
  const mergedEntriesStreams = mergeStreams(
    [...driveIndex].map((drive) => getHistoryStream(drive, { live }))
  )
  driveIndex.on('add-drive', addDrive)
  // Close is always emitted, so we can use it to remove the listener
  mergedEntriesStreams.once('close', () =>
    driveIndex.off('add-drive', addDrive)
  )
  return mergedEntriesStreams

  /** @param {Hyperdrive} drive */
  function addDrive(drive) {
    mergedEntriesStreams.add(getHistoryStream(drive, { live }))
  }
}

/**
 *
 * @param {Hyperdrive} drive
 * @param {object} opts
 * @param {boolean} opts.live
 */
function getHistoryStream(drive, { live }) {
  // This will also include old versions of files, but it is the only way to
  // get a live stream from a Hyperbee, however we currently do not support
  // edits of blobs, so this should not be an issue, and the consequence is
  // that old versions are downloaded too, which is acceptable.
  const historyStream = drive.db.createHistoryStream({
    live,
    // `keyEncoding` is necessary because hyperdrive stores file index data
    // under the `files` sub-encoding key
    keyEncoding,
  })
  return pipeline(historyStream, new AddDriveIds(drive), noop)
}

class AddDriveIds extends Transform {
  #drive
  /** @type {string | undefined} */
  #cachedDriveId
  /** @type {string | undefined} */
  #cachedBlobCoreId

  /** @param {Hyperdrive} drive */
  constructor(drive) {
    super({ objectMode: true })
    this.#drive = drive
    this.#cachedDriveId = drive.db.core.discoveryKey?.toString('hex')
  }

  get #driveId() {
    // Minimal performance optimization to only call toString() once.
    // core.discoveryKey will always be defined by the time it starts
    // streaming, but could be null when the instance is first created.
    if (this.#cachedDriveId) {
      return this.#cachedDriveId
    } else {
      this.#cachedDriveId = this.#drive.db.core.discoveryKey?.toString('hex')
      return this.#cachedDriveId
    }
  }

  async #getBlobCoreId() {
    if (this.#cachedBlobCoreId) return this.#cachedBlobCoreId
    const blobs = await this.#drive.getBlobs()
    this.#cachedBlobCoreId = blobs.core.discoveryKey?.toString('hex')
    return this.#cachedBlobCoreId
  }

  /** @type {Transform['_transform']} */
  _transform(entry, _, callback) {
    if (!this.#driveId) {
      return callback(new Error('Drive discovery key unexpectedly missing'))
    }
    this.#getBlobCoreId()
      .then((blobCoreId) => {
        if (!blobCoreId) {
          return callback(
            new Error('Blob core discovery key unexpectedly missing')
          )
        }
        callback(null, { ...entry, driveId: this.#driveId, blobCoreId })
      })
      .catch((reason) => callback(ensureError(reason)))
  }
}
