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
import { deNullify } from './utils.js'

/** @typedef {import("@mapeo/schema").ProjectValue} ProjectValue */

const CLIENT_SQLITE_FILE_NAME = 'client.db'

export class MapeoManager {
  #keyManager
  #projectSettingsIndexWriter
  #storagePath
  #db
  /** @type {Map<string, MapeoProject>} */
  #activeProjects

  /**
   * @param {Object} opts
   * @param {Buffer} opts.rootKey 16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo
   * @param {string} [opts.storagePath] Folder for all data storage (hypercores and sqlite db). Folder must exist. If not defined, everything is stored in-memory
   */
  constructor({ rootKey, storagePath }) {
    const dbPath =
      storagePath !== undefined
        ? path.join(storagePath, CLIENT_SQLITE_FILE_NAME)
        : ':memory:'

    const sqlite = new Database(dbPath)
    this.#db = drizzle(sqlite)
    migrate(this.#db, { migrationsFolder: './drizzle/client' })

    this.#keyManager = new KeyManager(rootKey)
    this.#projectSettingsIndexWriter = new IndexWriter({
      tables: [projectTable],
      sqlite,
    })
    this.#storagePath = storagePath
    this.#activeProjects = new Map()
  }

  /**
   * @param {Buffer} keysCipher
   * @param {string} projectId
   * @returns {ProjectKeys}
   */
  #decodeProjectKeysCipher(keysCipher, projectId) {
    return ProjectKeys.decode(
      this.#keyManager.decryptLocalMessage(keysCipher, projectId)
    )
  }

  /**
   * @param {Object} opts
   * @param {string} opts.projectId
   * @param {ProjectKeys} opts.projectKeys
   * @param {{ name?: string, addedAt: string }} [opts.projectInfo]
   */
  #saveToProjectKeysTable({ projectId, projectKeys, projectInfo }) {
    this.#db
      .insert(projectKeysTable)
      .values({
        projectId,
        keysCipher: this.#keyManager.encryptLocalMessage(
          Buffer.from(ProjectKeys.encode(projectKeys).finish().buffer),
          projectId
        ),
        projectInfo,
      })
      .run()
  }

  /**
   * Create a new project.
   * @param {import('type-fest').Simplify<Partial<Pick<ProjectValue, 'name'>>>} [settings]
   * @returns {Promise<string>}
   */
  async createProject(settings = {}) {
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
    /** @type {ProjectKeys} */
    const keys = {
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      encryptionKeys,
    }

    // TODO: Update to use @mapeo/crypto when ready (https://github.com/digidem/mapeo-core-next/issues/171)
    const projectId = projectKeypair.publicKey.toString('hex')

    this.#saveToProjectKeysTable({ projectId, projectKeys: keys })

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
    await project.$setProjectSettings(settings)

    // TODO: Close the project instance instead of keeping it around
    // https://github.com/digidem/mapeo-core-next/issues/207
    this.#activeProjects.set(projectId, project)

    // 6. Return project id
    return projectId
  }

  /**
   * @param {string} projectId
   * @returns {Promise<MapeoProject>}
   */
  async getProject(projectId) {
    const existing = this.#activeProjects.get(projectId)

    if (existing) return existing

    const result = this.#db
      .select({
        keysCipher: projectKeysTable.keysCipher,
      })
      .from(projectKeysTable)
      .where(eq(projectKeysTable.projectId, projectId))
      .get()

    if (!result) {
      throw new Error(`NotFound: project ID ${projectId} not found`)
    }

    const projectKeys = this.#decodeProjectKeysCipher(
      result.keysCipher,
      projectId
    )

    const project = new MapeoProject({
      ...projectKeys,
      storagePath: this.#storagePath,
      keyManager: this.#keyManager,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
    })

    return project
  }

  /**
   * @returns {Promise<Array<Pick<ProjectValue, 'name'> & { projectId: string, createdAt: string, updatedAt: string }>>}
   */
  async listProjects() {
    const allProjectKeysResult = this.#db.select().from(projectKeysTable).all()

    const allProjectsResult = this.#db
      .select({
        projectId: projectTable.docId,
        createdAt: projectTable.createdAt,
        updatedAt: projectTable.updatedAt,
        name: projectTable.name,
      })
      .from(projectTable)
      .all()

    /** @type {Array<Pick<ProjectValue, 'name'> & { projectId: string, createdAt: string, updatedAt: string }>} */
    const result = []

    for (const { projectId, projectInfo } of allProjectKeysResult) {
      const existingProject = allProjectsResult.find(
        (p) => p.projectId === projectId
      )

      if (!existingProject) continue

      const nameFromProjectKeys =
        projectInfo &&
        typeof projectInfo === 'object' &&
        'name' in projectInfo &&
        typeof projectInfo.name === 'string'
          ? projectInfo.name
          : null

      result.push(
        deNullify({
          ...existingProject,
          name: existingProject?.name || nameFromProjectKeys,
        })
      )
    }

    return result
  }

  /**
   * @param {import('./generated/rpc.js').Invite} invite
   * @returns {Promise<string>}
   */
  async addProject({ projectKey, encryptionKeys, projectInfo }) {
    const projectId = projectKey.toString('hex')

    const activeProject = this.#activeProjects.get(projectId)

    if (activeProject) {
      throw new Error(`Project with ID ${projectId} already exists`)
    }

    const existingProjectFromDb = this.#db
      .select()
      .from(projectTable)
      .where(eq(projectTable.docId, projectId))
      .get()

    if (existingProjectFromDb) {
      throw new Error(`Project with ID ${projectId} already exists`)
    }

    this.#saveToProjectKeysTable({
      projectId,
      projectKeys: {
        projectKey,
        encryptionKeys,
      },
      projectInfo: {
        ...projectInfo,
        // TODO: Should this come from the invite or be generated here?
        addedAt: new Date().toISOString(),
      },
    })

    const project = new MapeoProject({
      projectKey,
      encryptionKeys,
      storagePath: this.#storagePath,
      keyManager: this.#keyManager,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
    })

    // TODO: Close the project instance instead of keeping it around
    // https://github.com/digidem/mapeo-core-next/issues/207
    this.#activeProjects.set(projectId, project)

    return projectId
  }
}
