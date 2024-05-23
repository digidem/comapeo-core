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
 * Get the number of rows in a table using `SELECT COUNT(*)`.
 * Returns 0 if the table doesn't exist.
 *
 * @param {BetterSQLite3Database} db
 * @param {string} tableName
 * @returns {number}
 */
export const tableCountIfExists = (db, tableName) =>
  db.transaction((tx) => {
    const existsQuery = sql`
      SELECT EXISTS (
        SELECT 1
        FROM sqlite_master
        WHERE type IS 'table'
        AND name IS ${tableName}
      ) AS result
    `
    const existsResult = tx.get(existsQuery)
    const exists = getNumberResult(existsResult)
    if (!exists) return 0

    const countQuery = sql`
      SELECT COUNT(*) AS result
      FROM ${sql.identifier(tableName)}
    `
    const countResult = tx.get(countQuery)
    return getNumberResult(countResult)
  })
