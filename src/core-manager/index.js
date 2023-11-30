// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import Corestore from 'corestore'
import assert from 'node:assert'
import { HaveExtension, ProjectExtension } from '../generated/extensions.js'
import { CoreIndex } from './core-index.js'
import * as rle from './bitfield-rle.js'
import { Logger } from '../logger.js'

export const kCoreManagerReplicate = Symbol('replicate core manager')
// WARNING: Changing these will break things for existing apps, since namespaces
// are used for key derivation
export const NAMESPACES = /** @type {const} */ ([
  'auth',
  'config',
  'data',
  'blobIndex',
  'blob',
])
// WARNING: If changed once in production then we need a migration strategy
const TABLE = 'cores'
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  publicKey BLOB NOT NULL,
  namespace TEXT NOT NULL
)`

/** @typedef {import('hypercore')<'binary', Buffer>} Core */
/** @typedef {(typeof NAMESPACES)[number]} Namespace */
/** @typedef {{ core: Core, key: Buffer, namespace: Namespace }} CoreRecord */
/** @typedef {import('streamx').Duplex} DuplexStream */
/**
 * @typedef {Object} Events
 * @property {(coreRecord: CoreRecord) => void} add-core
 * @property {(namespace: Namespace, msg: { coreDiscoveryId: string, peerId: string, start: number, bitfield: Uint32Array }) => void} peer-have
 */

/**
 * @extends {TypedEmitter<Events>}
 */
export class CoreManager extends TypedEmitter {
  #corestore
  #coreIndex
  /** @type {Core} */
  #creatorCore
  #projectKey
  #addCoreSqlStmt
  #encryptionKeys
  #projectExtension
  /** @type {'opened' | 'closing' | 'closed'} */
  #state = 'opened'
  #ready
  #haveExtension
  #deviceId
  #l
  #autoDownload

  static get namespaces() {
    return NAMESPACES
  }

  /**
   * @param {Object} options
   * @param {import('better-sqlite3').Database} options.sqlite better-sqlite3 database instance
   * @param {import('@mapeo/crypto').KeyManager} options.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} options.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [options.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<Namespace, Buffer>>} [options.encryptionKeys] Encryption keys for each namespace
   * @param {import('hypercore').HypercoreStorage} options.storage Folder to store all hypercore data
   * @param {boolean} [options.autoDownload=true] Immediately start downloading cores - should only be set to false for tests
   * @param {Logger} [options.logger]
   */
  constructor({
    sqlite,
    keyManager,
    projectKey,
    projectSecretKey,
    encryptionKeys = {},
    storage,
    autoDownload = true,
    logger,
  }) {
    super()
    assert(
      projectKey.length === 32,
      'project owner core public key must be 32-byte buffer'
    )
    assert(
      !projectSecretKey || projectSecretKey.length === 64,
      'project owner core secret key must be 64-byte buffer'
    )
    // Each peer will attach a listener, so max listeners is max attached peers
    this.setMaxListeners(0)
    this.#l = Logger.create('coreManager', logger)
    const primaryKey = keyManager.getDerivedKey('primaryKey', projectKey)
    this.#deviceId = keyManager.getIdentityKeypair().publicKey.toString('hex')
    this.#projectKey = projectKey
    this.#encryptionKeys = encryptionKeys
    this.#autoDownload = autoDownload

    // Make sure table exists for persisting known cores
    sqlite.prepare(CREATE_SQL).run()
    // Pre-prepare SQL statement for better performance
    this.#addCoreSqlStmt = sqlite.prepare(
      `INSERT OR IGNORE INTO ${TABLE} VALUES (@publicKey, @namespace)`
    )

    // Note: the primary key here should not be used, because we do not rely on
    // corestore for key storage (i.e. we do not get cores from corestore via a
    // name, which would derive the keypair from the primary key), but setting
    // this just in case a dependency does (e.g. hyperdrive) and we miss it.
    this.#corestore = new Corestore(storage, { primaryKey })
    // Persistent index of core keys and namespaces in the project
    this.#coreIndex = new CoreIndex()

    // Writer cores and root core, keys and namespaces are not persisted because
    // we derive the keys here.
    for (const namespace of NAMESPACES) {
      let keyPair
      if (namespace === 'auth' && projectSecretKey) {
        // For the project creator, the creatorCore is the same as the writer
        // core for the 'auth' namespace
        keyPair = { publicKey: projectKey, secretKey: projectSecretKey }
      } else {
        // Deterministic keypair, based on rootKey, namespace & projectKey
        keyPair = keyManager.getHypercoreKeypair(namespace, projectKey)
      }
      const writer = this.#addCore(keyPair, namespace)
      if (namespace === 'auth' && projectSecretKey) {
        this.#creatorCore = writer.core
      }
    }

    if (!this.#creatorCore) {
      // For anyone other than the project creator, creatorCore is readonly
      this.#creatorCore = this.#addCore({ publicKey: projectKey }, 'auth').core
    }

    // Load persisted cores
    const stmt = sqlite.prepare(`SELECT publicKey, namespace FROM ${TABLE}`)
    // @ts-ignore - don't know types returned from sqlite here
    for (const { publicKey, namespace } of stmt.all()) {
      this.#addCore({ publicKey }, namespace)
    }

    this.#projectExtension = this.#creatorCore.registerExtension(
      'mapeo/project',
      {
        encoding: ProjectExtensionCodec,
        onmessage: (msg) => {
          this.#handleProjectMessage(msg)
        },
      }
    )

    this.#haveExtension = this.#creatorCore.registerExtension('mapeo/have', {
      encoding: HaveExtensionCodec,
      onmessage: (msg, peer) => {
        this.#handleHaveMessage(msg, peer)
      },
    })

    this.#ready = Promise.all(
      [...this.#coreIndex].map(({ core }) => core.ready())
    )
      .then(() => {
        this.#l.log('ready')
      })
      .catch(() => {})
  }

  get deviceId() {
    return this.#deviceId
  }

  get creatorCore() {
    return this.#creatorCore
  }

  /**
   * Resolves when all cores have finished loading
   *
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#ready
  }

  /**
   * Get the writer core for the given namespace
   *
   * @param {Namespace} namespace
   */
  getWriterCore(namespace) {
    return this.#coreIndex.getWriter(namespace)
  }

  /**
   * Get an array of all cores in the given namespace
   *
   * @param {Namespace} namespace
   * @returns
   */
  getCores(namespace) {
    return this.#coreIndex.getByNamespace(namespace)
  }

  /**
   * Get a core by its public key
   *
   * @param {Buffer} key
   * @returns {Core | undefined}
   */
  getCoreByKey(key) {
    const coreRecord = this.#coreIndex.getByCoreKey(key)
    return coreRecord && coreRecord.core
  }

  /**
   * Get a core by its discovery key
   *
   * @param {Buffer} discoveryKey
   * @returns {CoreRecord | undefined}
   */
  getCoreByDiscoveryKey(discoveryKey) {
    const coreRecord = this.#coreIndex.getByDiscoveryId(
      discoveryKey.toString('hex')
    )
    return coreRecord
  }

  /**
   * Close all open cores and end any replication streams
   * TODO: gracefully close replication streams
   */
  async close() {
    this.#state = 'closing'
    const promises = []
    for (const { core } of this.#coreIndex) {
      promises.push(core.close())
    }
    await Promise.all(promises)
    this.#state = 'closed'
  }

  /**
   * Add a core to the manager (will be persisted across restarts)
   *
   * @param {Buffer} key 32-byte public key of core to add
   * @param {Namespace} namespace
   * @returns {import('./core-index.js').CoreRecord}
   */
  addCore(key, namespace) {
    return this.#addCore({ publicKey: key }, namespace, true)
  }

  /**
   * Add a core to the manager (writer cores and project creator core not persisted)
   *
   * @param {{ publicKey: Buffer, secretKey?: Buffer }} keyPair
   * @param {Namespace} namespace
   * @param {boolean} [persist=false]
   * @returns {import('./core-index.js').CoreRecord}
   */
  #addCore(keyPair, namespace, persist = false) {
    // No-op if core is already managed
    const existingCore = this.#coreIndex.getByCoreKey(keyPair.publicKey)
    if (existingCore) return existingCore

    const { publicKey: key, secretKey } = keyPair
    const writer = !!secretKey
    const core = this.#corestore.get({
      keyPair,
      encryptionKey: this.#encryptionKeys[namespace],
    })
    if (namespace !== 'blob' && this.#autoDownload) {
      core.download({ start: 0, end: -1 })
    }
    // Every peer adds a listener, so could have many peers
    core.setMaxListeners(0)
    // @ts-ignore - ensure key is defined before hypercore is ready
    core.key = key
    this.#coreIndex.add({ core, key, namespace, writer })

    // **Hack** As soon as a peer is added, eagerly send a "want" for the entire
    // core. This ensures that the peer sends back its entire bitfield.
    // Otherwise this would only happen once we call core.download()
    core.on('peer-add', (peer) => {
      if (core.length === 0) return
      // **Warning** uses internal method, but should be covered by tests
      peer._maybeWant(0, core.length)
    })

    // A non-writer core will emit 'append' when its length is updated from the
    // initial sync with a peer, and we will not have sent a "maybe want" for
    // this range, so we need to do it now. Subsequent appends are propogated
    // (more efficiently) via range broadcasts, so we only need to listen to the
    // first append.
    if (!writer) {
      core.once('append', () => {
        for (const peer of core.peers) {
          // TODO: It would be more efficient (in terms of network traffic) to
          // send a want with start = length of previous want. Need to track
          // "last want length" sent by peer.
          peer._maybeWant(0, core.length)
        }
      })
    }

    if (persist) {
      this.#addCoreSqlStmt.run({ publicKey: key, namespace })
    }

    this.#l.log(
      'Added %s %s core %k',
      persist ? 'remote' : writer ? 'local' : 'creator',
      namespace,
      key
    )
    this.emit('add-core', { core, key, namespace })

    return { core, key, namespace }
  }

  /**
   * @param {ProjectExtension} msg
   */
  #handleProjectMessage({ authCoreKeys }) {
    for (const coreKey of authCoreKeys) {
      // Use public method - these must be persisted (private method defaults to persisted=false)
      this.addCore(coreKey, 'auth')
    }
  }

  /**
   * Sends auth core keys to the given peer, skipping any keys that we know the
   * peer has already (depends on the peer having already replicated the auth
   * cores it has)
   *
   * @param {any} peer
   */
  sendAuthCoreKeys(peer) {
    this.#sendCoreKeys(peer, ['auth'])
  }

  /**
   * We only send non-auth core keys to a peer for unit tests
   * @param {any} peer
   * @param {Readonly<Namespace[]>} namespaces
   */
  #sendCoreKeys(peer, namespaces) {
    const message = ProjectExtension.create()
    for (const ns of namespaces) {
      for (const { key } of this.getCores(ns)) {
        message[`${ns}CoreKeys`].push(key)
      }
    }
    this.#projectExtension.send(message, peer)
  }

  /**
   * @param {Omit<HaveMsg, 'namespace'> & { namespace: Namespace | 'UNRECOGNIZED' }} msg
   * @param {any} peer
   */
  #handleHaveMessage(msg, peer) {
    const { start, discoveryKey, bitfield, namespace } = msg
    if (namespace === 'UNRECOGNIZED') return
    /** @type {string} */
    const peerId = peer.remotePublicKey.toString('hex')
    const coreDiscoveryId = discoveryKey.toString('hex')
    this.emit('peer-have', namespace, {
      coreDiscoveryId,
      peerId,
      start,
      bitfield,
    })
  }

  /**
   * @param {any} peer
   * @param {Exclude<Namespace, 'auth'>} namespace
   */
  async sendHaves(peer, namespace) {
    // We want ready() rather than update() because we are only interested in
    // local data. This waits for all cores to be ready.
    await this.ready()

    peer.protomux.cork()

    for (const { core } of this.getCores(namespace)) {
      if (core.length === 0) continue
      const { discoveryKey } = core
      // This will always be defined after ready(), but need to let TS know
      if (!discoveryKey) continue
      /** @type {Iterable<{ start: number, bitfield: Uint32Array }>} */
      // @ts-ignore - accessing internal property
      const bitfieldIterator = core.core.bitfield.want(0, core.length)
      for (const { start, bitfield } of bitfieldIterator) {
        const message = { start, bitfield, discoveryKey, namespace }
        this.#haveExtension.send(message, peer)
      }
    }

    peer.protomux.uncork()
  }

  /**
   * ONLY FOR TESTING
   * Replicate all cores in core manager
   *
   * @param {Parameters<Corestore['replicate']>[0]} stream
   * @returns
   */
  [kCoreManagerReplicate](stream) {
    const protocolStream = this.#corestore.replicate(stream)
    this.#creatorCore.on('peer-add', (peer) => {
      // Normally only auth core keys are sent, but for unit tests we need to
      // send all of them, because unit tests don't include the Sync API which
      // adds cores from core ownership records.
      this.#sendCoreKeys(peer, NAMESPACES)
    })
    return protocolStream
  }
}

/**
 * @typedef {object} HaveMsg
 * @property {Buffer} discoveryKey
 * @property {number} start
 * @property {Uint32Array} bitfield
 * @property {Namespace} namespace
 */

const ProjectExtensionCodec = {
  /** @param {Parameters<typeof ProjectExtension.encode>[0]} msg */
  encode(msg) {
    return ProjectExtension.encode(msg).finish()
  },
  /** @param {Buffer | Uint8Array} buf */
  decode(buf) {
    return ProjectExtension.decode(buf)
  },
}

const HaveExtensionCodec = {
  /** @param {HaveMsg} msg */
  encode({ start, discoveryKey, bitfield, namespace }) {
    const encodedBitfield = rle.encode(bitfield)
    const msg = { start, discoveryKey, encodedBitfield, namespace }
    return HaveExtension.encode(msg).finish()
  },
  /**
   * @param {Buffer | Uint8Array} buf
   * @returns {Omit<HaveMsg, 'namespace'> & { namespace: HaveMsg['namespace'] | 'UNRECOGNIZED' }}
   */
  decode(buf) {
    const { start, discoveryKey, encodedBitfield, namespace } =
      HaveExtension.decode(buf)
    try {
      const bitfield = rle.decode(encodedBitfield)
      return { start, discoveryKey, bitfield, namespace }
    } catch (e) {
      // TODO: Log error
      console.error(e)
      return { start, discoveryKey, bitfield: new Uint32Array(), namespace }
    }
  },
}
