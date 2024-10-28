import { TypedEmitter } from 'tiny-typed-emitter'
import { once } from 'node:events'
import { createEntriesStream } from './entries-stream.js'

/** @import Hyperdrive from 'hyperdrive' */

/**
 * Download statuses:
 * - 'processingEntries' - checking initial entries from blob index cores to determine what to download
 * - 'downloading' - one or more blob chunks are currently downloading
 * - 'downloaded' - all blob chunks that match the filter have been downloaded (non-live downloaders only)
 * - 'waiting' - live downloader is waiting for new entries from sync
 */

/**
 * @typedef {object} BlobDownloadState
 * @property {number} haveCount The number of files already downloaded
 * @property {number} haveBytes The bytes already downloaded
 * @property {number} wantCount The number of files pending download
 * @property {number} wantBytes The bytes pending download
 * @property {null} error If status = 'error' then this will be an Error object
 * @property {'processingEntries' | 'downloading' | 'downloaded' | 'waiting'} status
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
  queuedDownloads = new Set()
  /**
   * The initial length of each drive, if > 0. Once we have processed entries up
   * to the initial length, we remove the drive from this map. We use this map
   * to determine whether we are in the "processing initial entries" state, or
   * if we are downloading, downloaded, or waiting for new entries.
   *
   * @type {Map<string, number>}
   */
  initialLengthsByDriveId = new Map()
  wantBytes = 0
  error = null
  processingInitialEntries = true
  live

  constructor({ live = false } = {}) {
    this.live = live
  }

  /** @type {BlobDownloadState | BlobDownloadStateError} */
  get value() {
    if (this.error) {
      return {
        haveCount: this.haveCount,
        haveBytes: this.haveBytes,
        wantCount: this.queuedDownloads.size,
        wantBytes: this.wantBytes,
        error: this.error,
        status: 'error',
      }
    }
    /** @type {BlobDownloadState['status']} */
    let status
    if (this.processingInitialEntries) {
      status = 'processingEntries'
    } else if (this.queuedDownloads.size) {
      status = 'downloading'
    } else if (this.live) {
      status = 'waiting'
    } else {
      status = 'downloaded'
    }
    return {
      haveCount: this.haveCount,
      haveBytes: this.haveBytes,
      wantCount: this.queuedDownloads.size,
      wantBytes: this.wantBytes,
      error: null,
      status,
    }
  }
}

/**
 * Like hyperdrive.download() but optionally 'live', and for multiple drives.
 * Emits `state` events with the current download state.
 *
 * NB: unlike hyperdrive.download(), this will also download deleted and
 * previous versions of blobs - we don't currently support editing or deleting
 * of blobs, so this should not be an issue, and if we do in the future,
 * downloading deleted and previous versions may be desirable behavior anyway
 *
 * @extends {TypedEmitter<BlobDownloadEvents>}
 */
export class Downloader extends TypedEmitter {
  /** @type {Map<string, Hyperdrive>} */
  #drivesById = new Map()
  #entriesStream
  #processEntriesPromise
  #ac = new AbortController()
  #state
  #live
  #pathPrefixes

  /**
   * @param {Array<import('hyperdrive')>} drives
   * @param {object} [options]
   * @param {import('../types.js').BlobFilter} [options.filter] Filter blobs of specific types and/or sizes to download
   * @param {boolean} [options.live=false] If true, the downloader will never be done, and will wait for new entries from the drives
   */
  constructor(drives, { filter, live = false } = {}) {
    super()
    this.#live = live
    this.#state = new State({ live })
    this.#pathPrefixes = filter ? pathPrefixesFromFilters(filter) : []

    this.#entriesStream = createEntriesStream(drives, { live })
    this.#entriesStream.once('error', this.#ac.abort)

    this.#ac.signal.addEventListener('abort', this.#cleanup, { once: true })

    this.#processEntriesPromise = this.#processEntries(drives)
    this.#processEntriesPromise.catch(this.#ac.abort)
  }

