import b4a from 'b4a'
import { discoveryKey } from 'hypercore-crypto'
import Hyperdrive from 'hyperdrive'
import util from 'node:util'
import ReadyResource from 'ready-resource'

/** @typedef {HyperdriveIndexImpl} THyperdriveIndex */

/**
 * @extends {ReadyResource<{ 'add-drive': (drive: Hyperdrive) => void }>}
 */
export class HyperdriveIndexImpl extends ReadyResource {
  /** @type {Map<string, Hyperdrive>} */
  #hyperdrives = new Map()
  #coreManager
  /** @type {Hyperdrive?} */
  #writer
  /** @type {Hyperdrive['key']} */
  #writerKey
  /** @param {import('../core-manager/index.js').CoreManager} coreManager */
  constructor(coreManager) {
    super()
    this.#coreManager = coreManager
    this.#writer = null
    this.#writerKey = null
  }

  async _open() {
    const coreManager = this.#coreManager

    /** @type {undefined | Hyperdrive} */
    let writer

    const corestore = new PretendCorestore({ coreManager })
    const blobIndexCores = coreManager.getCores('blobIndex')
    const writerCoreRecord = coreManager.getWriterCore('blobIndex')
    this.#writerKey = writerCoreRecord.key

    const readyPromises = []
    for (const { key } of blobIndexCores) {
      // @ts-ignore - we know pretendCorestore is not actually a Corestore
      const drive = new Hyperdrive(corestore, key)

      readyPromises.push(drive.ready())
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

    await Promise.all(readyPromises)
  }

  get writer() {
    if (!this.#writer) {
      throw new Error('Must await BlobStore.ready before writing')
    }
    return this.#writer
  }
  get writerKey() {
    if (!this.#writerKey) {
      throw new Error('Must await BlobStore.ready before writing')
    }
    return this.#writerKey
  }

  [Symbol.iterator]() {
    return this.#hyperdrives.values()
  }
  /** @param {string} driveId */
  get(driveId) {
    return this.#hyperdrives.get(driveId)
  }

  async _close() {
    await Promise.all(
      [...this.#hyperdrives.values()].map((drive) =>
        drive.ready().then(() => drive.close())
      )
    )
  }
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
