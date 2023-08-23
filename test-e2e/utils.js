import { randomBytes } from 'crypto'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { IndexWriter } from '../src/index-writer/index.js'
import { MapeoProject } from '../src/mapeo-project.js'
import { projectTable } from '../src/schema/client.js'

/** @typedef {import('../src/index-writer/index.js').IndexWriter<import('../src/datatype/index.js').MapeoDocTablesMap['project']>} ProjectSettingsIndexWriter */

/**
 * @param {string} [storagePath]
 * @returns {{db: import('drizzle-orm/better-sqlite3').BetterSQLite3Database, indexWriter: IndexWriter}}
 */
export function setupSharedResources(storagePath) {
  const sqlite = new Database(storagePath || ':memory:')
  const db = drizzle(sqlite)
  migrate(drizzle(sqlite), { migrationsFolder: './drizzle/client' })

  return {
    db,
    indexWriter: new IndexWriter({
      tables: [projectTable],
      sqlite,
    }),
  }
}

/**
 * @param {Object} opts
 * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.sharedDb
 * @param {IndexWriter} opts.sharedIndexWriter
 * @param {Buffer} [opts.rootKey]
 * @param {Buffer} [opts.projectKey]
 */
export function createProject({
  sharedDb,
  sharedIndexWriter,
  rootKey = randomBytes(16),
  projectKey = randomBytes(32),
}) {
  return new MapeoProject({
    keyManager: new KeyManager(rootKey),
    projectKey,
    sharedDb,
    sharedIndexWriter: sharedIndexWriter,
  })
}

/**
 * Lazy way of removing fields with undefined values from an object
 * @param {unknown} object
 */
export function removeUndefinedFields(object) {
  return JSON.parse(JSON.stringify(object))
}
