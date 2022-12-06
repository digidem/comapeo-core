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
   * @param {} options.sqlite instance of [better-sqlite3 client](https://npmjs.com/better-sqlite3)
   * @param {string} options.extraColumns any additional column definitions needed for this table, passed to `CREATE TABLE` statement
   */
  constructor(options) {
    const { name, sqlite, extraColumns, getWinner } = options

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
      testname: options.testname,
      docTableName: this.name,
      backlinkTableName: `${this.name}_backlinks`,
      extraColumns: this.extraColumns,
      getWinner,
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
          doc[key] = JSON.stringify(value)
        }
      }
      return doc
    })

    this.sqliteIndexer.batch(flattenedDocs)
  }

  /**
   * Select documents from the sqlite database
   * @param {string} [where] specify the docs to retrieve using a `WHERE` fragment
   * @returns {Doc[]} an array of docs
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }
}
