import { decode } from '@mapeo/schema'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { getBacklinkTableName } from './schema/utils.js'

/**
 * @typedef {import('./schema/utils.js').SqliteTable} SqliteTable
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */

export class IndexWriter {
  /** @type {Record<string, SqliteIndexer>} */
  #indexers = {}
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.db
   * @param {SqliteTable[]} opts.schemas
   */
  constructor({ schemas, db }) {
    for (const schema of schemas) {
      const config = getTableConfig(schema)
      this.#indexers[config.name] = new SqliteIndexer(db, {
        docTableName: config.name,
        backlinkTableName: getBacklinkTableName(config.name),
      })
    }
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
      if (!this.#indexers[schemaName]) {
        // Don't have an indexer for this type - silently ignore
        continue
      }
      this.#indexers[schemaName].batch(docs)
    }
  }
}
