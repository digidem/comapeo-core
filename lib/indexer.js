import MultiCoreIndexer from 'multi-core-indexer'
import SqliteIndexer from '@mapeo/sqlite-indexer'

export class Indexer {
  constructor(cores, options) {
    const { name, storage, sqlite, extraColumns = '' } = options

    this.name = name.toLowerCase()
    this.cores = cores
    this.sqlite = sqlite
    this.extraColumns = extraColumns

    this.multiCoreIndexer = new MultiCoreIndexer(cores, {
      storage,
      batch: this.batch.bind(this),
    })
  }

  async ready() {
    for (const core of this.cores) {
      await core.ready()
    }

    this.sqlite.pragma('journal_mode = wal')

    this.sqlite
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

    this.sqlite
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.name}_backlinks
			(version TEXT PRIMARY KEY NOT NULL)
			WITHOUT ROWID`
      )
      .run()

    this.sqliteIndexer = new SqliteIndexer(this.sqlite, {
      docTableName: this.name,
      backlinkTableName: `${this.name}_backlinks`,
      extraColumns: this.extraColumns,
    })
  }

  batch(docs) {
    // TODO: maybe there should be support for the properties column directly in @mapeo/sqlite-indexer?
    docs = docs.map((doc) => {
      doc.properties = JSON.stringify(doc.properties)
      return doc
    })

    this.sqliteIndexer.batch(docs)
  }

  onceWriteDoc(version, listener) {
    this.sqliteIndexer.onceWriteDoc(version, listener)
  }

  updateCores(cores) {
    this.cores = cores
  }
}
