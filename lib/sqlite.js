import BetterSqlite from 'better-sqlite3'

export class Sqlite {
  /** @type {string} */
  #filepath

  /**
   * Create a Sqlite client. This class is a wrapper around [better-sqlite3](https://npmjs.com/better-sqlite3)
   * @param {string} filepath
   * @param {import('better-sqlite3').Options} options passed to [better-sqlite3 client](https://npmjs.com/better-sqlite3)
   */
  constructor(filepath, options = {}) {
    this.#filepath = filepath

    /** @type {import('better-sqlite3').Database} */
    this.db = BetterSqlite(this.#filepath, options)
    this.db.pragma('journal_mode = WAL')
  }

  /**
   * Query the database
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Doc[]}
   */
  query(sql, params) {
    const statement = this.db.prepare(sql)
    const rows = params ? statement.all(...params) : statement.all()

    return rows.map((row) => {
      for (const [key, value] of Object.entries(row)) {
        if (['links', 'forks'].includes(key)) {
          row[key] = JSON.parse(value)
        }
      }

      return row
    })
  }

  /**
   * Get a single record from the database
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Doc}
   */
  get(sql, params) {
    const statement = this.db.prepare(sql)
    const row = params ? statement.get(...params) : statement.get()

    if (!row) {
      return row
    }

    if (row['links']) {
      row['links'] = JSON.parse(row['links'])
    }

    if (row['forks']) {
      row['forks'] = JSON.parse(row['forks'])
    }

    return row
  }

  /**
   * Run a statement against the database
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {import('better-sqlite3').RunResult}
   */
  run(sql, params) {
    const statement = this.db.prepare(sql)
    return params ? statement.run(...params) : statement.run()
  }

  /**
   * Close the database connection
   * @returns {void}
   */
  close() {
    if (this.db.open) {
      this.db.close()
    }
  }
}
