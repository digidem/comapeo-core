// @ts-check
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { CoreManager } from './core-manager/index.js'
import { DataStore } from './datastore/data-store-new.js'
import { DataType } from './datatype/data-type-new.js'
import { IndexWriter } from './index-writer.js'
import { observationTable } from './schema/project.js'
import RandomAccessFile from 'random-access-file'
import RAM from 'random-access-memory'
import Database from 'better-sqlite3'
import path from 'path'
import { RandomAccessFilePool } from './core-manager/random-access-file-pool.js'

const PROJECT_SQLITE_FILE_NAME = 'project.db'
const CORE_STORAGE_FOLDER_NAME = 'cores'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'

export class MapeoProject {
  #coreManager
  #dataStores
  #dataTypes

  /**
   * @param {Object} opts
   * @param {string} [opts.storagePath] Folder for all data storage (hypercores and sqlite db). Folder must exist. If not defined, everything is stored in-memory
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<import('./core-manager/index.js').Namespace, Buffer>>} [opts.encryptionKeys] Encryption keys for each namespace
   */
  constructor({ storagePath, ...coreManagerOpts }) {
    ///////// 1. Setup database

    const dbPath =
      storagePath !== undefined
        ? path.join(storagePath, PROJECT_SQLITE_FILE_NAME)
        : ':memory:'
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)
    migrate(db, { migrationsFolder: './drizzle/project' })

    ///////// 2. Setup random-access-storage functions

    const filePool = storagePath && new RandomAccessFilePool(768)
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
      tables: [observationTable],
      sqlite,
    })
    this.#dataStores = {
      data: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'data',
        indexWriter,
        storage: indexerStorage,
      }),
    }
    this.#dataTypes = {
      observation: new DataType({
        dataStore: this.#dataStores.data,
        table: observationTable,
        db,
      }),
    }
  }

  get observation() {
    return this.#dataTypes.observation
  }
}
