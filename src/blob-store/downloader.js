import { TypedEmitter } from 'tiny-typed-emitter'
import { createEntriesStream } from './entries-stream.js'
import { filePathMatchesFilter } from './utils.js'

/** @import Hyperdrive from 'hyperdrive' */
/** @import { BlobFilter } from '../types.js' */

/**
 * Like hyperdrive.download() but 'live', and for multiple drives.
 *
 * Will emit an 'error' event for any unexpected errors. A consumer must attach
 * an error listener to avoid uncaught errors. Sources of errors include:
 *
 * - If the entries stream emits an error
 * - If a drive referenced in an entry is not found
 * - If core.has() throws (e.g. if hypercore is closed)
 * - If core.download().done() throws, which should not happen according to
 *   current hypercore code.
 * - If the entries stream ends unexpectedly (it should be live and not end)
 *
 * NB: unlike hyperdrive.download(), this will also download deleted and
 * previous versions of blobs - we don't currently support editing or deleting
 * of blobs, so this should not be an issue, and if we do in the future,
 * downloading deleted and previous versions may be desirable behavior anyway
 *
 * @extends {TypedEmitter<{ error: (error: Error) => void }>}
 */
export class Downloader extends TypedEmitter {
  /** @type {import('./index.js').THyperdriveIndex} */
  #driveIndex
  /** @type {Set<{ done(): Promise<void>, destroy(): void }>} */
  #queuedDownloads = new Set()
  #entriesStream
  #processEntriesPromise
  #ac = new AbortController()
  #shouldDownloadFile

  /**
   * @param {import('./index.js').THyperdriveIndex} driveIndex
   * @param {object} [options]
   * @param {import('../types.js').BlobFilter | null} [options.filter] Filter blobs of specific types and/or sizes to download
   */
  constructor(driveIndex, { filter } = {}) {
    super()
    this.#driveIndex = driveIndex

    this.#shouldDownloadFile = filter
      ? filePathMatchesFilter.bind(null, filter)
      : () => true

    this.#entriesStream = createEntriesStream(driveIndex, { live: true })
    this.#entriesStream.once('error', this.#handleError)

    this.#ac.signal.addEventListener('abort', this.#handleAbort, { once: true })

    this.#processEntriesPromise = this.#processEntries()
    this.#processEntriesPromise.catch(this.#handleError)
  }

  /**
   * Start processing entries from the entries stream - if an entry matches the
   * filter, and we don't already have it, queue it for download. If the
   * Downloader is live, this method will never resolve, otherwise it will
   * resolve when all the entries have been processed and downloaded.
   */
  async #processEntries() {
    for await (const entry of this.#entriesStream) {
      this.#ac.signal.throwIfAborted()
      const {
        driveId,
        key: filePath,
        value: { blob },
      } = entry
      if (!this.#shouldDownloadFile(filePath)) continue
      const drive = this.#driveIndex.get(driveId)
      // ERROR HANDLING: this is unexpected and should not happen
      if (!drive) throw new Error('Drive not found: ' + driveId)
      const blobs = await drive.getBlobs()
      this.#ac.signal.throwIfAborted()
      await this.#processEntry(blobs.core, blob)
      this.#ac.signal.throwIfAborted()
    }
    throw new Error('Entries stream ended unexpectedly')
  }

  /**
   * Update state and queue missing entries for download
   *
   * @param {import('hypercore')} blobsCore
   * @param {{ blockOffset: number, blockLength: number, byteLength: number }} blob
   */
  async #processEntry(blobsCore, { blockOffset: start, blockLength: length }) {
    const end = start + length
    const have = await blobsCore.has(start, end)
    this.#ac.signal.throwIfAborted()
    if (have) return
    const download = blobsCore.download({ start, end })
    this.#queuedDownloads.add(download)
    download
      .done()
      // According to the code, this should never throw.
      .catch(this.#handleError)
      .finally(() => {
        this.#queuedDownloads.delete(download)
      })
  }

  /**
   * Cancel the downloads and clean up resources.
   */
  destroy() {
    this.#ac.abort()
  }

  /** @param {Error} error */
  #handleError = (error) => {
    if (this.#ac.signal.aborted) return
    this.emit('error', error)
    this.#ac.abort(error)
  }

  #handleAbort = () => {
    for (const download of this.#queuedDownloads) download.destroy()
    this.#ac.signal.removeEventListener('abort', this.#handleAbort)
    this.#entriesStream.removeListener('error', this.#ac.abort)
    // queuedDownloads is likely to be empty here anyway, but clear just in case.
    this.#queuedDownloads.clear()
    this.#entriesStream.destroy()
  }
}
