import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import util from 'node:util'
import { pipeline } from 'node:stream'
import { discoveryKey } from 'hypercore-crypto'
import { Downloader } from './downloader.js'
import { createEntriesStream } from './entries-stream.js'
import { FilterEntriesStream } from './utils.js'
import { noop } from '../utils.js'
import { TypedEmitter } from 'tiny-typed-emitter'

/** @import { JsonObject } from 'type-fest' */
/** @import { Readable as NodeReadable } from 'node:stream' */
/** @import { Readable as StreamxReadable, Writable } from 'streamx' */
/** @import { BlobFilter, BlobId, BlobStoreEntriesStream } from '../types.js' */

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

class ErrNotFound extends Error {
  constructor(message = 'NotFound') {
    super(message)
    this.code = 'ENOENT'
  }
}

export class BlobStore {
  #driveIndex
  /** @type {Downloader} */
  #downloader

  /**
   * @param {object} options
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   * @param {BlobFilter | null} options.downloadFilter - Filter blob types and/or variants to download. Set to `null` to download all blobs.
   */
  constructor({ coreManager, downloadFilter }) {
    this.#driveIndex = new HyperdriveIndex(coreManager)
    this.#downloader = new Downloader(this.#driveIndex, {
      filter: downloadFilter,
    })
  }

  /**
   * @returns {string}
   */
  get writerDriveId() {
    return getDiscoveryId(this.#driveIndex.writerKey)
  }

  /**
   * @param {string} driveId hex-encoded discovery key
   * @returns {Hyperdrive}
   */
  #getDrive(driveId) {
    const drive = this.#driveIndex.get(driveId)
    if (!drive) throw new Error('Drive not found ' + driveId.slice(0, 7))
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
    if (!blob) throw new ErrNotFound()
    return blob
  }

  /**
   * Set the filter for downloading blobs.
   *
   * @param {import('../types.js').BlobFilter | null} filter Filter blob types and/or variants to download. Filter is { [BlobType]: BlobVariants[] }. At least one blob variant must be specified for each blob type.
   * @returns {void}
   */
  setDownloadFilter(filter) {
    this.#downloader.destroy()
    this.#downloader = new Downloader(this.#driveIndex, {
      filter,
    })
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
   * @param {import('../types.js').BlobFilter | null} [opts.filter] Filter blob types and/or variants in returned entries. Filter is { [BlobType]: BlobVariants[] }.
   * @returns
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
      throw new Error(
        'Hyperblobs instance not found for drive ' + driveId.slice(0, 7)
      )
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
      throw new Error(
        'Hyperblobs instance not found for drive ' + driveId.slice(0, 7)
      )
    }

    return blobs.get(entry.value.blob, { wait: false, start: 0, length })
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
    if (!drive) throw new Error('Drive not found ' + driveId.slice(0, 7))
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
}

// Don't want to export the class, but do want to export the type.
/** @typedef {HyperdriveIndex} THyperdriveIndex */

/**
 * @extends {TypedEmitter<{ 'add-drive': (drive: Hyperdrive) => void }>}
 */
class HyperdriveIndex extends TypedEmitter {
  /** @type {Map<string, Hyperdrive>} */
  #hyperdrives = new Map()
  #writer
  #writerKey
  /** @param {import('../core-manager/index.js').CoreManager} coreManager */
  constructor(coreManager) {
    super()
    /** @type {undefined | Hyperdrive} */
    let writer
    const corestore = new PretendCorestore({ coreManager })
    const blobIndexCores = coreManager.getCores('blobIndex')
    const writerCoreRecord = coreManager.getWriterCore('blobIndex')
    this.#writerKey = writerCoreRecord.key
    for (const { key } of blobIndexCores) {
      // @ts-ignore - we know pretendCorestore is not actually a Corestore
      const drive = new Hyperdrive(corestore, key)
      // We use the discovery key to derive the id for a drive
      this.#hyperdrives.set(getDiscoveryId(key), drive)
      if (key.equals(this.#writerKey)) {
        writer = drive
      }
    }
    if (!writer) {
      throw new Error('Could not find a writer for the blobIndex namespace')
    }
    this.#writer = writer

    coreManager.on('add-core', ({ key, namespace }) => {
      if (namespace !== 'blobIndex') return
      // We use the discovery key to derive the id for a drive
      const driveId = getDiscoveryId(key)
      if (this.#hyperdrives.has(driveId)) return
      // @ts-ignore - we know pretendCorestore is not actually a Corestore
      const drive = new Hyperdrive(corestore, key)
      this.#hyperdrives.set(driveId, drive)
      this.emit('add-drive', drive)
    })
  }
  get writer() {
    return this.#writer
  }
  get writerKey() {
    return this.#writerKey
  }
  [Symbol.iterator]() {
    return this.#hyperdrives.values()
  }
  /** @param {string} driveId */
  get(driveId) {
    return this.#hyperdrives.get(driveId)
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
 * Implements the `get()` method as used by hyperdrive-next. It returns the
 * relevant cores from the Mapeo CoreManager.
 */
class PretendCorestore {
  #coreManager
  /**
   * @param {object} options
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   */
  constructor({ coreManager }) {
    this.#coreManager = coreManager
  }

  /**
   * @param {Buffer | { publicKey: Buffer } | { name: string }} opts
   * @returns {import('hypercore')<"binary", Buffer> | undefined}
   */
  get(opts) {
    if (b4a.isBuffer(opts)) {
      opts = { publicKey: opts }
    }
    if ('key' in opts) {
      // @ts-ignore
      opts.publicKey = opts.key
    }
    if ('publicKey' in opts) {
      // NB! We should always add blobIndex (Hyperbee) cores to the core manager
      // before we use them here. We would only reach the addCore path if the
      // blob core is read from the hyperbee header (before it is added to the
      // core manager)
      return (
        this.#coreManager.getCoreByKey(opts.publicKey) ||
        this.#coreManager.addCore(opts.publicKey, 'blob').core
      )
    } else if (opts.name === 'db') {
      return this.#coreManager.getWriterCore('blobIndex').core
    } else if (opts.name.includes('blobs')) {
      return this.#coreManager.getWriterCore('blob').core
    } else {
      throw new Error(
        'Unsupported corestore.get() with opts ' + util.inspect(opts)
      )
    }
  }

  /** no-op */
  close() {}
}

/**
 * @param {Buffer} key Public key of hypercore
 * @returns {string} Hex-encoded string of derived discovery key
 */
function getDiscoveryId(key) {
  return discoveryKey(key).toString('hex')
}
