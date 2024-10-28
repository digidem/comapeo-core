import { TypedEmitter } from 'tiny-typed-emitter'
import { createEntriesStream } from './entries-stream.js'
import { pathPrefixesFromFilter } from './utils.js'

/** @import Hyperdrive from 'hyperdrive' */

// This class contains a large amount of parallel async code, and contains lots
// of references and some listeners that need to be deferenced when this class
// is finished with (e.g when a download is complete, or there is an error).
// I've highlighted lines which could throw an error which would put the
// downloader in an "error" state. Currently this does not emit an "error"
// event.

/**
 * Like hyperdrive.download() but 'live', and for multiple drives.
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
  #pathPrefixes

  /**
   * @param {import('./index.js').THyperdriveIndex} driveIndex
   * @param {object} [options]
   * @param {import('../types.js').BlobFilter | null} [options.filter] Filter blobs of specific types and/or sizes to download
   */
  constructor(driveIndex, { filter } = {}) {
    super()
    this.#pathPrefixes = filter ? pathPrefixesFromFilter(filter) : []
    this.#driveIndex = driveIndex

    this.#entriesStream = createEntriesStream(driveIndex, { live: true })
    this.#entriesStream.once('error', this.#ac.abort)

    this.#ac.signal.addEventListener('abort', this.#cleanup, { once: true })

    this.#processEntriesPromise = this.#processEntries()
    this.#processEntriesPromise.catch(this.#ac.abort)
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
      // This loop will never end unless thrown, since this is a live stream
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
  async #processEntry(blobsCore, { blockOffset: start, blockLength: length }) {
    const end = start + length
    const have = await blobsCore.has(start, end)
    this.#ac.signal.throwIfAborted()
    if (have) return
    const download = blobsCore.download({ start, end })
    this.#queuedDownloads.add(download)
    download
      .done()
      .catch((e) => {
        // TODO: emit error rather than abort downloader if error here
        this.#ac.abort(e)
      })
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

  #cleanup = () => {
    for (const download of this.#queuedDownloads) download.destroy()
    this.#ac.signal.removeEventListener('abort', this.#cleanup)
    this.#entriesStream.removeListener('error', this.#ac.abort)
    // queuedDownloads should always be empty by here anyway, but just in case.
    this.#queuedDownloads.clear()
    this.#entriesStream.destroy()
  }
}
