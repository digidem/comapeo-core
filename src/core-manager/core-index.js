import crypto from 'hypercore-crypto'
/** @import { Namespace } from '../types.js' */
/** @import { CoreRecord } from './index.js' */

/**
 * An in-memory index of open cores.
 */
export class CoreIndex {
  /** @type {Map<string, CoreRecord>} */
  #coresByDiscoveryId = new Map()
  /** @type {Map<Namespace, CoreRecord>} */
  #writersByNamespace = new Map();

  [Symbol.iterator]() {
    return this.#coresByDiscoveryId.values()
  }

  /**
   * NB. Need to pass key here because `core.key` is not populated until the
   * core is ready, but we know it beforehand.
   *
   * @param {Object} options
   * @param {import('hypercore')<"binary", Buffer>} options.core Hypercore instance
   * @param {Buffer} options.key Buffer containing public key of this core
   * @param {string} options.discoveryId discoveryId of this core
   * @param {Namespace} options.namespace
   * @param {boolean} [options.writer] Is this a writer core?
   */
  add({ core, key, discoveryId, namespace, writer = false }) {
    const record = { core, key, discoveryId, namespace }
    if (writer) {
      this.#writersByNamespace.set(namespace, record)
    }
    this.#coresByDiscoveryId.set(discoveryId, record)
  }

  /**
   * Get all known cores in a namespace
   *
   * @param {Namespace} namespace
   * @returns {CoreRecord[]}
   */
  getByNamespace(namespace) {
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
  getWriter(namespace) {
    const writerRecord = this.#writersByNamespace.get(namespace)
    // Shouldn't happen, since we add all the writers in the contructor
    if (!writerRecord) {
      throw new Error(`Writer for namespace '${namespace}' is not defined`)
    }
    return writerRecord
  }

  /**
   * Get a core by its discoveryId (discover key as hex string)
   *
   * @param {string} discoveryId
   * @returns {CoreRecord | undefined}
   */
  getByDiscoveryId(discoveryId) {
    return this.#coresByDiscoveryId.get(discoveryId)
  }

  /**
   * Get a core by its public key
   *
   * @param {Buffer} coreKey
   * @returns {CoreRecord | undefined}
   */
  getByCoreKey(coreKey) {
    const discoveryId = crypto.discoveryKey(coreKey).toString('hex')
    return this.#coresByDiscoveryId.get(discoveryId)
  }
}
