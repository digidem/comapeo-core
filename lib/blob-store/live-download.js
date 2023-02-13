// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'

export class LiveDownload extends TypedEmitter {
  #haveCount = 0
  #haveBytes = 0
  #wantBytes = 0
  #checking = true
  #drive
  #folder
  /** @type {Set<{ done(): Promise<void>, destroy(): void }>} */
  #downloads = new Set()
  /** @type {Error | null} */
  #error
  /** @param {Error} e */
  #handleError = e => {
    this.#error = e
    this.emit('state', this.state)
  }

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
    if (signal && !signal.aborted) {
      signal.addEventListener(
        'abort',
        () => {
          for (const download of this.#downloads) download.destroy()
          this.#downloads.clear()
        },
        { once: true }
      )
    }
    this.#start().catch(this.#handleError)
  }

  get state () {
    return {
      haveCount: this.#haveCount,
      haveBytes: this.#haveBytes,
      wantCount: this.#downloads.size,
      wantBytes: this.#wantBytes,
      error: this.#error,
      /** @type {'error' | 'checking' | 'downloading' | 'downloaded'} */
      status: this.#error
        ? 'error'
        : this.#checking
        ? 'checking'
        : this.#downloads.size > 0
        ? 'downloading'
        : 'downloaded'
    }
  }

  async #start () {
    const blobs = await this.#drive.getBlobs()
    let seq = 0
    this.emit('state', this.state)

    for await (const entry of this.#drive.list(this.#folder)) {
      seq = Math.max(seq, entry.seq)
      const { blob } = entry.value
      if (!blob) continue
      await this.#processEntry(blobs.core, blob)
    }

    this.#checking = false
    this.emit('state', this.state)

    const filesDb = this.#drive.files
    const historyStream = filesDb.createHistoryStream({ live: true, gt: seq })
    for await (const entry of historyStream) {
      const { blob } = entry.value
      if (!blob) continue
      if (!entry.key.startsWith(this.#folder)) continue
      const wasDownloaded = this.state.status === 'downloaded'
      await this.#processEntry(blobs.core, blob)
      if (wasDownloaded && this.state.status === 'downloading') {
        // State has changed, so emit
        this.emit('state', this.state)
      }
    }
  }

  /**
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
        .catch(this.#handleError)
    }
  }
}
