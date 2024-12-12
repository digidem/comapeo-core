import { sql } from 'drizzle-orm'
import { assert } from '../utils.js'
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator'
import { DRIZZLE_MIGRATIONS_TABLE } from '../constants.js'
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
const safeCountTableRows = (db, tableName) =>
  db.transaction((tx) => {
    const existsQuery = sql`
      SELECT EXISTS (
        SELECT 1
        FROM sqlite_schema
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

/**
 * @internal
 * @typedef {'initialized database' | 'migrated' | 'no migration'} MigrationResult
 */

/**
 * Wrapper around Drizzle's migration function. Returns what happened during
 * migration; did a migration occur?
 *
 * @param {BetterSQLite3Database} db
 * @param {object} options
 * @param {string} options.migrationsFolder
 * @returns {MigrationResult}
 */
export const migrate = (db, { migrationsFolder }) => {
  const migrationsBefore = safeCountTableRows(db, DRIZZLE_MIGRATIONS_TABLE)
  drizzleMigrate(db, {
    migrationsFolder,
    migrationsTable: DRIZZLE_MIGRATIONS_TABLE,
  })
  const migrationsAfter = safeCountTableRows(db, DRIZZLE_MIGRATIONS_TABLE)

  if (migrationsAfter === migrationsBefore) return 'no migration'

  if (migrationsBefore === 0) return 'initialized database'

  return 'migrated'
}
