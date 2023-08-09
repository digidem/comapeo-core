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
 * @template {MapeoDocTables} [TTables=MapeoDocTables]
 */
export class IndexWriter {
  /** @type {Map<TTables['_']['name'], SqliteIndexer>} */
  #indexers = new Map()
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {TTables[]} opts.tables
   */
  constructor({ tables, sqlite }) {
    for (const table of tables) {
      const config = getTableConfig(table)
      const schemaName = /** @type {(typeof table)['_']['name']} */ (
        config.name
      )
      const indexer = new SqliteIndexer(sqlite, {
        docTableName: config.name,
        backlinkTableName: getBacklinkTableName(config.name),
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
        var doc = decode(block, { coreKey: key, index })
      } catch (e) {
        // Unknown entry - silently ignore
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
