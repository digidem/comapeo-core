import b4a from 'b4a'
import { discoveryKey } from 'hypercore-crypto'
import Hyperdrive from 'hyperdrive'
import util from 'node:util'
import { TypedEmitter } from 'tiny-typed-emitter'

/** @typedef {HyperdriveIndexImpl} THyperdriveIndex */

/**
 * @extends {TypedEmitter<{ 'add-drive': (drive: Hyperdrive) => void }>}
 */
export class HyperdriveIndexImpl extends TypedEmitter {
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
    if ('key' in opts && opts.key !== null) {
      // @ts-ignore
      opts.publicKey = opts.key
    }
    if ('keyPair' in opts && opts.keyPair !== null) {
      // @ts-ignore
      opts.publicKey = opts.keyPair.publicKey
    }
    if ('publicKey' in opts && opts.publicKey !== null) {
      // NB! We should always add blobIndex (Hyperbee) cores to the core manager
      // before we use them here. We would only reach the addCore path if the
      // blob core is read from the hyperbee header (before it is added to the
      // core manager)
      return (
        this.#coreManager.getCoreByKey(opts.publicKey) ||
        this.#coreManager.addCore(opts.publicKey, 'blob').core
      )
    } else if ('name' in opts && opts.name === 'db') {
      return this.#coreManager.getWriterCore('blobIndex').core
    } else if ('name' in opts && opts.name.includes('blobs')) {
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
