import { randomBytes } from 'crypto'
import path from 'path'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Hypercore from 'hypercore'
import { IndexWriter } from './index-writer/index.js'
import { MapeoProject } from './mapeo-project.js'
import {
  localDeviceInfoTable,
  projectKeysTable,
  projectTable,
} from './schema/client.js'
import { ProjectKeys } from './generated/keys.js'
import {
  deNullify,
  projectIdToNonce,
  projectKeyToId,
  projectKeyToPublicId,
} from './utils.js'
import { RandomAccessFilePool } from './core-manager/random-access-file-pool.js'
import { MapeoRPC } from './rpc/index.js'

/** @typedef {import("@mapeo/schema").ProjectValue} ProjectValue */
/** @typedef {import('./types.js').ProjectId} ProjectId */
/** @typedef {import('./types.js').ProjectPublicId} ProjectPublicId */

const CLIENT_SQLITE_FILE_NAME = 'client.db'

// Max file descriptors that RandomAccessFile should use for hypercore storage
// and index bitfield persistence (used by MultiCoreIndexer). Android has a
// limit of 1024 per process, so choosing 768 to leave 256 descriptors free for
// other things e.g. SQLite and other parts of the app.
const MAX_FILE_DESCRIPTORS = 768

export class MapeoManager {
  #keyManager
  #projectSettingsIndexWriter
  #db
  /** @type {Map<ProjectPublicId, MapeoProject>} */
  #activeProjects
  /** @type {import('./types.js').CoreStorage} */
  #coreStorage
  #dbFolder
  #deviceId
  #rpc

  /**
   * @param {Object} opts
   * @param {Buffer} opts.rootKey 16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo
   * @param {string} opts.dbFolder Folder for sqlite Dbs. Folder must exist. Use ':memory:' to store everything in-memory
   * @param {string | import('./types.js').CoreStorage} opts.coreStorage Folder for hypercore storage or a function that returns a RandomAccessStorage instance
   */
  constructor({ rootKey, dbFolder, coreStorage }) {
    this.#dbFolder = dbFolder
    const sqlite = new Database(
      dbFolder === ':memory:'
        ? ':memory:'
        : path.join(dbFolder, CLIENT_SQLITE_FILE_NAME)
    )
    this.#db = drizzle(sqlite)
    migrate(this.#db, { migrationsFolder: './drizzle/client' })

    this.#rpc = new MapeoRPC()
    this.#keyManager = new KeyManager(rootKey)
    this.#deviceId = this.#keyManager
      .getIdentityKeypair()
      .publicKey.toString('hex')
    this.#projectSettingsIndexWriter = new IndexWriter({
      tables: [projectTable],
      sqlite,
    })
    this.#activeProjects = new Map()

