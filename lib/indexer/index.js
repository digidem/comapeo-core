import SqliteIndexer from '@mapeo/sqlite-indexer'

export class Indexer {
  #sqlite

  /**
   * Create an indexer for a DataType
   * @param {object} options
   * @param {import('../datatype/index.js').DataType} options.dataType the DataType being indexed
   * @param {import('better-sqlite3').Database} options.sqlite instance of better-sqlite
   * @param {string} options.extraColumns any additional column definitions needed for this table, passed to `CREATE TABLE` statement
   */
  constructor(options) {
    const { dataType, sqlite, extraColumns } = options

    this.name = dataType.name
    this.#sqlite = sqlite
    this.extraColumns = extraColumns

    this.#sqlite.pragma('journal_mode = wal')

    this.#sqlite
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.name}
			(
				id TEXT PRIMARY KEY NOT NULL,
				version TEXT NOT NULL,
        properties TEXT NOT NULL,
				links TEXT,
				forks TEXT
				${this.extraColumns ? ', ' + this.extraColumns : ''}
			)
			WITHOUT ROWID`
      )
      .run()

    this.#sqlite
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.name}_backlinks
			(version TEXT PRIMARY KEY NOT NULL)
			WITHOUT ROWID`
      )
      .run()

    this.sqliteIndexer = new SqliteIndexer(this.#sqlite, {
      docTableName: this.name,
      backlinkTableName: `${this.name}_backlinks`,
      extraColumns: this.extraColumns,
    })
  }

  /**
   * Set a listener on a version of a doc that is called when it is finished indexing
   * @param {DocVersion} version
   * @param {IndexedDocListener} listener
   */
  onceWriteDoc (version, listener) {
    this.sqliteIndexer.onceWriteDoc(version, listener)
  }

  /**
   * Index a batch of documents
   * @param {Doc[]} docs an array of docs
   */
  batch (docs) {
    this.sqliteIndexer.batch(docs)
  }

  /**
   * Select documents from the sqlite database
   * @param {string} where specify the docs to retrieve using a `WHERE` fragment
   */
  query (where) {
    let statement = `SELECT * from ${this.name}`

    if (where) {
      statement += `WHERE ${where};`
    }

    return this.#sqlite.prepare(statement).all()
  }
}
