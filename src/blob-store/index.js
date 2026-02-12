import { pipeline } from 'node:stream'
import { discoveryKey } from 'hypercore-crypto'
import { Downloader } from './downloader.js'
import { createEntriesStream } from './entries-stream.js'
import { FilterEntriesStream } from './utils.js'
import { noop } from '../utils.js'
import { TypedEmitter } from 'tiny-typed-emitter'
import { HyperdriveIndexImpl as HyperdriveIndex } from './hyperdrive-index.js'
import { Logger } from '../logger.js'
import { BlobNotFoundError, getErrorCode, getErrorMessage } from '../errors.js'
import { BlobsNotFoundError, DriveNotFoundError } from '../errors.js'

/** @import Hyperdrive from 'hyperdrive' */
/** @import { JsonObject } from 'type-fest' */
/** @import { Readable as NodeReadable } from 'node:stream' */
/** @import { Readable as StreamxReadable, Writable } from 'streamx' */
/** @import { GenericBlobFilter, BlobFilter, BlobId, BlobStoreEntriesStream } from '../types.js' */

/**
 * @typedef {object} BlobStoreEvents
 * @prop {(peerId: string, blobFilter: GenericBlobFilter | null) => void} blob-filter
 * @prop {(opts: {
 *   peerId: string
 *   start: number
 *   length: number
 *   blobCoreId: string
 * }) => void} want-blob-range
 * @prop {(error: Error) => void} error
 */

/**
 * @internal
 * @typedef {NodeReadable | StreamxReadable} Readable
 */

// prop = blob type name
// value = array of blob variants supported for that type
const SUPPORTED_BLOB_VARIANTS = /** @type {const} */ ({
  photo: ['original', 'preview', 'thumbnail'],
  audio: ['original'],
  video: ['original'],
})

// Cannot directly export the const assignment above because export does not
// like the assignment being wrapped in parenthesis, which is necessary to cast
// the type with JSDoc
export { SUPPORTED_BLOB_VARIANTS }

/** @type {import('../types.js').BlobFilter} */
const NON_ARCHIVE_DEVICE_DOWNLOAD_FILTER = {
  photo: ['preview', 'thumbnail'],
  // Don't download any audio of video files, since previews and
  // thumbnails aren't supported yet.
}

/** @extends {TypedEmitter<BlobStoreEvents>} */
export class BlobStore extends TypedEmitter {
  #driveIndex
  /** @type {Downloader} */
  #downloader
  /** @type {Map<string, GenericBlobFilter | null>} */
  #blobFilters = new Map()
  #l
  /** @type {Map<string, BlobStoreEntriesStream>} */
  #entriesStreams = new Map()
  #isArchiveDevice
  #deviceId

