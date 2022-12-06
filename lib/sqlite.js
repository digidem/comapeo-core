import BetterSqlite from 'better-sqlite3'

export class Sqlite {
  #filepath

  /**
   *
   * @param {string} filepath
   * @param {import('better-sqlite3').Options} options passed to [better-sqlite3 client](https://npmjs.com/better-sqlite3)
   */
  constructor(filepath, options = {}) {
    this.#filepath = filepath
    this.db = BetterSqlite(filepath, options)
    this.db.pragma('journal_mode = WAL')
  }

  query(sql, params) {
    const statement = this.db.prepare(sql)
    const rows = params ? statement.all(params) : statement.all()

    return rows.map((row) => {
      for (const [key, value] of Object.entries(row)) {
        if (['links', 'forks'].includes(key)) {
          row[key] = JSON.parse(value)
        }
      }

      return row
    })
  }

  get(sql, params) {
    const statement = this.db.prepare(sql)
    const row = params ? statement.get(params) : statement.get()

    if (row['links']) {
      row['links'] = JSON.parse(row['links'])
    }

    if (row['forks']) {
      row['forks'] = JSON.parse(row['forks'])
    }

    return row
  }

  run(sql, params) {
    const statement = this.db.prepare(sql)
    return params ? statement.run(params) : statement.run()
  }

  close() {
    if (this.db.open) {
      this.db.close()
    }
  }
}
