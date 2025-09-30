import { count, eq, sql } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'
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
 * Get the latest migration time, or 0 if no migrations have been run or the
 * migrations table has not been created yet.
 *
 * @template {Record<string, unknown>} TSchema
 * @param {BetterSQLite3Database<TSchema>} db
 * @param {string} tableName
 * @returns {number}
 */
const safeGetLatestMigrationMillis = (db) =>
  db.transaction((tx) => {
    const existsQuery = sql`
      SELECT EXISTS (
        SELECT 1
        FROM sqlite_schema
        WHERE type IS 'table'
        AND name IS ${DRIZZLE_MIGRATIONS_TABLE}
      ) AS result
    `
    const existsResult = tx.get(existsQuery)
    const exists = getNumberResult(existsResult)
    if (!exists) return 0

    const latestMigrationQuery = sql`SELECT created_at as result FROM ${sql.identifier(
      DRIZZLE_MIGRATIONS_TABLE
    )} ORDER BY created_at DESC LIMIT 1`

    return getNumberResult(tx.get(latestMigrationQuery))
  })

/**
 * @internal
 * @typedef {'initialized database' | 'migrated' | 'no migration'} MigrationResult
 */

/**
 * Migrate db with optional JS migration functions for each migration step.
 * Useful if some code needs to run for a particular migration step, to avoid
 * running it unnecessarily for every new instance.
 *
 * Returns what happened during migration; did a migration occur?
 *
 * @template {Record<string, unknown>} TSchema
 * @param {BetterSQLite3Database<TSchema>} db
 * @param {object} options
 * @param {string} options.migrationsFolder
 * @param {Record<string, (db: BetterSQLite3Database) => void>} [options.migrationFns]
 * @returns {MigrationResult}
 */
export function migrate(db, { migrationsFolder, migrationFns = {} }) {
  const journal = /** @type {unknown} */ (
    JSON.parse(
      fs.readFileSync(
        path.join(migrationsFolder, 'meta/_journal.json'),
        'utf-8'
      )
    )
  )
  // Drizzle _could_ decide to change the journal format in the future, but this
  // assertion will ensure that tests fail if they do.
  assertValidJournal(journal)

  const prevMigrationMillis = safeGetLatestMigrationMillis(db)

  drizzleMigrate(db, {
    migrationsFolder,
    migrationsTable: DRIZZLE_MIGRATIONS_TABLE,
  })

  for (const entry of journal.entries) {
    if (entry.when <= prevMigrationMillis) continue
    const fn = migrationFns[entry.tag]
    if (fn) fn(db)
  }

  const lastMigrationMillis = safeGetLatestMigrationMillis(db)

  if (lastMigrationMillis === prevMigrationMillis) return 'no migration'

  if (prevMigrationMillis === 0) return 'initialized database'

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

 * Assert that the migration journal is the expected format.
 * @param {unknown} journal
 * @returns {asserts journal is { version: '5', entries: { tag: string, when: number }[] }}
 */
function assertValidJournal(journal) {
  assert(journal && typeof journal === 'object', 'invalid journal')
  assert(
    'version' in journal && journal.version === '5',
    'unexpected journal version'
  )
  assert(
    'entries' in journal &&
      Array.isArray(journal.entries) &&
      journal.entries.every(
        /** @param {unknown} m */
        (m) =>
          m &&
          typeof m === 'object' &&
          'tag' in m &&
          typeof m.tag === 'string' &&
          'when' in m &&
          typeof m.when === 'number'
      ),
    'invalid entries in journal'
  )
}
