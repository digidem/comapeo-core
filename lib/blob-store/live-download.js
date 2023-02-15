// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'

/**
 * @typedef {object} BlobDownloadState
 * @property {number} haveCount The number of files already downloaded
 * @property {number} haveBytes The bytes already downloaded
 * @property {number} wantCount The number of files pending download
 * @property {number} wantBytes The bytes pending download
 * @property {null} error If status = 'error' then this will be an Error object
 * @property {'checking' | 'downloading' | 'downloaded' | 'aborted'} status
 */

/** @typedef {Omit<BlobDownloadState, 'error' | 'status'> & { status: 'error', error: Error }} BlobDownloadStateError */

/**
 * @typedef {object} BlobDownloadEvents
 * @property {(state: BlobDownloadState | BlobDownloadStateError ) => void} state Emitted with the current download state whenever it changes (not emitted during initial 'checking' status)
 */

/**
 * LiveDownload class
 * @extends {TypedEmitter<BlobDownloadEvents>}
 */
export class LiveDownload extends TypedEmitter {
  /** @type {Set<DriveLiveDownload>} */
  #driveLiveDownloads = new Set()
  #signal

  /**
   * Like drive.download() but 'live', and for multiple drives
   * @param {Iterable<import('hyperdrive')>} drives
   * @param {import('./index.js').InternalDriveEmitter} emitter
   * @param {object} options
   * @param {string} [options.folder]
   * @param {AbortSignal} [options.signal]
   */
  constructor(drives, emitter, { folder = '/', signal }) {
    super()
    this.#signal = signal
    for (const drive of drives) {
      const download = new DriveLiveDownload(drive, { folder, signal })
      this.#driveLiveDownloads.add(download)
      download.on('state', () => this.emit('state', this.state))
    }
  }

  /**
   * @returns {BlobDownloadState | BlobDownloadStateError}
   */
  get state () {
    /** @type {BlobDownloadState | BlobDownloadStateError} */
    let combinedState = {
      haveCount: 0,
      haveBytes: 0,
      wantCount: 0,
      wantBytes: 0,
      error: null,
      status: 'downloaded'
    }
    for (const { state } of this.#driveLiveDownloads) {
      combinedState.haveCount += state.haveCount
      combinedState.haveBytes += state.haveBytes
      combinedState.wantCount += state.wantCount
      combinedState.wantBytes += state.wantBytes
      if (state.status === combinedState.status) continue
      if (state.status === 'error') {
        combinedState = { ...combinedState, error: state.error, status: 'error'}
      } else if (state.status === 'downloading') {
        //
      }
    }
    if (this.#signal?.aborted) {
      combinedState.status = 'aborted'
    }
    return combinedState
  }
}

/**
 * LiveDownload class
 * @extends {TypedEmitter<BlobDownloadEvents>}
 */
export class DriveLiveDownload extends TypedEmitter {
  #haveCount = 0
  #haveBytes = 0
  #wantBytes = 0
  #initialCheck = true
  #drive
  #folder
  /** @type {Set<{ done(): Promise<void>, destroy(): void }>} */
  #downloads = new Set()
  /** @type {Error | null} */
  #error = null
  #signal

  /**
   * Like drive.download() but 'live',
   * @param {import('hyperdrive')} drive
   * @param {object} options
   * @param {string} [options.folder]
   * @param {AbortSignal} [options.signal]
   */
  constructor (drive, { folder = '/', signal } = {}) {
    super()
    this.#drive = drive
    this.#folder = folder
    this.#signal = signal
    if (signal && !signal.aborted) {
      signal.addEventListener(
        'abort',
        () => {
          for (const download of this.#downloads) download.destroy()
          this.#downloads.clear()
          this.emit('state', this.state)
        },
        { once: true }
      )
    }
    this.#start().catch(this.#handleError.bind(this))
  }

  /**
   * @returns {BlobDownloadState | BlobDownloadStateError}
   */
  get state () {
    if (this.#error)
      return {
        haveCount: this.#haveCount,
        haveBytes: this.#haveBytes,
        wantCount: this.#downloads.size,
        wantBytes: this.#wantBytes,
        error: this.#error,
        status: 'error'
      }
    return {
      haveCount: this.#haveCount,
      haveBytes: this.#haveBytes,
      wantCount: this.#downloads.size,
      wantBytes: this.#wantBytes,
      error: null,
      status: this.#signal?.aborted
        ? 'aborted'
        : this.#initialCheck
        ? 'checking'
        : this.#downloads.size > 0
        ? 'downloading'
        : 'downloaded'
    }
  }

  async #start () {
    const blobs = await this.#drive.getBlobs()
    /* c8 ignore next */
    if (this.#signal?.aborted) return // Can't get here in tests
    let seq = 0

    // Don't emit state during initial iteration of existing data, since this is
    // likely fast and not useful UX feedback
    const entryStream = this.#drive.list(this.#folder)
    if (this.#signal) {
      this.#signal.addEventListener(
        'abort',
        () => entryStream.destroy(),
        { once: true }
      )
    }
    for await (const entry of entryStream) {
      if (this.#signal?.aborted) return
      seq = Math.max(seq, entry.seq)
      const { blob } = entry.value
      if (!blob) continue
      await this.#processEntry(blobs.core, blob)
    }

    if (this.#signal?.aborted) return
    this.#initialCheck = false
    this.emit('state', this.state)

    const filesDb = this.#drive.files
    // This will also download old versions of files, but it is the only way to
    // get a live stream from a Hyperbee, however we currently do not support
    // edits of blobs, so this should not be an issue
    const historyStream = filesDb.createHistoryStream({ live: true, gt: seq })
    if (this.#signal) {
      this.#signal.addEventListener(
        'abort',
        () => historyStream.destroy(),
        { once: true }
      )
    }
    for await (const entry of historyStream) {
      if (this.#signal?.aborted) return
      const { blob } = entry.value
      if (!blob) continue
      if (!entry.key.startsWith(this.#folder)) continue
      // TODO: consider cancelling downloads when a delete entry is found?
      // Probably not worth the extra work.
      if (entry.type !== 'put') continue
      const wasDownloaded = this.state.status === 'downloaded'
      await this.#processEntry(blobs.core, blob)
      if (wasDownloaded && this.state.status === 'downloading') {
        // State has changed, so emit
        this.emit('state', this.state)
      }
    }
    /* c8 ignore next 2 */
    // Could possibly reach here if aborted after check in loop, hard to test
    this.emit('state', this.state)
  }

  /** @param {Error} e */
  #handleError(e) {
    this.#error = e
    this.emit('state', this.state)
  }

  /**
   * Update state and queue missing entries for download
   *
   * @param {import('hypercore').default} core
   * @param {{ blockOffset: number, blockLength: number, byteLength: number }} blob
   */
  async #processEntry (
    core,
    { blockOffset: start, blockLength: length, byteLength }
  ) {
    const end = start + length
    const have = await core.has(start, end)
    if (have) {
      this.#haveCount++
      this.#haveBytes += byteLength
    } else {
      this.#wantBytes += byteLength
      const download = core.download({ start, end })
      this.#downloads.add(download)
      download
        .done()
        .then(() => {
          this.#downloads.delete(download)
          this.#haveCount++
          this.#haveBytes += byteLength
          this.#wantBytes -= byteLength
          this.emit('state', this.state)
        })
        .catch(this.#handleError.bind(this))
    }
  }
}
