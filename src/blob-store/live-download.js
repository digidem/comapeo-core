// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import { once } from 'node:events'
import SubEncoder from 'sub-encoder'

const keyEncoding = new SubEncoder('files', 'utf-8')

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
   * @param {import('../types.js').BlobFilter} [options.filter] Filter blobs of specific types and/or sizes to download
   * @param {AbortSignal} [options.signal]
   */
  constructor(drives, emitter, { filter, signal }) {
    super()
    this.#signal = signal

    const emitState = () => {
      this.emit('state', this.state)
    }

    /** @param {import('hyperdrive')} drive */
    const addDrive = (drive) => {
      const download = new DriveLiveDownload(drive, {
        filter,
        signal,
      })
      this.#driveLiveDownloads.add(download)
      download.on('state', emitState)
    }

    for (const drive of drives) addDrive(drive)
    emitter.on('add-drive', addDrive)

    signal?.addEventListener(
      'abort',
      () => {
        emitter.off('add-drive', addDrive)
        for (const download of this.#driveLiveDownloads) {
          download.off('state', emitState)
        }
      },
      { once: true }
    )
  }

  /**
   * @returns {BlobDownloadState | BlobDownloadStateError}
   */
  get state() {
    return combineStates(this.#driveLiveDownloads, { signal: this.#signal })
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
  #folders
  /** @type {Set<{ done(): Promise<void>, destroy(): void }>} */
  #downloads = new Set()
  /** @type {Error | null} */
  #error = null
  #signal

  /**
   * Like drive.download() but 'live',
   * @param {import('hyperdrive')} drive
   * @param {object} options
   * @param {import('../types.js').BlobFilter} [options.filter] Filter blobs of specific types and/or sizes to download
   * @param {AbortSignal} [options.signal]
   */
  constructor(drive, { filter, signal } = {}) {
    super()
    this.#drive = drive
    this.#folders = filterToFolders(filter)
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
  get state() {
    if (this.#error)
      return {
        haveCount: this.#haveCount,
        haveBytes: this.#haveBytes,
        wantCount: this.#downloads.size,
        wantBytes: this.#wantBytes,
        error: this.#error,
        status: 'error',
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
        : 'downloaded',
    }
  }

  async #start() {
    const blobsCore = await this.#getBlobsCore()
    /* c8 ignore next */
    if (this.#signal?.aborted || !blobsCore) return // Can't get here in tests
    let seq = 0

    for (const folder of this.#folders) {
      // Don't emit state during initial iteration of existing data, since this is
      // likely fast and not useful UX feedback
      const entryStream = this.#drive.list(folder, { recursive: true })
      if (this.#signal) {
        this.#signal.addEventListener('abort', () => entryStream.destroy(), {
          once: true,
        })
      }
      for await (const entry of entryStream) {
        if (this.#signal?.aborted) return
        seq = Math.max(seq, entry.seq)
        const { blob } = entry.value
        if (!blob) continue
        await this.#processEntry(blobsCore, blob)
      }
      if (this.#signal?.aborted) return
    }

    this.#initialCheck = false
    this.emit('state', this.state)

    const bee = this.#drive.db
    // This will also download old versions of files, but it is the only way to
    // get a live stream from a Hyperbee, however we currently do not support
    // edits of blobs, so this should not be an issue. `keyEncoding` is
    // necessary because hyperdrive stores file index data under the `files`
    // sub-encoding key
    const historyStream = bee.createHistoryStream({
      live: true,
      gt: seq,
      keyEncoding,
    })
    if (this.#signal) {
      this.#signal.addEventListener('abort', () => historyStream.destroy(), {
        once: true,
      })
    }
    for await (const entry of historyStream) {
      if (this.#signal?.aborted) return
      const { blob } = entry.value
      if (!blob) continue
      if (!matchesFolder(entry.key, this.#folders)) continue
      // TODO: consider cancelling downloads when a delete entry is found?
      // Probably not worth the extra work.
      if (entry.type !== 'put') continue
      const wasDownloaded = this.state.status === 'downloaded'
      await this.#processEntry(blobsCore, blob)
      if (wasDownloaded && this.state.status === 'downloading') {
        // State has changed, so emit
        this.emit('state', this.state)
      }
    }
    /* c8 ignore next 2 */
    // Could possibly reach here if aborted after check in loop, hard to test
    this.emit('state', this.state)
  }

  /**
   * If a Hyperdrive has been added by its key and has never replicated, then
   * drive.getBlobs() will not resolve until replication starts. Since we do not
   * want the downloader to remain in the "checking" state forever, we catch
   * this case and update the state before waiting for the hyperdrive hyperblobs
   * instance. This also makes waiting for the blobs instance cancellable.
   *
   * @returns {Promise<import('hypercore') | undefined>}
   */
  async #getBlobsCore() {
    if (this.#drive.blobs) return this.#drive.blobs.core
    await this.#drive.ready()
    await this.#drive.core.update({ wait: true })

    // If no peers at this stage, we are not going to be able to get the blobs
    // until a peer appears, so consider this state "downloaded", because
    // otherwise this will just hang as "checking"
    if (!this.#drive.core.peers.length) {
      this.#initialCheck = false
      this.emit('state', this.state)
    }
    try {
      const [blobs] = await once(this.#drive, 'blobs', { signal: this.#signal })
      return blobs.core
    } catch (e) {
      if (e.name === 'AbortError') return
      throw e
    }
  }

  /** @param {Error} e */
  #handleError(e) {
    this.#error = e
    this.emit('state', this.state)
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

/**
 * Reduce multiple states into one. Factored out for unit testing because I
 * don't trust my coding. Probably a smarter way to do this, but this works.
 *
 * @param {Iterable<{ state: BlobDownloadState | BlobDownloadStateError }>} liveDownloads
 * @param {{ signal?: AbortSignal }} options
 * @returns
 */
export function combineStates(liveDownloads, { signal } = {}) {
  /** @type {BlobDownloadState | BlobDownloadStateError} */
  let combinedState = {
    haveCount: 0,
    haveBytes: 0,
    wantCount: 0,
    wantBytes: 0,
    error: null,
    status: 'downloaded',
  }
  for (const { state } of liveDownloads) {
    combinedState.haveCount += state.haveCount
    combinedState.haveBytes += state.haveBytes
    combinedState.wantCount += state.wantCount
    combinedState.wantBytes += state.wantBytes
    if (state.status === combinedState.status) continue
    if (state.status === 'error') {
      combinedState = { ...combinedState, error: state.error, status: 'error' }
    } else if (
      state.status === 'downloading' &&
      combinedState.status === 'downloaded'
    ) {
      combinedState = { ...combinedState, status: 'downloading' }
    } else if (
      state.status === 'checking' &&
      (combinedState.status === 'downloaded' ||
        combinedState.status === 'downloading')
    ) {
      combinedState = { ...combinedState, status: 'checking' }
    }
  }
  if (signal?.aborted) {
    combinedState.status = 'aborted'
  }
  return combinedState
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

/**
 * Returns true if the path is within one of the given folders
 *
 * @param {string} path
 * @param {string[]} folders
 * @returns {boolean}
 */
function matchesFolder(path, folders) {
  for (const folder of folders) {
    if (path.startsWith(folder)) return true
  }
  return false
}

/** @param {Pick<import('../types.js').BlobId, 'type' | 'variant'>} opts */
function makePath({ type, variant }) {
  return `/${type}/${variant}`
}
