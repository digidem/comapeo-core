import { randomBytes } from 'crypto'
import path from 'path'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Hypercore from 'hypercore'
import { IndexWriter } from './index-writer/index.js'
import { MapeoProject, kSetOwnDeviceInfo } from './mapeo-project.js'
import {
  localDeviceInfoTable,
  projectKeysTable,
  projectSettingsTable,
} from './schema/client.js'
import { ProjectKeys } from './generated/keys.js'
import {
  deNullify,
  getDeviceId,
  projectIdToNonce,
  projectKeyToId,
  projectKeyToPublicId,
} from './utils.js'
import { RandomAccessFilePool } from './core-manager/random-access-file-pool.js'
import { LocalPeers } from './local-peers.js'
import { InviteApi } from './invite-api.js'
import fastify from 'fastify'

import IconServerPlugin from './icon-server/fastify-plugin.js'

/** @typedef {import("@mapeo/schema").ProjectSettingsValue} ProjectValue */

const CLIENT_SQLITE_FILE_NAME = 'client.db'

// Max file descriptors that RandomAccessFile should use for hypercore storage
// and index bitfield persistence (used by MultiCoreIndexer). Android has a
// limit of 1024 per process, so choosing 768 to leave 256 descriptors free for
// other things e.g. SQLite and other parts of the app.
const MAX_FILE_DESCRIPTORS = 768
const FASTIFY_PORT = 8080

export const kRPC = Symbol('rpc')

export class MapeoManager {
  #keyManager
  #projectSettingsIndexWriter
  #db
  // Maps project public id -> project instance
  /** @type {Map<string, MapeoProject>} */
  #activeProjects
  /** @type {import('./types.js').CoreStorage} */
  #coreStorage
  #dbFolder
  #deviceId
  #rpc
  #invite
  #fastifyServer

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
    migrate(this.#db, {
      migrationsFolder: new URL('../drizzle/client', import.meta.url).pathname,
    })

    this.#rpc = new LocalPeers()
    this.#keyManager = new KeyManager(rootKey)
    this.#deviceId = getDeviceId(this.#keyManager)
    this.#projectSettingsIndexWriter = new IndexWriter({
      tables: [projectSettingsTable],
      sqlite,
    })
    this.#activeProjects = new Map()

    this.#invite = new InviteApi({
      rpc: this.#rpc,
      queries: {
        isMember: async (projectId) => {
          const projectExists = this.#db
            .select()
            .from(projectKeysTable)
            .where(eq(projectKeysTable.projectId, projectId))
            .get()

          return !!projectExists
        },
        addProject: async (invite) => {
          await this.addProject(invite)
        },
      },
    })

    this.#fastifyServer = fastify({ logger: true })

    this.#fastifyServer.decorate(
      'getProject',
      /** @param {string} projectId */
      async (projectId) => {
        return this.getProject(projectId)
      }
    )

    this.#fastifyServer.register(IconServerPlugin, {
      prefix: '/icons/',
    })

    if (typeof coreStorage === 'string') {
      const pool = new RandomAccessFilePool(MAX_FILE_DESCRIPTORS)
      // @ts-ignore
      this.#coreStorage = Hypercore.createStorage(coreStorage, { pool })
    } else {
      this.#coreStorage = coreStorage
    }
  }

  /**
   * MapeoRPC instance, used for tests
   */
  get [kRPC]() {
    return this.#rpc
  }

  /** @param {number} [port] */
  async serverListen(port) {
    await this.#fastifyServer.listen({
      port: typeof port === 'number' ? port : FASTIFY_PORT,
    })
  }

  /**
   * @param {Buffer} keysCipher
   * @param {string} projectId
   * @returns {ProjectKeys}
   */
  #decodeProjectKeysCipher(keysCipher, projectId) {
    const nonce = projectIdToNonce(projectId)
    return ProjectKeys.decode(
      this.#keyManager.decryptLocalMessage(keysCipher, nonce)
    )
  }

  /**
   * @param {string} projectId
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
   * @param {string} opts.projectId
   * @param {string} opts.projectPublicId
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
   * @returns {Promise<string>} Project public id
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

    // 6. Write device info into project
    const deviceInfo = await this.getDeviceInfo()
    if (deviceInfo.name) {
      await project[kSetOwnDeviceInfo]({ name: deviceInfo.name })
    }

    // TODO: Close the project instance instead of keeping it around
    this.#activeProjects.set(projectPublicId, project)

    // 7. Return project public id
    return projectPublicId
  }

  /**
   * @param {string} projectPublicId
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

    const { projectId } = projectKeysTableResult

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
   * @returns {Promise<Array<Pick<ProjectValue, 'name'> & { projectId: string, createdAt?: string, updatedAt?: string}>>}
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
        projectId: projectSettingsTable.docId,
        createdAt: projectSettingsTable.createdAt,
        updatedAt: projectSettingsTable.updatedAt,
        name: projectSettingsTable.name,
      })
      .from(projectSettingsTable)
      .all()

    /** @type {Array<Pick<ProjectValue, 'name'> & { projectId: string, createdAt?: string, updatedAt?: string, createdBy?: string }>} */
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
          projectId: projectPublicId,
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
   * @returns {Promise<string>}
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

    // 5. Write device info into project
    const deviceInfo = await this.getDeviceInfo()

    if (deviceInfo.name) {
      const project = await this.getProject(projectPublicId)
      await project[kSetOwnDeviceInfo]({ name: deviceInfo.name })
    }

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

    const listedProjects = await this.listProjects()

    await Promise.all(
      listedProjects.map(async ({ projectId }) => {
        const project = await this.getProject(projectId)
        await project[kSetOwnDeviceInfo](deviceInfo)
      })
    )
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

  /**
   * @returns {InviteApi}
   */
  get invite() {
    return this.#invite
  }
}
