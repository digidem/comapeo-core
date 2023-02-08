import crypto from 'hypercore-crypto'
import { TypedEmitter } from 'tiny-typed-emitter'

/** @typedef {import('./index.js').Namespace} Namespace */
/** @typedef {{ core: import('hypercore').default, key: Buffer, namespace: Namespace }} CoreRecord */
/**
 * @typedef {Object} CoreIndexEvents
 * @property {(coreRecord: CoreRecord) => void} add-core
 */

// WARNING: If changed once in production then we need a migration strategy
const TABLE = 'cores'
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  publicKey BLOB NOT NULL,
  namespace TEXT NOT NULL
)`

/**
 * An in-memory index of open cores that persists core keys & namespaces to disk
 *
 * @extends {TypedEmitter<CoreIndexEvents>}
 */
export class CoreIndex extends TypedEmitter {
  /** @type {Map<string, CoreRecord>} */
  #coresByDiscoveryId = new Map()
  /** @type {Map<Namespace, CoreRecord>} */
  #writersByNamespace = new Map()
  #addCoreSqlStmt

  /**
   * @param {object} options
   * @param {import('better-sqlite3').Database} options.db better-sqlite3 database instance
   */
  constructor ({ db }) {
    super()
    // Make sure table exists for persisting known cores
    db.prepare(CREATE_SQL).run()
    // Pre-prepare SQL statement for better performance
    this.#addCoreSqlStmt = db.prepare(
      `INSERT OR IGNORE INTO ${TABLE} VALUES (@publicKey, @namespace)`
    )
  }

  [Symbol.iterator]() {
    return this.#coresByDiscoveryId.values()
  }

  /**
   * NB. Need to pass key here because `core.key` is not populated until the
   * core is ready, but we know it beforehand.
   *
   * @param {Object} options
   * @param {import('hypercore').default} options.core Hypercore instance
   * @param {Buffer} options.key Buffer containing public key of this core
   * @param {Namespace} options.namespace
   * @param {boolean} [options.writer] Is this a writer core?
   * @param {boolean} [options.persist] Persist to cb?
   */
  add ({ core, key, namespace, writer = false, persist = false }) {
    const discoveryKey = crypto.discoveryKey(key)
    const discoveryId = discoveryKey.toString('hex')
    const record = { core, key, namespace }
    if (writer) {
      this.#writersByNamespace.set(namespace, record)
    }
    this.#coresByDiscoveryId.set(discoveryId, record)
    if (persist) {
      this.#addCoreSqlStmt.run({ publicKey: key, namespace })
    }
    this.emit('add-core', { core, key, namespace })
  }

  /**
   * Get all known cores in a namespace
   *
   * @param {Namespace} namespace
   * @returns {CoreRecord[]}
   */
  getByNamespace (namespace) {
    const records = []
    for (const record of this.#coresByDiscoveryId.values()) {
      if (record.namespace === namespace) records.push(record)
    }
    return records
  }

  /**
   * Get the write core for the given namespace
   *
   * @param {Namespace} namespace
   * @returns {CoreRecord}
   */
  getWriter (namespace) {
    const writerRecord = this.#writersByNamespace.get(namespace)
    // Shouldn't happen, since we add all the writers in the contructor
    if (!writerRecord)
      throw new Error(`Writer for namespace '${namespace}' is not defined`)
    return writerRecord
  }

  /**
   * Get a core by its discoveryId (discover key as hex string)
   *
   * @param {string} discoveryId
   * @returns {CoreRecord | undefined}
   */
  getByDiscoveryId (discoveryId) {
    return this.#coresByDiscoveryId.get(discoveryId)
  }

  /**
   * Get a core by its public key
   *
   * @param {Buffer} coreKey
   * @returns {CoreRecord | undefined}
   */
  getByCoreKey (coreKey) {
    const discoveryId = crypto.discoveryKey(coreKey).toString('hex')
    return this.#coresByDiscoveryId.get(discoveryId)
  }
}
