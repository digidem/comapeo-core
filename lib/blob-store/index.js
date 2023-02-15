import Hyperdrive from 'hyperdrive'
import b4a from 'b4a'
import util from 'util'
import { TypedEmitter } from 'tiny-typed-emitter'

/**
 * @typedef {object} BlobIdBase
 * @property {'photo' | 'audio' | ''} type type of blob
 * @property {'original' | 'preview' | 'thumbnail'} size
 * @property {string} name unique identifier for blob (e.g. hash of content)
 * @property {string} driveId public key as hex string of hyperdrive where blob is stored
 */

/** @typedef {BlobIdBase & { type: 'photo' }} PhotoId */
/** @typedef {BlobIdBase & { type: 'audio', size: 'original' }} AudioId */
/** @typedef {BlobIdBase & { type: 'video', size: 'original' }} VideoId */
/** @typedef {PhotoId | AudioId | VideoId} BlobId */
/** @typedef {TypedEmitter<{ 'add-drive': (drive: import('hyperdrive')) => void }>} InternalDriveEmitter */

export class BlobStore {
  /** @type {Map<string, Hyperdrive>} Indexed by hex-encoded key */
  #hyperdrives = new Map()
  #writer
  /** @type {InternalDriveEmitter} */
  #driveEmitter = new TypedEmitter()

  /**
   * @param {object} options
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   */
  constructor ({ coreManager }) {
    const corestore = new PretendCorestore({ coreManager })
    const blobIndexCores = coreManager.getCores('blobIndex')
    const { key: writerKey } = coreManager.getWriterCore('blobIndex')
    for (const { key } of blobIndexCores) {
      // @ts-ignore - we know pretendCorestore is not actually a Corestore
      const drive = new Hyperdrive(corestore, key)
      this.#hyperdrives.set(key.toString('hex'), drive)
      if (key.equals(writerKey)) {
        this.#writer = proxyProps(drive, { key: writerKey })
      }
    }
    coreManager.on('add-core', ({ key, namespace }) => {
      if (namespace !== 'blobIndex') return
      if (this.#hyperdrives.has(key.toString('hex'))) return
      // @ts-ignore - we know pretendCorestore is not actually a Corestore
      const drive = new Hyperdrive(corestore, key)
      this.#hyperdrives.set(key.toString('hex'), drive)
      this.#driveEmitter.emit('add-drive', drive)
    })
    // This shouldn't happen, but this check ensures this.#writer is typed to exist
    if (!this.#writer)
      throw new Error('Could not find a writer for the blobIndex namespace')
  }

  /**
   * @param {BlobId} blobId
   */
  async get ({ type, size, name, driveId }) {
    const drive = this.#hyperdrives.get(driveId)
    if (!drive) throw new Error('Drive not found ' + driveId.slice(0, 7))
    const path = makePath({ type, size, name })
    // TODO: Throw error rather than return null for not found?
    return drive.get(path)
  }

  /**
   * @param {BlobId} blobId
   */
  createReadStream ({ type, size, name, driveId }) {
    const drive = this.#hyperdrives.get(driveId)
    // TODO: Should this be an emit error on the returned stream?
    if (!drive) throw new Error('Drive not found ' + driveId.slice(0, 7))
    const path = makePath({ type, size, name })
    return drive.createReadStream(path)
  }

  /**
   *
   * @param {Omit<BlobId, 'driveId'>} blobId
   * @param {Buffer} blob
   * @param {object} [options]
   * @param {any} [options.metadata]
   * @returns {Promise<string>} public key as hex string of hyperdrive where blob is stored
   */
  async put ({ type, size, name }, blob, options) {
    const path = makePath({ type, size, name })
    await this.#writer.put(path, blob, options)
    return this.#writer.key.toString('hex')
  }

  /**
   * @param {Omit<BlobId, 'driveId'>} blobId
   * @param {object} [options]
   * @param {any} [options.metadata]
   */
  createWriteStream ({ type, size, name }, options) {
    const path = makePath({ type, size, name })
    const stream = this.#writer.createWriteStream(path, options)
    return proxyProps(stream, { driveId: this.#writer.key.toString('hex') })
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
    get (target, prop, receiver) {
      // eslint-disable-next-line no-prototype-builtins
      if (props.hasOwnProperty(prop)) {
        return Reflect.get(props, prop, receiver)
      } else {
        return Reflect.get(target, prop, receiver)
      }
    }
  })
}

/** @param {Pick<BlobId, 'type' | 'size' | 'name'>} opts */
function makePath({ type, size, name }) {
  return `/${type}/${size}/${name}`
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
  constructor ({ coreManager }) {
    this.#coreManager = coreManager
  }

  /**
   * @param {Buffer | { publicKey: Buffer } | { name: string }} opts
   * @returns {import('hypercore').default | undefined}
   */
  get (opts) {
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
    } else if (opts.name === 'blobs') {
      return this.#coreManager.getWriterCore('blob').core
    } else {
      throw new Error('Unsupported corestore.get() with opts ' + util.inspect(opts))
    }
  }

  /** no-op */
  close () {}
}
