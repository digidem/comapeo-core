import { Worker } from 'worker_threads'
import { pEvent } from 'p-event'
/** @import { MapeoDoc } from '@comapeo/schema' */
/** @import { IndexedDocIds, SchemaName } from './index-writer.js'*/

/**
 * @template {string} [TType=string]
 * @template [TData=any]
 * @typedef {{ id: number, type: TType, data: TData }} WorkerRequest
 */
/**
 * @template T
 * @typedef {{ id: number, data: T } | { id: number, error: string, errorStack: string }} WorkerResponse
 */
/** @typedef {SchemaName} DeleteSchemaRequestData */
/** @typedef {null} DeleteSchemaResponseData */
/** @typedef {null} CloseRequestData */
/** @typedef {string} CloseResponseData */
/** @typedef {import('multi-core-indexer').Entry[]} BatchRequestData */
/** @typedef {IndexedDocIds} BatchResponseData */
/**
 * @typedef {object} WorkerData
 * @property {SchemaName[]} schemas
 * @property {string} dbPath
 * @property {string} [parentLoggerNamespace]
 * @property {string} [deviceId]
 */

/**
 * Proxy calls to the IndexWriter class to a worker thread.
 */
export class IndexWriterProxy {
  #worker
  #nextId = 0
  #onLoaded

  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {Iterable<SchemaName>} opts.schemas
   * @param {import('../logger.js').Logger} [opts.logger]
   */
  constructor({ schemas, sqlite, logger }) {
    if (sqlite.memory) {
      throw new Error(
        'Cannot use IndexWriterProxy with an in-memory SQLite database'
      )
    }
    /** @type {WorkerData} */
    const workerData = {
      schemas: Array.from(schemas),
      dbPath: sqlite.name,
      parentLoggerNamespace: logger?.ns,
      deviceId: logger?.deviceId,
    }
    this.#worker = new Worker(new URL('./index-worker.js', import.meta.url), {
      workerData,
    })
    this.#onLoaded = pEvent(this.#worker, 'message', {
      // Signifies "ready"
      filter: (msg) => msg.id === -1,
    })
    this.#worker.unref()
  }

  /**
   * @overload
   * @param {'batch'} type
   * @param {BatchRequestData} data
   * @param {import('worker_threads').TransferListItem[]} [transferList]
   * @returns {Promise<BatchResponseData>}
   */
  /**
   * @overload
   * @param {'deleteSchema'} type
   * @param {DeleteSchemaRequestData} data
   * @param {import('worker_threads').TransferListItem[]} [transferList]
   * @returns {Promise<DeleteSchemaResponseData>}
   */
  /**
   * @overload
   * @param {'close'} type
   * @param {CloseRequestData} data
   * @param {import('worker_threads').TransferListItem[]} [transferList]
   * @returns {Promise<CloseResponseData>}
   */
  /**
   * @param {string} type
   * @param {any} data
   * @param {import('worker_threads').TransferListItem[]} [transferList]
   * @returns {Promise<any>} resolves with the response from the worker
   */
  async #workerRequest(type, data, transferList) {
    const id = this.#nextId++
    const responsePromise = pEvent(this.#worker, 'message', {
      filter: (msg) => msg.id === id,
    })
    /** @type {WorkerRequest} */
    const request = { id, type, data }
    this.#worker.postMessage(request, transferList)
    const response = /** @type {WorkerResponse<any>} */ (await responsePromise)
    if ('error' in response) {
      throw new Error(response.error + '\n\n' + response.errorStack)
    }
    return response.data
  }

  /**
   * @param {import('multi-core-indexer').Entry[]} entries
   * @returns {Promise<IndexedDocIds>} map of indexed docIds by schemaName
   */
  async batch(entries) {
    const transferList = entries.map((entry) => entry.block.buffer)
    return this.#workerRequest('batch', entries, transferList)
  }

  /**
   * @param {SchemaName} schemaName
   * @return {Promise<void>}
   */
  async deleteSchema(schemaName) {
    await this.#workerRequest('deleteSchema', schemaName)
  }

  /**
   * Clean up any remaining index writer resources
   * @returns {Promise<void>}
   */
  async close() {
    await this.#onLoaded
    await this.#workerRequest('close', null)
  }
}
