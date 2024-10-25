import { TypedEmitter } from 'tiny-typed-emitter'
import { once } from 'node:events'
import { createEntriesStream } from './entries-stream.js'
import { noop } from '../utils.js'
/** @import Hyperdrive from 'hyperdrive' */

/**
 * @typedef {object} BlobDownloadState
 * @property {number} haveCount The number of files already downloaded
 * @property {number} haveBytes The bytes already downloaded
 * @property {number} wantCount The number of files pending download
 * @property {number} wantBytes The bytes pending download
 * @property {null} error If status = 'error' then this will be an Error object
 * @property {'pending' | 'downloading' | 'downloaded'} status
 */

/** @typedef {Omit<BlobDownloadState, 'error' | 'status'> & { status: 'error', error: Error }} BlobDownloadStateError */

/**
 * @typedef {object} BlobDownloadEvents
 * @property {(state: BlobDownloadState | BlobDownloadStateError ) => void} state Emitted with the current download state whenever it changes (not emitted during initial 'checking' status)
 */

const kAddDrive = Symbol('addDrive to downloader')

/**
 * @param {Downloader} downloader
 * @param {Hyperdrive} drive
 */
export function addDriveToDownloader(downloader, drive) {
  downloader[kAddDrive](drive)
}

class State {
  haveCount = 0
  haveBytes = 0
  /** @type {Set<{ done(): Promise<void>, destroy(): void }>} */
  downloads = new Set()
  wantBytes = 0
  error = null

  constructor({ live = false } = {}) {
    /** @type {'pending' | 'downloading' | 'downloaded'} */
    this.status = live ? 'pending' : 'downloading'
  }

  /** @type {BlobDownloadState | BlobDownloadStateError} */
  get value() {
    if (this.error) {
      return {
        haveCount: this.haveCount,
        haveBytes: this.haveBytes,
        wantCount: this.downloads.size,
        wantBytes: this.wantBytes,
        error: this.error,
        status: 'error',
      }
    }
    return {
      haveCount: this.haveCount,
      haveBytes: this.haveBytes,
      wantCount: this.downloads.size,
      wantBytes: this.wantBytes,
      error: null,
      status: this.status,
    }
  }
}

/**
 * Hyperdrive Downloader class, like drive.download() for multiple drives, but
 * will download all previous versions that match the filter, and is optionally
 * "live", which will download any new files from replicating peers.
 *
 * @extends {TypedEmitter<BlobDownloadEvents>}
 */
export class Downloader extends TypedEmitter {
  /** @type {Map<string, Hyperdrive>} */
  #drivesById = new Map()
  #entriesStream
  #donePromise
  #ac = new AbortController()
  #state

  /**
   * Like drive.download() but 'live', and for multiple drives
   * @param {Array<import('hyperdrive')>} drives
   * @param {object} [options]
   * @param {import('../types.js').BlobFilter} [options.filter] Filter blobs of specific types and/or sizes to download
   * @param {boolean} [options.live=false]
   */
  constructor(drives, { filter, live = false } = {}) {
    super()
    this.#state = new State({ live })

    this.#entriesStream = createEntriesStream(drives, {
      live,
      folders: filterToFolders(filter),
    })

    this.#donePromise = this.#start()
    this.#donePromise.catch(noop)
  }

  async #start() {
    for await (const entry of this.#entriesStream) {
      this.#ac.signal.throwIfAborted()
      const {
        driveId,
        value: { blob },
      } = entry
      const drive = this.#drivesById.get(driveId)
      if (!drive) throw new Error('Drive not found: ' + driveId)
      const core = await getBlobsCore(drive, { signal: this.#ac.signal })
      await this.#processEntry(core, blob)
    }
  }

  /**
   * Update state and queue missing entries for download
   *
   * @param {import('hypercore')} core
   * @param {{ blockOffset: number, blockLength: number, byteLength: number }} blob
   */
  async #processEntry(
    core,
    { blockOffset: start, blockLength: length, byteLength }
  ) {
    const end = start + length
    const have = await core.has(start, end)
    this.#ac.signal.throwIfAborted()
    if (have) {
      this.#state.haveCount++
      this.#state.haveBytes += byteLength
    } else {
      this.#state.wantBytes += byteLength
      const download = core.download({ start, end })
      this.#state.downloads.add(download)
      download
        .done()
        .then(() => {
          this.#state.haveCount++
          this.#state.haveBytes += byteLength
          this.#state.wantBytes -= byteLength
        })
        .catch((e) => {
          this.#state.error = e
          this.#ac.abort(e)
        })
        .finally(() => {
          this.#state.downloads.delete(download)
          this.emit('state', this.#state.value)
        })
    }
  }

  /** @param {import('hyperdrive')} drive */
  [kAddDrive](drive) {
    if (this.#ac.signal.aborted) return
    if (drive.key) {
      this.#drivesById.set(drive.key.toString('hex'), drive)
      return
    }
    drive
      .ready()
      .then(() => {
        if (!drive.key) return // should never happen
        this.#drivesById.set(drive.key.toString('hex'), drive)
      })
      .catch(noop)
  }

  done() {
    return this.#donePromise
  }

  /**
   * @param {Error} [reason]
   */
  destroy(reason) {
    this.#ac.abort(reason)
  }

  /**
   * @returns {BlobDownloadState | BlobDownloadStateError}
   */
  get state() {
    return this.#state.value
  }
}

/**
 * Convert a filter to an array of folders that need to be downloaded
 *
 * @param {import('../types.js').BlobFilter} [filter]
 * @returns {string[]} array of folders that match the filter
 */
function filterToFolders(filter) {
  if (!filter) return ['/']
  const folders = []
  for (const [
    type,
    variants,
  ] of /** @type {import('type-fest').Entries<typeof filter>} */ (
    Object.entries(filter)
  )) {
    // De-dupe variants array
    for (const variant of new Set(variants)) {
      folders.push(makePath({ type, variant }))
    }
  }
  return folders
}

/** @param {Pick<import('../types.js').BlobId, 'type' | 'variant'>} opts */
function makePath({ type, variant }) {
  return `/${type}/${variant}`
}

/**
 * @param {Hyperdrive} drive
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<import('hypercore')>}
 */
async function getBlobsCore(drive, { signal } = {}) {
  if (drive.blobs) return drive.blobs.core
  const [blobs] = await once(drive, 'blobs', { signal })
  return blobs.core
}
