import { decode } from '@mapeo/schema'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { getBacklinkTableName } from './schema/utils.js'

/**
 * @typedef {import('./datatype/data-type-new.js').MapeoDocTables} MapeoDocTables
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */

/**
 * @template {MapeoDocTables} [TSchemas=MapeoDocTables]
 */
export class IndexWriter {
  /** @type {Map<TSchemas['_']['name'], SqliteIndexer>} */
  #indexers = new Map()
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.db
   * @param {TSchemas[]} opts.schemas
   */
  constructor({ schemas, db }) {
    for (const schema of schemas) {
      const config = getTableConfig(schema)
      const schemaName = /** @type {(typeof schema)['_']['name']} */ (
        config.name
      )
      const indexer = new SqliteIndexer(db, {
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
