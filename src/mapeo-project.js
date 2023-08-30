// @ts-check
import path from 'path'
import Database from 'better-sqlite3'
import { decodeBlockPrefix } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { CoreManager, NAMESPACES } from './core-manager/index.js'
import { DataStore } from './datastore/index.js'
import { DataType, kCreateWithDocId } from './datatype/index.js'
import { IndexWriter } from './index-writer/index.js'
import { projectTable } from './schema/client.js'
import {
  coreOwnershipTable,
  fieldTable,
  observationTable,
  presetTable,
} from './schema/project.js'
import {
  CoreOwnership,
  getWinner,
  mapAndValidateCoreOwnership,
} from './core-ownership.js'
import { valueOf } from './utils.js'

/** @typedef {Omit<import('@mapeo/schema').ProjectValue, 'schemaName'>} EditableProjectSettings */

const CORESTORE_STORAGE_FOLDER_NAME = 'corestore'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
export const kCoreOwnership = Symbol('coreOwnership')

export class MapeoProject {
  #coreManager
  #dataStores
  #dataTypes
  #projectId
  #coreOwnership

  /**
   * @param {Object} opts
   * @param {string} opts.dbPath Path to store project sqlite db. Use `:memory:` for memory storage
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<import('./core-manager/index.js').Namespace, Buffer>>} [opts.encryptionKeys] Encryption keys for each namespace
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.sharedDb
   * @param {IndexWriter} opts.sharedIndexWriter
   * @param {import('./types.js').CoreStorage} opts.coreStorage Folder to store all hypercore data
   *
   */
  constructor({
    dbPath,
    sharedDb,
    sharedIndexWriter,
    coreStorage,
    keyManager,
    projectKey,
    projectSecretKey,
    encryptionKeys,
  }) {
    // TODO: Update to use @mapeo/crypto when ready (https://github.com/digidem/mapeo-core-next/issues/171)
    this.#projectId = projectKey.toString('hex')

    ///////// 1. Setup database
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)
    migrate(db, { migrationsFolder: './drizzle/project' })

    ///////// 2. Setup random-access-storage functions

    /** @type {ConstructorParameters<typeof CoreManager>[0]['storage']} */
    const coreManagerStorage = (name) =>
      coreStorage(path.join(CORESTORE_STORAGE_FOLDER_NAME, name))

    /** @type {ConstructorParameters<typeof DataStore>[0]['storage']} */
    const indexerStorage = (name) =>
      coreStorage(path.join(INDEXER_STORAGE_FOLDER_NAME, name))

    ///////// 3. Create instances

    this.#coreManager = new CoreManager({
      projectSecretKey,
      encryptionKeys,
      projectKey,
      keyManager,
      storage: coreManagerStorage,
      sqlite,
    })
    const indexWriter = new IndexWriter({
      tables: [observationTable, presetTable, fieldTable, coreOwnershipTable],
      sqlite,
      getWinner,
      mapDoc: (doc, version) => {
        if (doc.schemaName === 'coreOwnership') {
          return mapAndValidateCoreOwnership(doc, version)
        } else {
          return doc
        }
      },
    })
    this.#dataStores = {
      auth: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'auth',
        batch: (entries) => indexWriter.batch(entries),
        storage: indexerStorage,
      }),
      config: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'config',
        batch: (entries) =>
          this.#handleConfigEntries(entries, {
            projectIndexWriter: indexWriter,
            sharedIndexWriter,
          }),
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
        db: sharedDb,
      }),
      coreOwnership: new DataType({
        dataStore: this.#dataStores.auth,
        table: coreOwnershipTable,
        db,
      }),
    }
    this.#coreOwnership = new CoreOwnership({
      dataType: this.#dataTypes.coreOwnership,
    })

    ///////// 4. Write core ownership record

    const authCore = this.#coreManager.getWriterCore('auth').core
    authCore.on('ready', () => {
      if (authCore.length > 0) return
      const identityKeypair = keyManager.getIdentityKeypair()
      const coreKeypairs = getCoreKeypairs({
        projectKey,
        projectSecretKey,
        keyManager,
      })
      this.#coreOwnership.writeOwnership(identityKeypair, coreKeypairs)
    })
  }

  /**
   * CoreOwnership instance, used for tests
   */
  get [kCoreOwnership]() {
    return this.#coreOwnership
  }

  /**
   * Resolves when hypercores have all loaded
   */
  async ready() {
    await this.#coreManager.ready()
  }

  /**
   * @param {import('multi-core-indexer').Entry[]} entries
   * @param {{projectIndexWriter: IndexWriter, sharedIndexWriter: IndexWriter}} indexWriters
   */
  async #handleConfigEntries(
    entries,
    { projectIndexWriter, sharedIndexWriter }
  ) {
    /** @type {import('multi-core-indexer').Entry[]} */
    const projectSettingsEntries = []
    /** @type {import('multi-core-indexer').Entry[]} */
    const otherEntries = []

    for (const entry of entries) {
      try {
        const { schemaName } = decodeBlockPrefix(entry.block)

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
      projectIndexWriter.batch(otherEntries),
      sharedIndexWriter.batch(projectSettingsEntries),
    ])
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
   * @param {Partial<EditableProjectSettings>} settings
   * @returns {Promise<EditableProjectSettings>}
   */
  async $setProjectSettings(settings) {
    const { project } = this.#dataTypes

    // We only want to catch the error to the getByDocId call
    // Using try/catch for this is a little verbose when dealing with TS types
    const existing = await project.getByDocId(this.#projectId).catch(() => {
      // project does not exist so return null
      return null
    })

    if (existing) {
      return extractEditableProjectSettings(
        await project.update([existing.versionId, ...existing.forks], {
          ...valueOf(existing),
          ...settings,
        })
      )
    }

    return extractEditableProjectSettings(
      await project[kCreateWithDocId](this.#projectId, {
        ...settings,
        schemaName: 'project',
      })
    )
  }

  /**
   * @returns {Promise<EditableProjectSettings>}
   */
  async $getProjectSettings() {
    try {
      return extractEditableProjectSettings(
        await this.#dataTypes.project.getByDocId(this.#projectId)
      )
    } catch {
      return /** @type {EditableProjectSettings} */ ({})
    }
  }
}

/**
 * @param {import("@mapeo/schema").Project & { forks: string[] }} projectDoc
 * @returns {EditableProjectSettings}
 */
function extractEditableProjectSettings(projectDoc) {
  // eslint-disable-next-line no-unused-vars
  const { schemaName, ...result } = valueOf(projectDoc)
  return result
}

/**
 * Return a map of namespace -> core keypair
 *
 * For the project owner the keypair for the 'auth' namespace is the projectKey
 * and projectSecretKey. In all other cases keypairs are derived from the
 * project key
 *
 * @param {object} opts
 * @param {Buffer} opts.projectKey
 * @param {Buffer} [opts.projectSecretKey]
 * @param {import('@mapeo/crypto').KeyManager} opts.keyManager
 * @returns {Record<import('./core-manager/core-index.js').Namespace, import('./types.js').KeyPair>}
 */
function getCoreKeypairs({ projectKey, projectSecretKey, keyManager }) {
  const keypairs =
    /** @type {Record<import('./core-manager/core-index.js').Namespace, import('./types.js').KeyPair>} */ ({})

  for (const namespace of NAMESPACES) {
    keypairs[namespace] =
      namespace === 'auth' && projectSecretKey
        ? { publicKey: projectKey, secretKey: projectSecretKey }
        : keyManager.getHypercoreKeypair(namespace, projectKey)
  }

  return keypairs
}