  /**
   * Bound function for handling download intents for both peers and self
   * @param {GenericBlobFilter | null} filter
   * @param {string} peerId
   */
  #handleDownloadIntent = async (filter, peerId) => {
    this.#l.log('Download intent %o for peer %S', filter, peerId)
    try {
      this.#entriesStreams.get(peerId)?.destroy()
      this.emit('blob-filter', peerId, filter)
      this.#blobFilters.set(peerId, filter)

      if (filter === null) return

      const entriesReadStream = this.createEntriesReadStream({
        live: true,
        filter,
      })
      this.#entriesStreams.set(peerId, entriesReadStream)

      entriesReadStream.once('close', () => {
        if (this.#entriesStreams.get(peerId) === entriesReadStream) {
          this.#entriesStreams.delete(peerId)
        }
      })

      for await (const {
        blobCoreId,
        value: { blob },
      } of entriesReadStream) {
        const { blockOffset: start, blockLength: length } = blob
        this.emit('want-blob-range', {
          peerId,
          start,
          length,
          blobCoreId,
        })
      }
    } catch (err) {
      if (getErrorCode(err) === 'ERR_STREAM_PREMATURE_CLOSE') return
      this.#l.log(
        'Error getting blob entries stream for peer %h: %s',
        peerId,
        getErrorMessage(err)
      )
    }
  }

  /**
   * Bound to `this`
   * This will be called whenever a peer is successfully added to the creatorcore
   * @param {import('../types.js').HypercorePeer & { protomux: import('protomux')<import('../lib/noise-secret-stream-helpers.js').OpenedNoiseStream> }} peer
   */
  #handlePeerAdd = (peer) => {
    const downloadFilter = getBlobDownloadFilter(this.#isArchiveDevice)
    this.#coreManager.sendDownloadIntents(downloadFilter, peer)
  }

  /**
   * Bound to `this`
   * @param {import('../types.js').HypercorePeer & { protomux: import('protomux')<import('../lib/noise-secret-stream-helpers.js').OpenedNoiseStream> }} peer
   */
  #handlePeerRemove = (peer) => {
    const peerKey = peer.protomux.stream.remotePublicKey
    const peerId = peerKey.toString('hex')
    this.#entriesStreams.get(peerId)?.destroy()
    this.#entriesStreams.delete(peerId)
  }

  #coreManager
  #logger

  /**
   * @param {object} options
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   * @param {boolean} [options.isArchiveDevice] Set to `true` if this is an archive device which should download all blobs, or just a selection of blobs
   * @param {import('../logger.js').Logger} [options.logger]
   */
  constructor({ coreManager, isArchiveDevice = true, logger }) {
    super()
    this.#logger = logger
    this.#l = Logger.create('blobStore', logger)
    this.#isArchiveDevice = isArchiveDevice
    this.#driveIndex = new HyperdriveIndex(coreManager)
    this.#coreManager = coreManager
    this.#deviceId = coreManager.deviceId
    const downloadFilter = getBlobDownloadFilter(isArchiveDevice)
    if (downloadFilter) {
      this.#handleDownloadIntent(downloadFilter, this.#deviceId)
    }
    this.#downloader = new Downloader(this.#driveIndex, {
      filter: downloadFilter,
    })
    this.#downloader.on('error', (error) => this.emit('error', error))

    coreManager.on('peer-download-intent', this.#handleDownloadIntent)
    coreManager.creatorCore.on('peer-add', this.#handlePeerAdd)
    coreManager.creatorCore.on('peer-remove', this.#handlePeerRemove)
  }

  /**
   * @returns {string}
   */
  get writerDriveId() {
    return getDiscoveryId(this.#driveIndex.writerKey)
  }

  get isArchiveDevice() {
    return this.#isArchiveDevice
  }

  /**
   * @param {string} peerId
   * @returns {GenericBlobFilter | null}
   */
  getBlobFilter(peerId) {
    return this.#blobFilters.get(peerId) ?? null
  }

  /** @param {boolean} isArchiveDevice */
  async setIsArchiveDevice(isArchiveDevice) {
    this.#l.log('Setting isArchiveDevice to %s', isArchiveDevice)
    if (this.#isArchiveDevice === isArchiveDevice) return
    this.#isArchiveDevice = isArchiveDevice
    const blobDownloadFilter = getBlobDownloadFilter(isArchiveDevice)
    this.#downloader.removeAllListeners()
    this.#downloader.destroy()
    this.#downloader = new Downloader(this.#driveIndex, {
      filter: blobDownloadFilter,
    })
    this.#downloader.on('error', (error) => this.emit('error', error))
    // Even if blobFilter is null, e.g. we plan to download everything, we still
    // need to inform connected peers of the change.
    for (const peer of this.#coreManager.creatorCore.peers) {
      this.#coreManager.sendDownloadIntents(blobDownloadFilter, peer)
    }
    this.#handleDownloadIntent(blobDownloadFilter, this.#deviceId)
  }

  /**
   * @param {string} driveId hex-encoded discovery key
   * @returns {Hyperdrive}
   */
  #getDrive(driveId) {
    const drive = this.#driveIndex.get(driveId)
    if (!drive) throw new DriveNotFoundError(driveId.slice(0, 7))
    return drive
  }

  /**
   * @param {BlobId} blobId
   * @param {object} opts
   * @param {false} [opts.wait=false] Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally
   * @param {never} [opts.timeout] Optional timeout to wait for a blob to download
   * @returns {Promise<Uint8Array>}
   */
  async get({ type, variant, name, driveId }, { wait = false, timeout } = {}) {
    const drive = this.#getDrive(driveId)
    const path = makePath({ type, variant, name })
    const blob = await drive.get(path, { wait, timeout })
    if (!blob) throw new BlobNotFoundError()
    return blob
  }

  /**
   * @param {BlobId} blobId
   * @param {object} [options]
   * @param {boolean} [options.wait=false] Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally
   * @param {number} [options.timeout] Optional timeout to wait for a blob to download
   * @returns {Readable}
   */
  createReadStream(
    { type, variant, name, driveId },
    options = { wait: false }
  ) {
    // TODO: Error thrown from this be an emit error on the returned stream?
    const drive = this.#getDrive(driveId)
    const path = makePath({ type, variant, name })

    // @ts-ignore - TODO: update @digidem/types to include wait/timeout options
    return drive.createReadStream(path, options)
  }

  /**
   * This is a low-level method to create a stream of entries from all drives.
   * It includes entries for unknown blob types and variants.
   *
   * @param {object} opts
   * @param {boolean} [opts.live=false] Set to `true` to get a live stream of entries
   * @param {import('./utils.js').GenericBlobFilter | null} [opts.filter] Filter blob types and/or variants in returned entries. Filter is { [BlobType]: BlobVariants[] }.
   * @returns {BlobStoreEntriesStream}
   */
  createEntriesReadStream({ live = false, filter } = {}) {
    const entriesStream = createEntriesStream(this.#driveIndex, { live })
    if (!filter) return entriesStream
    const filterStream = new FilterEntriesStream(filter)
    return pipeline(entriesStream, filterStream, noop)
  }

  /**
   * Optimization for creating the blobs read stream when you have
   * previously read the entry from Hyperdrive using `drive.entry`
   * @param {BlobId['driveId']} driveId Hyperdrive drive discovery id
   * @param {import('hyperdrive').HyperdriveEntry} entry Hyperdrive entry
   * @param {object} [options]
   * @param {boolean} [options.wait=false] Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally
   * @returns {Promise<Readable>}
   */
  async createReadStreamFromEntry(driveId, entry, options = { wait: false }) {
    const drive = this.#getDrive(driveId)
    const blobs = await drive.getBlobs()

    if (!blobs) {
      throw new BlobsNotFoundError(driveId.slice(0, 7))
    }

    return blobs.createReadStream(entry.value.blob, options)
  }

  /**
   * @param {BlobId['driveId']} driveId Hyperdrive drive id
   * @param {import('hyperdrive').HyperdriveEntry} entry Hyperdrive entry
   * @param {object} [opts]
   * @param {number} [opts.length]
   * @returns {Promise<Buffer | null>}
   */
  async getEntryBlob(driveId, entry, { length } = {}) {
    const drive = this.#getDrive(driveId)
    const blobs = await drive.getBlobs()

    if (!blobs) {
      throw new BlobsNotFoundError(driveId.slice(0, 7))
    }

    return blobs.get(entry.value.blob, { wait: false, start: 0, length })
  }

  /**
   * Check if all the blocks for a given blob entry have been downloaded
   * @param {BlobId['driveId']} driveId Hyperdrive drive id
   * @param {import('hyperdrive').HyperdriveEntry} entry Hyperdrive entry
   * @returns {Promise<boolean>}
   */
  async hasDownloadedBlobEntry(driveId, entry) {
    const drive = this.#getDrive(driveId)
    const blobs = await drive.getBlobs()

    if (!blobs) {
      return false
    }

    const { blockOffset, blockLength } = entry.value.blob

    const core = blobs.core.session()
    try {
      const start = blockOffset
      const end = blockOffset + blockLength
      return core.has(start, end)
    } catch {
      return false
    }
  }

  /**
   *
   * @param {Omit<BlobId, 'driveId'>} blobId
   * @param {Buffer} blob
   * @param {object} [options]
   * @param {JsonObject} [options.metadata] Metadata to store with the blob
   * @returns {Promise<string>} discovery key as hex string of hyperdrive where blob is stored
   */
  async put({ type, variant, name }, blob, options) {
    const path = makePath({ type, variant, name })
    await this.#driveIndex.writer.put(path, blob, options)
    return this.writerDriveId
  }

  /**
   * @param {Omit<BlobId, 'driveId'>} blobId
   * @param {object} [options]
   * @param {JsonObject} [options.metadata] Metadata to store with the blob
   * @returns {Writable & { driveId: string }}
   */
  createWriteStream({ type, variant, name }, options) {
    const path = makePath({ type, variant, name })
    const stream = this.#driveIndex.writer.createWriteStream(path, options)
    return proxyProps(stream, {
      driveId: this.writerDriveId,
    })
  }

  /**
   * @param {BlobId} blobId
   * @param {object} [options]
   * @param {boolean} [options.follow=false] Set to `true` to follow symlinks (16 max or throws an error)
   * @param {false} [options.wait=false] Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally
   * @param {never} [options.timeout] Optional timeout to wait for a blob to download
   * @returns {Promise<import('hyperdrive').HyperdriveEntry | null>}
   */
  async entry(
    { type, variant, name, driveId },
    options = { follow: false, wait: false }
  ) {
    const drive = this.#driveIndex.get(driveId)
    if (!drive) throw new DriveNotFoundError(driveId.slice(0, 7))
    const path = makePath({ type, variant, name })
    const entry = await drive.entry(path, options)
    return entry
  }

  /**
   * @param {BlobId} blobId
   * @param {object} [options]
   * @param {boolean} [options.diff=false] Enable to return an object with a `block` property with number of bytes removed
   * @return {Promise<{ blocks: number } | null>}
   */
  async clear({ type, variant, name, driveId }, options = {}) {
    const path = makePath({ type, variant, name })
    const drive = this.#getDrive(driveId)

    return drive.clear(path, options)
  }

  close() {
    this.#downloader.removeAllListeners()
    this.#downloader.destroy()
    this.#coreManager.off('peer-download-intent', this.#handleDownloadIntent)
    this.#coreManager.creatorCore.off('peer-add', this.#handlePeerAdd)
    this.#coreManager.creatorCore.off('peer-remove', this.#handlePeerRemove)
  }
}

/**
 * @template {object} T
 * @template {object} U
 * @param {T} target
 * @param {U} props
 * @returns {T & U}
 */
function proxyProps(target, props) {
  // @ts-ignore - too much time to learn how to teach this to Typescript
  return new Proxy(target, {
    get(target, prop, receiver) {
      if (Object.hasOwn(props, prop)) {
        return Reflect.get(props, prop, receiver)
      } else {
        return Reflect.get(target, prop, receiver)
      }
    },
  })
}

/** @param {Pick<BlobId, 'type' | 'variant' | 'name'>} opts */
function makePath({ type, variant, name }) {
  return `/${type}/${variant}/${name}`
}

/**
 * @param {Buffer} key Public key of hypercore
 * @returns {string} Hex-encoded string of derived discovery key
 */
function getDiscoveryId(key) {
  return discoveryKey(key).toString('hex')
}

/**
 * @param {boolean} isArchiveDevice
 * @returns {null | BlobFilter}
 */
function getBlobDownloadFilter(isArchiveDevice) {
  return isArchiveDevice ? null : NON_ARCHIVE_DEVICE_DOWNLOAD_FILTER
}
