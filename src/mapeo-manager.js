import { randomBytes } from 'crypto'
import path from 'path'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { IndexWriter } from './index-writer/index.js'
import { MapeoProject } from './mapeo-project.js'
import { projectKeysTable, projectTable } from './schema/client.js'
import { ProjectKeys } from './generated/keys.js'

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
   * @param {import('type-fest').Simplify<Partial<Pick<import("@mapeo/schema").ProjectValue, 'name'>>>} settings
   * @returns {Promise<string>}
   */
  async createProject(settings) {
    // 1. Create project keypair
    const projectKeypair = KeyManager.generateProjectKeypair()

    // 2. Create namespace encryption keys
    /** @type {Record<import('./core-manager/core-index.js').Namespace, Buffer>} */
    const encryptionKeys = {
      auth: randomBytes(32),
      blob: randomBytes(32),
      blobIndex: randomBytes(32),
      config: randomBytes(32),
      data: randomBytes(32),
    }

    // 3. Save keys to client db in projectKeys table
    /** @type {import('./types.js').ProjectKeys} */
    const keys = {
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      encryptionKeys,
    }

    // TODO: Update to use @mapeo/crypto when ready (https://github.com/digidem/mapeo-core-next/issues/171)
    const projectId = projectKeypair.publicKey.toString('hex')

    this.#db
      .insert(projectKeysTable)
      .values({
        projectId,
        keysCipher: this.#keyManager.encryptLocalMessage(
          Buffer.from(ProjectKeys.encode(keys).finish()),
          projectId
        ),
      })
      .run()

    // 4. Create MapeoProject instance
    const project = new MapeoProject({
      storagePath: this.#storagePath,
      encryptionKeys,
      keyManager: this.#keyManager,
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
    })

    // 5. Write project name and any other relevant metadata to project instance
    await project.$setProjectSettings({
      name: settings.name,
    })

    // 6. Return project id
    return projectId
  }

  /**
   * @param {string} projectId
   * @returns {Promise<MapeoProject>}
   */
  async getProject(projectId) {
    const result = this.#db
      .select({
        keysCipher: projectKeysTable.keysCipher,
      })
      .from(projectKeysTable)
      .where(eq(projectKeysTable.projectId, projectId))
      .get()

    if (!result) {
      throw new Error(
        `Could not find keys cipher for project with ID ${projectId}`
      )
    }

    const { projectKey, projectSecretKey, encryptionKeys } = ProjectKeys.decode(
      this.#keyManager.decryptLocalMessage(result.keysCipher, projectId)
    )

    const project = new MapeoProject({
      storagePath: this.#storagePath,
      projectKey,
      projectSecretKey,
      encryptionKeys,
      keyManager: this.#keyManager,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
    })

    return project
  }
}
