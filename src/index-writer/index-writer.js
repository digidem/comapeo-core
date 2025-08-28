import { decode } from '@comapeo/schema'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import { getBacklinkTableName } from '../schema/utils.js'
import { discoveryKey } from 'hypercore-crypto'
import { Logger } from '../logger.js'
import { mapDoc } from './map-doc.js'
import { getWinner } from './get-winner.js'
/** @import { MapeoDoc } from '@comapeo/schema' */
/**
 * @typedef {{ [K in MapeoDoc['schemaName']]?: string[] }} IndexedDocIds
 */
/**
 * @typedef {MapeoDoc['schemaName']} SchemaName
 */

export class IndexWriter {
  /** @type {Map<SchemaName, SqliteIndexer>} */
  #indexers = new Map()
  #mapDoc
  #l
  /**
   *
   * @param {object} opts
   * @param {import('better-sqlite3').Database} opts.sqlite
   * @param {Iterable<SchemaName>} opts.schemas
   * @param {Logger} [opts.logger]
   */
  constructor({ schemas, sqlite, logger }) {
    this.#l = Logger.create('indexWriter', logger)
    this.#mapDoc = mapDoc

    for (const schemaName of schemas) {
      const indexer = new SqliteIndexer(sqlite, {
        docTableName: schemaName,
        backlinkTableName: getBacklinkTableName(schemaName),
        getWinner,
      })
      this.#indexers.set(schemaName, indexer)
    }
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
      /** @type {MapeoDoc} */ let doc
      try {
        const version = { coreDiscoveryKey: discoveryKey(key), index }
        doc = this.#mapDoc(decode(block, version), version)
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
      // TODO: selectively turn this on when log level is 'trace' or 'debug'
      // Otherwise this has a big performance overhead because this is all synchronous
      // if (this.#l.log.enabled) {
      //   for (const doc of docs) {
      //     this.#l.log(
      //       'Indexed %s %S @ %S',
      //       doc.schemaName,
      //       doc.docId,
      //       doc.versionId
      //     )
      //   }
      // }
    }
    return indexed
  }

  /**
   * @param {SchemaName} schemaName
   */
  async deleteSchema(schemaName) {
    const indexer = this.#indexers.get(schemaName)
    if (!indexer) {
      throw new Error(`IndexWriter doesn't know a schema named "${schemaName}"`)
    }
    await indexer.deleteAll()
  }
}
