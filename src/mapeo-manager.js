import { randomBytes } from 'crypto'
import path from 'path'
import { serialize, deserialize } from 'v8'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { IndexWriter } from './index-writer/index.js'
import { MapeoProject } from './mapeo-project.js'
import { projectKeysTable, projectTable } from './schema/client.js'
import { NAMESPACES } from './core-manager/index.js'

/** @typedef {import('./types.js').ProjectKeys} ProjectKeys */

const CLIENT_SQLITE_FILE_NAME = 'client.db'

export class MapeoManager {
  #keyManager
  #projectSettingsIndexWriter
  #storagePath
  #db

  /**
   * @param {Object} [opts]
   * @param {string} [opts.storagePath] Folder for all data storage (hypercores and sqlite db). Folder must exist. If not defined, everything is stored in-memory
   */
  constructor({ storagePath } = {}) {
    const dbPath =
      storagePath !== undefined
        ? path.join(storagePath, CLIENT_SQLITE_FILE_NAME)
        : ':memory:'

    const sqlite = new Database(dbPath)
    this.#db = drizzle(sqlite)
    migrate(this.#db, { migrationsFolder: './drizzle/client' })

    this.#keyManager = new KeyManager(KeyManager.generateRootKey())
    this.#projectSettingsIndexWriter = new IndexWriter({
      tables: [projectTable],
      sqlite,
    })
    this.#storagePath = storagePath
  }

  /**
   * Create a new project.
   * @param {import('type-fest').Simplify<Partial<Omit<import("@mapeo/schema").ProjectValue, 'schemaName'>>>} settings
   * @returns {Promise<string>}
   */
  async createProject(settings) {
    // 1. Create project keypair
    const projectKeypair = {
      publicKey: randomBytes(32),
      secretKey: randomBytes(64),
    }

    // 2. Create namespace encryption keys
    /** @type {Record<import('./core-manager/core-index.js').Namespace, Buffer>} */
    const namespaceEncryptionKeys = {
      auth: randomBytes(32),
      blob: randomBytes(32),
      blobIndex: randomBytes(32),
      config: randomBytes(32),
      data: randomBytes(32),
    }

    // 3. Save keys to client db in projectKeys table
    /** @type {ProjectKeys} */
    const keys = {
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      authEncryptionKey: namespaceEncryptionKeys.auth,
      blobEncryptionKey: namespaceEncryptionKeys.blob,
      blobIndexEncryptionKey: namespaceEncryptionKeys.blobIndex,
      configEncryptionKey: namespaceEncryptionKeys.config,
      dataEncryptionKey: namespaceEncryptionKeys.data,
    }

    // TODO: Update to use @mapeo/crypto when ready (https://github.com/digidem/mapeo-core-next/issues/171)
    const projectId = projectKeypair.publicKey.toString('hex')

    this.#db
      .insert(projectKeysTable)
      .values({
        projectId,
        encryptionKeys: this.#keyManager.encryptLocalMessage(
          serialize(keys),
          projectId
        ),
      })
      .run()

    // 4. Create MapeoProject instance
    const project = new MapeoProject({
      projectSettingsConfig: {
        db: this.#db,
        indexWriter: this.#projectSettingsIndexWriter,
      },
      storagePath: this.#storagePath,
      encryptionKeys: namespaceEncryptionKeys,
      keyManager: this.#keyManager,
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
    })

    // 5. Write project name and any other relevant metadata to project instance
    await project.$setProjectSettings({
      // TODO: What's the fallback name?
      name: settings.name || '',
      defaultPresets: settings.defaultPresets || {},
    })

    // 6. Return project id
    return projectId
  }

  /**
   * @param {string} projectId
   * @returns {MapeoProject}
   */
  getProject(projectId) {
    const result = this.#db
      .select({
        encryptionKeys: projectKeysTable.encryptionKeys,
      })
      .from(projectKeysTable)
      .where(eq(projectKeysTable.projectId, projectId))
      .get()

    if (!result.encryptionKeys) {
      throw new Error(
        `Could not find encryption keys for project with id ${projectId}`
      )
    }

    const keys = deserialize(
      this.#keyManager.decryptLocalMessage(result.encryptionKeys, projectId)
    )

    validateProjectKeys(keys)

    const project = new MapeoProject({
      storagePath: this.#storagePath,
      projectKey: keys.projectKey,
      projectSecretKey: keys.projectSecretKey,
      encryptionKeys: {
        auth: keys.authEncryptionKey,
        blob: keys.blobEncryptionKey,
        blobIndex: keys.blobIndexEncryptionKey,
        config: keys.configEncryptionKey,
        data: keys.dataEncryptionKey,
      },
      keyManager: this.#keyManager,
      projectSettingsConfig: {
        indexWriter: this.#projectSettingsIndexWriter,
        db: this.#db,
      },
    })

    return project
  }
}

/**
 * @param {{[key: string]: unknown}} keys
 * @returns {asserts keys is ProjectKeys}
 */
function validateProjectKeys(keys) {
  /** @type {(keyof import('./types.js').ProjectKeys)[]} */
  const keynamesToCheck = [
    'projectKey',
    'projectSecretKey',
    ...NAMESPACES.map((n) => /** @type {const} */ (`${n}EncryptionKey`)),
  ]

  for (const keyname of keynamesToCheck) {
    const value = keys[keyname]

    // Check that required keys are defined
    if (keyname === 'projectKey' || keyname === 'authEncryptionKey') {
      if (value === undefined) {
        throw new Error(`${keyname} is required but not found`)
      }
    }

    // If key's value exists, make sure it's the correct type (buffer)
    if (value !== undefined && !Buffer.isBuffer(value)) {
      throw new Error(
        `${keyname} found but expected buffer type. Received ${typeof value}`
      )
    }
  }
}