  /**
   * Start processing entries from the entries stream - if an entry matches the
   * filter, and we don't already have it, queue it for download. If the
   * Downloader is live, this method will never resolve, otherwise it will
   * resolve when all the entries have been processed, but not necessarily
   * downloaded.
   *
   * @param {Hyperdrive[]} drives
   */
  async #processEntries(drives) {
    await Promise.all(drives.map((drive) => this[kAddDrive](drive)))
    for await (const entry of this.#entriesStream) {
      this.#ac.signal.throwIfAborted()
      const {
        seq,
        driveId,
        key: filePath,
        value: { blob },
      } = entry
      // If we have processed all entries up to the initial length of the drive,
      // the we've processed the "initial entries" in the drive.
      if (this.#state.initialLengthsByDriveId.has(driveId)) {
        const initialLength = this.#state.initialLengthsByDriveId.get(driveId)
        if (typeof initialLength === 'number' && seq >= initialLength - 1) {
          this.#state.initialLengthsByDriveId.delete(driveId)
        }
      }
      if (!this.#shouldDownloadFile(filePath)) continue
      const drive = this.#drivesById.get(driveId)
      if (!drive) throw new Error('Drive not found: ' + driveId)
      const core = await getBlobsCore(drive, { signal: this.#ac.signal })
      this.#ac.signal.throwIfAborted()
      await this.#processEntry(core, blob)
      this.#ac.signal.throwIfAborted()
      this.emit('state', this.#state.value)
      // This loop will never end if live.
    }
  }

  /** @param {string} filePath */
  #shouldDownloadFile(filePath) {
    if (!this.#pathPrefixes.length) return true
    return this.#pathPrefixes.some((prefix) => filePath.startsWith(prefix))
  }

  /**
   * Update state and queue missing entries for download
   *
   * @param {import('hypercore')} blobsCore
   * @param {{ blockOffset: number, blockLength: number, byteLength: number }} blob
   */
  async #processEntry(
    blobsCore,
    { blockOffset: start, blockLength: length, byteLength }
  ) {
    const end = start + length
    const have = await blobsCore.has(start, end)
    this.#ac.signal.throwIfAborted()
    if (have) {
      this.#state.haveCount++
      this.#state.haveBytes += byteLength
    } else {
      this.#state.wantBytes += byteLength
      const download = blobsCore.download({ start, end })
      this.#state.queuedDownloads.add(download)
      download
        .done()
        .then(() => {
          this.#state.haveCount++
          this.#state.haveBytes += byteLength
          this.#state.wantBytes -= byteLength
          this.emit('state', this.#state.value)
        })
        .catch((e) => {
          this.#state.error = e
          this.#ac.abort(e)
        })
        .finally(() => {
          this.#state.queuedDownloads.delete(download)
        })
    }
  }

  /** @param {import('hyperdrive')} drive */
  async [kAddDrive](drive) {
    this.#ac.signal.throwIfAborted()
    await drive.ready()
    this.#ac.signal.throwIfAborted()
    if (!drive.key) throw new Error('Unexpected: missing drive key') // should never happen
    this.#drivesById.set(drive.key.toString('hex'), drive)
    if (drive.db.core.length === 0) return
    this.#state.initialLengthsByDriveId.set(
      drive.key.toString('hex'),
      drive.db.core.length
    )
  }

  destroy() {
    this.#ac.abort()
  }

  async done() {
    if (this.#live) throw new Error('Live downloader will never be done')
    await this.#processEntriesPromise
    await Promise.all(
      Array.from(this.#state.queuedDownloads, (download) => download.done())
    )
    this.#cleanup()
  }

  #cleanup = () => {
    for (const download of this.#state.queuedDownloads) download.destroy()
    this.#ac.signal.removeEventListener('abort', this.#cleanup)
    this.#entriesStream.removeListener('error', this.#ac.abort)
    this.#state.queuedDownloads.clear()
    this.#drivesById.clear()
    this.#entriesStream.destroy()
  }

  /**
   * @returns {BlobDownloadState | BlobDownloadStateError}
   */
  get state() {
    return this.#state.value
  }
}

/**
 * This is a more generic version of the BlobFilter type that can filter unknown
 * blob types and variants from the blob store.
 *
 * @typedef {{ [type: string]: readonly string[] }} GenericBlobFilter
 */

/**
 * Convert a filter to an array of path prefixes that match the filter. These
 * path prefixes can be used to filter entries by
 * `entry.key.startsWith(pathPrefix)`.
 *
 * @param {GenericBlobFilter} filter
 * @returns {readonly string[]} array of folders that match the filter
 */
function pathPrefixesFromFilters(filter) {
  const pathPrefixes = []
  for (const [type, variants] of Object.entries(filter)) {
    const dedupedVariants = new Set(variants)
    for (const variant of dedupedVariants) {
      pathPrefixes.push(`/${type}/${variant}/`)
    }
  }
  return filterSubfoldersAndDuplicates(pathPrefixes)
}

/**
 * Take an array of folders, remove any folders that are duplicates or subfolders of another
 *
 * @param {readonly string[]} folders
 * @returns {readonly string[]}
 */
function filterSubfoldersAndDuplicates(folders) {
  /** @type {Set<string>} */
  const filtered = new Set()
  for (let i = 0; i < folders.length; i++) {
    const isSubfolderOfAnotherFolder = !!folders.find((folder, index) => {
      if (index === i) return false
      // Deduping is done by the Set, if we do it here we don't get either
      if (folder === folders[i]) return true
      return folders[i].startsWith(folder)
    })
    if (!isSubfolderOfAnotherFolder) filtered.add(folders[i])
  }
  return Array.from(filtered)
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
