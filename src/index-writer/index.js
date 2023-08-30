import { decode } from '@mapeo/schema'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { getBacklinkTableName } from '../schema/utils.js'

/**
 * @typedef {import('../datatype/index.js').MapeoDocTables} MapeoDocTables
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
 * @typedef {ReturnType<import('@mapeo/schema').decode>} MapeoDocInternal
 */

/**
 * @template {MapeoDocTables} [TTables=MapeoDocTables]
 */
export class IndexWriter {
  /** @type {Map<TTables['_']['name'], SqliteIndexer>} */
  #indexers = new Map()
  #mapDoc
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {TTables[]} opts.tables
   * @param {(doc: MapeoDocInternal, version: import('@mapeo/schema').VersionIdObject) => MapeoDoc} [opts.mapDoc] optionally transform a document prior to indexing. Can also validate, if an error is thrown then the document will not be indexed
   * @param {typeof import('@mapeo/sqlite-indexer').defaultGetWinner} [opts.getWinner] custom function to determine the "winner" of two forked documents. Defaults to choosing the document with the most recent `updatedAt`
   */
  constructor({ tables, sqlite, mapDoc = (d) => d, getWinner }) {
    this.#mapDoc = mapDoc
    for (const table of tables) {
      const config = getTableConfig(table)
      const schemaName = /** @type {(typeof table)['_']['name']} */ (
        config.name
      )
      const indexer = new SqliteIndexer(sqlite, {
        docTableName: config.name,
        backlinkTableName: getBacklinkTableName(config.name),
        getWinner,
      })
      this.#indexers.set(schemaName, indexer)
    }
  }

  get schemas() {
    return [...this.#indexers.keys()]
  }

  /**
   *
   * @param {import('multi-core-indexer').Entry[]} entries
   */
  async batch(entries) {
    // sqlite-indexer is _significantly_ faster when batching even <10 at a
    // time, so best to queue docs here before calling sliteIndexer.batch()
    /** @type {Record<string, MapeoDoc[]>} */
    const queued = {}
    for (const { block, key, index } of entries) {
      try {
        const version = { coreKey: key, index }
        var doc = this.#mapDoc(decode(block, version), version)
      } catch (e) {
        // Unknown or invalid entry - silently ignore
        continue
      }
      if (queued[doc.schemaName]) {
        queued[doc.schemaName].push(doc)
      } else {
        queued[doc.schemaName] = [doc]
      }
    }
    for (const [schemaName, docs] of Object.entries(queued)) {
      // @ts-expect-error
      const indexer = this.#indexers.get(schemaName)
      if (!indexer) {
        // Don't have an indexer for this type - silently ignore
        continue
      }
      indexer.batch(docs)
    }
  }
}