    if (typeof coreStorage === 'string') {
      const pool = new RandomAccessFilePool(MAX_FILE_DESCRIPTORS)
      // @ts-ignore
      this.#coreStorage = Hypercore.createStorage(coreStorage, { pool })
    } else {
      this.#coreStorage = coreStorage
    }
  }

  /**
   * @param {Buffer} keysCipher
   * @param {ProjectId} projectId
   * @returns {ProjectKeys}
   */
  #decodeProjectKeysCipher(keysCipher, projectId) {
    const nonce = projectIdToNonce(projectId)
    return ProjectKeys.decode(
      this.#keyManager.decryptLocalMessage(keysCipher, nonce)
    )
  }

  /**
   * @param {ProjectId} projectId
   * @returns {Pick<ConstructorParameters<typeof MapeoProject>[0], 'dbPath' | 'coreStorage'>}
   */
  #projectStorage(projectId) {
    return {
      dbPath:
        this.#dbFolder === ':memory:'
          ? ':memory:'
          : path.join(this.#dbFolder, projectId + '.db'),
      coreStorage: (name) => this.#coreStorage(path.join(projectId, name)),
    }
  }

  /**
   * @param {Object} opts
   * @param {ProjectId} opts.projectId
   * @param {ProjectPublicId} opts.projectPublicId
   * @param {ProjectKeys} opts.projectKeys
   * @param {import('./generated/rpc.js').Invite_ProjectInfo} [opts.projectInfo]
   */
  #saveToProjectKeysTable({
    projectId,
    projectPublicId,
    projectKeys,
    projectInfo,
  }) {
    const encoded = ProjectKeys.encode(projectKeys).finish()
    const nonce = projectIdToNonce(projectId)

    this.#db
      .insert(projectKeysTable)
      .values({
        projectId,
        projectPublicId,
        keysCipher: this.#keyManager.encryptLocalMessage(
          Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength),
          nonce
        ),
        projectInfo,
      })
      .run()
  }

  /**
   * Create a new project.
   * @param {import('type-fest').Simplify<Partial<Pick<ProjectValue, 'name'>>>} [settings]
   * @returns {Promise<ProjectPublicId>}
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

    // 3. Save keys to client db  projectKeys table
    /** @type {ProjectKeys} */
    const keys = {
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      encryptionKeys,
    }

    const projectId = projectKeyToId(keys.projectKey)
    const projectPublicId = projectKeyToPublicId(keys.projectKey)

    this.#saveToProjectKeysTable({
      projectId,
      projectPublicId,
      projectKeys: keys,
    })

    // 4. Create MapeoProject instance
    const project = new MapeoProject({
      ...this.#projectStorage(projectId),
      encryptionKeys,
      keyManager: this.#keyManager,
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
      rpc: this.#rpc,
    })

    // 5. Write project name and any other relevant metadata to project instance
    await project.$setProjectSettings(settings)

    // TODO: Close the project instance instead of keeping it around
    this.#activeProjects.set(projectPublicId, project)

    // 6. Return project public id
    return projectPublicId
  }

  /**
   * @param {ProjectPublicId} projectPublicId
   * @returns {Promise<MapeoProject>}
   */
  async getProject(projectPublicId) {
    // 1. Check for existing active project
    const activeProject = this.#activeProjects.get(projectPublicId)

    if (activeProject) return activeProject

    // 2. Create project instance
    const projectKeysTableResult = this.#db
      .select({
        projectId: projectKeysTable.projectId,
        keysCipher: projectKeysTable.keysCipher,
      })
      .from(projectKeysTable)
      .where(eq(projectKeysTable.projectPublicId, projectPublicId))
      .get()

    if (!projectKeysTableResult) {
      throw new Error(`NotFound: project ID ${projectPublicId} not found`)
    }

    const projectId = /** @type {ProjectId} */ (
      projectKeysTableResult.projectId
    )

    const projectKeys = this.#decodeProjectKeysCipher(
      projectKeysTableResult.keysCipher,
      projectId
    )

    const project = new MapeoProject({
      ...this.#projectStorage(projectId),
      ...projectKeys,
      keyManager: this.#keyManager,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
      rpc: this.#rpc,
    })

    // 3. Keep track of project instance as we know it's a properly existing project
    this.#activeProjects.set(projectPublicId, project)

    return project
  }

  /**
   * @returns {Promise<Array<Pick<ProjectValue, 'name'> & { projectId: ProjectPublicId, createdAt?: string, updatedAt?: string }>>}
   */
  async listProjects() {
    // We use the project keys table as the source of truth for projects that exist
    // because we will always update this table when doing a create or add
    // whereas the project table will only have projects that have been created, or added + synced
    const allProjectKeysResult = this.#db
      .select({
        projectId: projectKeysTable.projectId,
        projectPublicId: projectKeysTable.projectPublicId,
        projectInfo: projectKeysTable.projectInfo,
      })
      .from(projectKeysTable)
      .all()

    const allProjectsResult = this.#db
      .select({
        projectId: projectTable.docId,
        createdAt: projectTable.createdAt,
        updatedAt: projectTable.updatedAt,
        name: projectTable.name,
      })
      .from(projectTable)
      .all()

    /** @type {Array<Pick<ProjectValue, 'name'> & { projectId: ProjectPublicId, createdAt?: string, updatedAt?: string }>} */
    const result = []

    for (const {
      projectId,
      projectPublicId,
      projectInfo,
    } of allProjectKeysResult) {
      const existingProject = allProjectsResult.find(
        (p) => p.projectId === projectId
      )

      result.push(
        deNullify({
          projectId: /** @type {ProjectPublicId} */ (projectPublicId),
          createdAt: existingProject?.createdAt,
          updatedAt: existingProject?.updatedAt,
          name: existingProject?.name || projectInfo.name,
        })
      )
    }

    return result
  }

  /**
   * @param {import('./generated/rpc.js').Invite} invite
   * @returns {Promise<ProjectPublicId>}
   */
  async addProject({ projectKey, encryptionKeys, projectInfo }) {
    const projectPublicId = projectKeyToPublicId(projectKey)

    // 1. Check for an active project
    const activeProject = this.#activeProjects.get(projectPublicId)

    if (activeProject) {
      throw new Error(`Project with ID ${projectPublicId} already exists`)
    }

    // 2. Check if the project exists in the project keys table
    // If it does, that means the project has already been either created or added before
    const projectId = projectKeyToId(projectKey)

    const projectExists = this.#db
      .select()
      .from(projectKeysTable)
      .where(eq(projectKeysTable.projectId, projectId))
      .get()

    if (projectExists) {
      throw new Error(`Project with ID ${projectPublicId} already exists`)
    }

    // TODO: Relies on completion of https://github.com/digidem/mapeo-core-next/issues/233
    // 3. Sync auth + config cores

    // 4. Update the project keys table
    this.#saveToProjectKeysTable({
      projectId,
      projectPublicId,
      projectKeys: {
        projectKey,
        encryptionKeys,
      },
      projectInfo,
    })

    return projectPublicId
  }

  /**
   * @template {import('type-fest').Exact<import('./schema/client.js').DeviceInfoParam, T>} T
   * @param {T} deviceInfo
   */
  async setDeviceInfo(deviceInfo) {
    const values = { deviceId: this.#deviceId, deviceInfo }
    this.#db
      .insert(localDeviceInfoTable)
      .values(values)
      .onConflictDoUpdate({
        target: localDeviceInfoTable.deviceId,
        set: values,
      })
      .run()
  }

  /**
   * @returns {Promise<Partial<import('./schema/client.js').DeviceInfoParam>>}
   */
  async getDeviceInfo() {
    const row = this.#db
      .select()
      .from(localDeviceInfoTable)
      .where(eq(localDeviceInfoTable.deviceId, this.#deviceId))
      .get()
    return row ? row.deviceInfo : {}
  }
}
