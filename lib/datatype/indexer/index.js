import SqliteIndexer from '@mapeo/sqlite-indexer'

/**
 * Internal indexer for Mapeo Core
 */
export class Indexer {
  #sqlite

  /**
   * Create an indexer for a DataType
   * @param {object} options
   * @param {string} options.name the name of the DataType
   * @param {import('../../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   * @param {string} options.extraColumns any additional column definitions needed for this table, passed to `CREATE TABLE` statement
   */
  constructor(options) {
    const { name, sqlite, extraColumns } = options

    this.name = name
    this.#sqlite = sqlite
    this.extraColumns = extraColumns

    this.#sqlite.run(
      `CREATE TABLE IF NOT EXISTS ${this.name}
			(
				id TEXT PRIMARY KEY NOT NULL,
				version TEXT NOT NULL,
				links TEXT NOT NULL,
				forks TEXT NOT NULL
				${this.extraColumns ? ', ' + this.extraColumns : ''}
			)
			WITHOUT ROWID`
    )

    this.#sqlite.run(
      `CREATE TABLE IF NOT EXISTS ${this.name}_backlinks
			(version TEXT PRIMARY KEY NOT NULL)
			WITHOUT ROWID`
    )

    this.sqliteIndexer = new SqliteIndexer(this.#sqlite.db, {
      docTableName: this.name,
      backlinkTableName: `${this.name}_backlinks`,
      extraColumns: this.extraColumns,
    })
  }

  /**
   * @typedef {string} DocVersion
   */

  /**
   * @callback IndexCallback
   * @param {IndexedDocument | IndexableDocument} doc
   */

  /**
   * Set a listener on a version of a doc that is called when it is finished indexing
   * @param {DocVersion} version
   * @param {IndexCallback} listener
   * @returns {void}
   */
  onceWriteDoc(version, listener) {
    this.sqliteIndexer.onceWriteDoc(version, listener)
  }

  /**
   * Index a batch of documents
   * @param {Doc[]} docs an array of docs
   * @returns {void}
   */
  batch(docs) {
    const flattenedDocs = docs.map((doc) => {
      for (const [key, value] of Object.entries(doc)) {
        if (
          typeof value === 'object' &&
          ['links', 'forks'].includes(key) === false
        ) {
          /* @ts-ignore */
          doc[key] = JSON.stringify(value)
        }
      }
      return doc
    })

    this.sqliteIndexer.batch(flattenedDocs)
  }

  /**
   * Query documents from the sqlite database
   * @param {string} sql
   * @param {any[]} params
   * @returns {Doc[]} an array of docs
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }
}
