// @ts-check
import { decode } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { CoreManager } from './core-manager/index.js'
import { DataStore } from './datastore/index.js'
import { DataType, kCreateWithDocId } from './datatype/index.js'
import { IndexWriter } from './index-writer/index.js'
import { projectTable } from './schema/client.js'
import { fieldTable, observationTable, presetTable } from './schema/project.js'
import RandomAccessFile from 'random-access-file'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import path from 'path'
import { RandomAccessFilePool } from './core-manager/random-access-file-pool.js'

/** @typedef {Object} ProjectSettingsConfig
 *
 * @property {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} db
 * @property {IndexWriter<import('./datatype/index.js').MapeoDocTablesMap['project']>} indexWriter
 */

const PROJECT_SQLITE_FILE_NAME = 'project.db'
const CORE_STORAGE_FOLDER_NAME = 'cores'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
// Max file descriptors that RandomAccessFile should use for hypercore storage
// and index bitfield persistence (used by MultiCoreIndexer). Android has a
// limit of 1024 per process, so choosing 768 to leave 256 descriptors free for
// other things e.g. SQLite and other parts of the app.
const MAX_FILE_DESCRIPTORS = 768

export class MapeoProject {
  #coreManager
  #dataStores
  #dataTypes
  #projectId

  /**
   * @param {Object} opts
   * @param {string} [opts.storagePath] Folder for all data storage (hypercores and sqlite db). Folder must exist. If not defined, everything is stored in-memory
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<import('./core-manager/index.js').Namespace, Buffer>>} [opts.encryptionKeys] Encryption keys for each namespace
   * @param {ProjectSettingsConfig} opts.projectSettingsConfig
   */
  constructor({ storagePath, projectSettingsConfig, ...coreManagerOpts }) {
    // TODO: Update to use @mapeo/crypto when ready (https://github.com/digidem/mapeo-core-next/issues/171)
    this.#projectId = coreManagerOpts.projectKey.toString('hex')

    ///////// 1. Setup database

    const dbPath =
      storagePath !== undefined
        ? path.join(storagePath, PROJECT_SQLITE_FILE_NAME)
        : ':memory:'
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)
    migrate(db, { migrationsFolder: './drizzle/project' })

    ///////// 2. Setup random-access-storage functions

    const filePool =
      storagePath !== undefined
        ? new RandomAccessFilePool(MAX_FILE_DESCRIPTORS)
        : undefined
    /** @type {ConstructorParameters<typeof CoreManager>[0]['storage']} */
    const coreManagerStorage =
      storagePath !== undefined
        ? (name) =>
            new RandomAccessFile(
              path.join(storagePath, CORE_STORAGE_FOLDER_NAME, name),
              { pool: filePool }
            )
        : () => new RAM()
    /** @type {ConstructorParameters<typeof DataStore>[0]['storage']} */
    const indexerStorage =
      storagePath !== undefined
        ? (name) =>
            new RandomAccessFile(
              path.join(storagePath, INDEXER_STORAGE_FOLDER_NAME, name),
              { pool: filePool }
            )
        : () => new RAM()

    ///////// 3. Create instances

    this.#coreManager = new CoreManager({
      ...coreManagerOpts,
      storage: coreManagerStorage,
      sqlite,
    })
    const indexWriter = new IndexWriter({
      tables: [observationTable, presetTable, fieldTable],
      sqlite,
    })
    this.#dataStores = {
      config: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'config',
        batch: async (entries) => {
          /** @type {import('multi-core-indexer').Entry[]} */
          const projectSettingsEntries = []
          /** @type {import('multi-core-indexer').Entry[]} */
          const otherEntries = []

          for (const entry of entries) {
            try {
              // TODO: replace with optimized function (https://github.com/digidem/mapeo-schema/pull/130)
              const { schemaName } = decode(entry.block, {
                index: entry.index,
                coreKey: entry.key,
              })

              if (schemaName === 'project') {
                projectSettingsEntries.push(entry)
              } else {
                otherEntries.push(entry)
              }
            } catch {
              // Ignore errors thrown by values that can't be decoded for now
            }
          }

          await Promise.all([
            indexWriter.batch(otherEntries),
            projectSettingsConfig.indexWriter.batch(projectSettingsEntries),
          ])
        },
        storage: indexerStorage,
      }),
      data: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'data',
        batch: (entries) => indexWriter.batch(entries),
        storage: indexerStorage,
      }),
    }
    this.#dataTypes = {
      observation: new DataType({
        dataStore: this.#dataStores.data,
        table: observationTable,
        db,
      }),
      preset: new DataType({
        dataStore: this.#dataStores.config,
        table: presetTable,
        db,
      }),
      field: new DataType({
        dataStore: this.#dataStores.config,
        table: fieldTable,
        db,
      }),
      project: new DataType({
        dataStore: this.#dataStores.config,
        table: projectTable,
        db: projectSettingsConfig.db,
      }),
    }
  }

  get observation() {
    return this.#dataTypes.observation
  }
  get preset() {
    return this.#dataTypes.preset
  }
  get field() {
    return this.#dataTypes.field
  }

  /**
   * @param {Omit<import('@mapeo/schema').ProjectValue, 'schemaName'>} settings
   * @param {string} [versionId]
   * @returns {Promise<import('@mapeo/schema').Project>}
   */
  async $setProjectSettings(settings, versionId) {
    if (versionId) {
      const existing = await this.#dataTypes.project.getByVersionId(versionId)

      if (existing) {
        return this.#dataTypes.project.update(existing.versionId, {
          ...settings,
          schemaName: 'project',
        })
      }
    }

    return this.#dataTypes.project[kCreateWithDocId](this.#projectId, {
      ...settings,
      schemaName: 'project',
    })
  }

  /**
   * @returns {Promise<import('@mapeo/schema').Project>}
   */
  async $getProjectSettings() {
    return this.#dataTypes.project.getByDocId(this.#projectId)
  }
}
