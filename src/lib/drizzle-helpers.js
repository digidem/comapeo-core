import { count, eq, sql } from 'drizzle-orm'
import { assert } from '../utils.js'
import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator'
import { DRIZZLE_MIGRATIONS_TABLE } from '../constants.js'
import { coresTable } from '../schema/client.js'
import { coresTable_Deprecated } from '../schema/project.js'
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
 * @template {Record<string, unknown>} TSchema
 * @param {BetterSQLite3Database<TSchema>} db
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
 * @template {Record<string, unknown>} TSchema
 * @param {BetterSQLite3Database<TSchema>} db
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

/**
 * Copy the `cores` table from the project database to the client database.
 * @param {object} options
 * @param {BetterSQLite3Database<import('../schema/client.js')>} options.clientDb
 * @param {BetterSQLite3Database<import('../schema/project.js')>} options.projectDb
 * @param {string} options.projectPublicId
 * @returns {void}
 */
export function migrateCoresTable({ clientDb, projectDb, projectPublicId }) {
  const migratedRowCount =
    clientDb
      .select({ count: count() })
      .from(coresTable)
      .where(eq(coresTable.projectPublicId, projectPublicId))
      .get()?.count || 0
  if (migratedRowCount > 0) {
    // Already migrated, nothing to do
    return
  }
  const projectCores = projectDb.select().from(coresTable_Deprecated).all()
  if (projectCores.length === 0) {
    // No cores to migrate
    return
  }

  clientDb.transaction((tx) => {
    for (const core of projectCores) {
      tx.insert(coresTable)
        .values({
          ...core,
          projectPublicId,
        })
        .run()
    }
  })
  // Verify that the migration was successful
  const migratedCount =
    clientDb
      .select({ count: count() })
      .from(coresTable)
      .where(eq(coresTable.projectPublicId, projectPublicId))
      .get()?.count || 0
  assert(
    migratedCount === projectCores.length,
    `Expected to migrate ${projectCores.length} cores, but migrated ${migratedCount}`
  )
}
