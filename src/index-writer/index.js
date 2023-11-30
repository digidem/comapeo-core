import { decode } from '@mapeo/schema'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import { getTableConfig } from 'drizzle-orm/sqlite-core'
import { getBacklinkTableName } from '../schema/utils.js'
import { discoveryKey } from 'hypercore-crypto'
import { Logger } from '../logger.js'

/**
 * @typedef {import('../datatype/index.js').MapeoDocTables} MapeoDocTables
 */
/**
 * @typedef {import('@mapeo/schema').MapeoDoc} MapeoDoc
 */
/**
 * @typedef {{ [K in MapeoDoc['schemaName']]?: string[] }} IndexedDocIds
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
  #l
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {TTables[]} opts.tables
   * @param {(doc: MapeoDocInternal, version: import('@mapeo/schema').VersionIdObject) => MapeoDoc} [opts.mapDoc] optionally transform a document prior to indexing. Can also validate, if an error is thrown then the document will not be indexed
   * @param {typeof import('@mapeo/sqlite-indexer').defaultGetWinner} [opts.getWinner] custom function to determine the "winner" of two forked documents. Defaults to choosing the document with the most recent `updatedAt`
   * @param {Logger} [opts.logger]
   */
  constructor({ tables, sqlite, mapDoc = (d) => d, getWinner, logger }) {
    this.#l = Logger.create('indexWriter', logger)
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
   * @param {import('multi-core-indexer').Entry[]} entries
   * @returns {Promise<IndexedDocIds>} map of indexed docIds by schemaName
   */
  async batch(entries) {
    // sqlite-indexer is _significantly_ faster when batching even <10 at a
    // time, so best to queue docs here before calling sliteIndexer.batch()
    /** @type {Record<string, MapeoDoc[]>} */
    const queued = {}
    /** @type {IndexedDocIds} */
    const indexed = {}
    for (const { block, key, index } of entries) {
      try {
        const version = { coreDiscoveryKey: discoveryKey(key), index }
        var doc = this.#mapDoc(decode(block, version), version)
      } catch (e) {
        this.#l.log('Could not decode entry %d of %h', index, key)
        // Unknown or invalid entry - silently ignore
        continue
      }
      // Don't have an indexer for this type - silently ignore
      if (!this.#indexers.has(doc.schemaName)) continue
      if (queued[doc.schemaName]) {
        queued[doc.schemaName].push(doc)
        // @ts-expect-error - we know this is defined, TS doesn't
        indexed[doc.schemaName].push(doc.docId)
      } else {
        queued[doc.schemaName] = [doc]
        indexed[doc.schemaName] = [doc.docId]
      }
    }
    for (const [schemaName, docs] of Object.entries(queued)) {
      // @ts-expect-error
      const indexer = this.#indexers.get(schemaName)
      if (!indexer) continue // Won't happen, but TS doesn't know that
      indexer.batch(docs)
      if (this.#l.enabled) {
        for (const doc of docs) {
          this.#l.log(
            'Indexed %s %S @ %S',
            doc.schemaName,
            doc.docId,
            doc.versionId
          )
        }
      }
    }
    return indexed
  }
}
