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
 */
export function setupClient(storagePath) {
  const sqlite = new Database(storagePath || ':memory:')
  const clientDb = drizzle(sqlite)
  migrate(drizzle(sqlite), { migrationsFolder: './drizzle/client' })

  const projectSettingsIndexWriter = new IndexWriter({
    tables: [projectTable],
    sqlite,
  })

  return { clientDb, projectSettingsIndexWriter }
}

/**
 * @param {Object} opts
 * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.clientDb
 * @param {ProjectSettingsIndexWriter} opts.projectSettingsIndexWriter
 * @param {Buffer} [opts.rootKey]
 * @param {Buffer} [opts.projectKey]
 */
export function createProject({
  clientDb,
  projectSettingsIndexWriter,
  rootKey = randomBytes(16),
  projectKey = randomBytes(32),
}) {
  return new MapeoProject({
    keyManager: new KeyManager(rootKey),
    projectKey,
    projectSettingsConfig: {
      db: clientDb,
      indexWriter: projectSettingsIndexWriter,
    },
  })
}
