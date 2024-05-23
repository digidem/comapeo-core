import { sql } from 'drizzle-orm'
import { assert } from '../utils.js'
/** @import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3' */

/**
 * @param {unknown} queryResult
 * @returns {number}
 */
const getNumberResult = (queryResult) => {
  assert(
    queryResult &&
      typeof queryResult === 'object' &&
      'result' in queryResult &&
      typeof queryResult.result === 'number',
    'expected query to return proper result'
  )
  return queryResult.result
}

/**
 * @param {BetterSQLite3Database} db
 * @param {string} migrationsTableName
 * @returns {number}
 */
export const countDrizzleMigrations = (db, migrationsTableName) =>
  db.transaction((tx) => {
    const existsQuery = sql`
      SELECT EXISTS (
        SELECT 1
        FROM sqlite_master
        WHERE type IS 'table'
        AND name IS ${migrationsTableName}
      ) AS result
    `
    const existsResult = tx.get(existsQuery)
    const exists = getNumberResult(existsResult)
    if (!exists) return 0

    const countQuery = sql`
      SELECT COUNT(*) AS result
      FROM ${sql.identifier(migrationsTableName)}
    `
    const countResult = tx.get(countQuery)
    return getNumberResult(countResult)
  })
