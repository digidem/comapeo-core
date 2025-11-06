import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { IndexWriter } from './index-writer.js'
import { IndexWriterProxy } from './index-writer-proxy.js'

export { IndexWriter, IndexWriterProxy }

/** @import { MapeoDoc } from '@comapeo/schema' */
/** @import { MapeoDocTables } from '../datatype/index.js' */

/**
 * @typedef {{ [K in MapeoDoc['schemaName']]?: string[] }} IndexedDocIds
 */

/**
 * @template {MapeoDocTables} [TTables=MapeoDocTables]
 */
export class IndexWriterWrapper {
  /**
   * @internal
   * @typedef {TTables['_']['name']} SchemaName
   */
  /** @type {SchemaName[]} */
  #schemas = []
  #indexWriter
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {TTables[]} opts.tables
   * @param {boolean} [opts.useWorker] if true, create a worker thread for indexing
   * @param {import('../logger.js').Logger} [opts.logger]
   */
  constructor({ tables, sqlite, logger, useWorker = false }) {
    for (const table of tables) {
      const config = getTableConfig(table)
      const schemaName = /** @type {(typeof table)['_']['name']} */ (
        config.name
      )
      this.#schemas.push(schemaName)
    }

    if (useWorker && !sqlite.memory) {
      this.#indexWriter = new IndexWriterProxy({
        schemas: this.schemas,
        sqlite,
        logger,
      })
    } else {
      this.#indexWriter = new IndexWriter({
        schemas: this.schemas,
        sqlite,
        logger,
      })
    }
  }

  /**
   * @returns {Array<SchemaName>}
   */
  get schemas() {
    return this.#schemas
  }

  /**
   * @param {import('multi-core-indexer').Entry[]} entries
   * @returns {Promise<IndexedDocIds>} map of indexed docIds by schemaName
   */
  async batch(entries) {
    return this.#indexWriter.batch(entries)
  }

  /**
   * @param {SchemaName} schemaName
   * @return {Promise<void>}
   */
  async deleteSchema(schemaName) {
    return this.#indexWriter.deleteSchema(schemaName)
  }

  /**
   * Clean up any remaining index writer resources
   * @returns {Promise<void>}
   */
  async close() {
    await this.#indexWriter.close()
  }
}
