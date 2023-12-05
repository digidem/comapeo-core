import { randomBytes } from 'crypto'
import path from 'path'
import { KeyManager } from '@mapeo/crypto'
import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import Hypercore from 'hypercore'
import { TypedEmitter } from 'tiny-typed-emitter'

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
  keyToId,
  openedNoiseSecretStream,
  projectIdToNonce,
  projectKeyToId,
  projectKeyToPublicId,
} from './utils.js'
import { RandomAccessFilePool } from './core-manager/random-access-file-pool.js'
import { LocalPeers } from './local-peers.js'
import { InviteApi } from './invite-api.js'
import { MediaServer } from './media-server.js'
import { LocalDiscovery } from './discovery/local-discovery.js'
import { Capabilities } from './capabilities.js'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { Logger } from './logger.js'

/** @typedef {import("@mapeo/schema").ProjectSettingsValue} ProjectValue */

const CLIENT_SQLITE_FILE_NAME = 'client.db'

// Max file descriptors that RandomAccessFile should use for hypercore storage
// and index bitfield persistence (used by MultiCoreIndexer). Android has a
// limit of 1024 per process, so choosing 768 to leave 256 descriptors free for
// other things e.g. SQLite and other parts of the app.
const MAX_FILE_DESCRIPTORS = 768

export const kRPC = Symbol('rpc')
export const kManagerReplicate = Symbol('replicate manager')

/**
 * @typedef {Omit<import('./local-peers.js').PeerInfo, 'protomux'>} PublicPeerInfo
 */

/**
 * @typedef {object} MapeoManagerEvents
 * @property {(peers: PublicPeerInfo[]) => void} local-peers Emitted when the list of connected peers changes (new ones added, or connection status changes)
 */

/**
 * @extends {TypedEmitter<MapeoManagerEvents>}
 */
export class MapeoManager extends TypedEmitter {
  #keyManager
  #projectSettingsIndexWriter
  #db
  // Maps project public id -> project instance
  /** @type {Map<string, MapeoProject>} */
  #activeProjects
  /** @type {import('./types.js').CoreStorage} */
  #coreStorage
  #dbFolder
  /** @type {string} */
  #projectMigrationsFolder
  #deviceId
  #localPeers
  #invite
  #mediaServer
  #localDiscovery
  #loggerBase
  #l

  /**
   * @param {Object} opts
   * @param {Buffer} opts.rootKey 16-bytes of random data that uniquely identify the device, used to derive a 32-byte master key, which is used to derive all the keypairs used for Mapeo
   * @param {string} opts.dbFolder Folder for sqlite Dbs. Folder must exist. Use ':memory:' to store everything in-memory
   * @param {string} opts.projectMigrationsFolder path for drizzle migrations folder for project database
   * @param {string} opts.clientMigrationsFolder path for drizzle migrations folder for client database
   * @param {string | import('./types.js').CoreStorage} opts.coreStorage Folder for hypercore storage or a function that returns a RandomAccessStorage instance
   * @param {{ port?: number, logger: import('fastify').FastifyServerOptions['logger'] }} [opts.mediaServerOpts]
   */
  constructor({
    rootKey,
    dbFolder,
    projectMigrationsFolder,
    clientMigrationsFolder,
    coreStorage,
    mediaServerOpts,
  }) {
    super()
    this.#keyManager = new KeyManager(rootKey)
    this.#deviceId = getDeviceId(this.#keyManager)
    const logger = (this.#loggerBase = new Logger({ deviceId: this.#deviceId }))
    this.#l = Logger.create('manager', logger)
    this.#dbFolder = dbFolder
    this.#projectMigrationsFolder = projectMigrationsFolder
    const sqlite = new Database(
      dbFolder === ':memory:'
        ? ':memory:'
        : path.join(dbFolder, CLIENT_SQLITE_FILE_NAME)
    )
    this.#db = drizzle(sqlite)
    migrate(this.#db, { migrationsFolder: clientMigrationsFolder })

    this.#localPeers = new LocalPeers({ logger })
    this.#localPeers.on('peers', (peers) => {
      this.emit('local-peers', omitPeerProtomux(peers))
    })
    this.#localPeers.on('discovery-key', (dk) => {
      if (this.#activeProjects.size === 0) {
        this.#l.log('Received dk %h but no active projects', dk)
      }
    })

    this.#projectSettingsIndexWriter = new IndexWriter({
      tables: [projectSettingsTable],
      sqlite,
      logger,
    })
    this.#activeProjects = new Map()

    this.#invite = new InviteApi({
      rpc: this.#localPeers,
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

    if (typeof coreStorage === 'string') {
      const pool = new RandomAccessFilePool(MAX_FILE_DESCRIPTORS)
      // @ts-expect-error
      this.#coreStorage = Hypercore.defaultStorage(coreStorage, { pool })
    } else {
      this.#coreStorage = coreStorage
    }

    this.#mediaServer = new MediaServer({
      logger: mediaServerOpts?.logger,
      getProject: this.getProject.bind(this),
    })

    this.#localDiscovery = new LocalDiscovery({
      identityKeypair: this.#keyManager.getIdentityKeypair(),
      logger,
    })
    this.#localDiscovery.on('connection', this.#replicate.bind(this))
  }

  /**
   * MapeoRPC instance, used for tests
   */
  get [kRPC]() {
    return this.#localPeers
  }

  get deviceId() {
    return this.#deviceId
  }

  /**
   * Create a Mapeo replication stream. This replication connects the Mapeo RPC
   * channel and allows invites. All active projects will sync automatically to
   * this replication stream. Only use for local (trusted) connections, because
   * the RPC channel key is public. To sync a specific project without
   * connecting RPC, use project[kProjectReplication].
   *
   * @param {boolean} isInitiator
   */
  [kManagerReplicate](isInitiator) {
    const noiseStream = new NoiseSecretStream(isInitiator, undefined, {
      keyPair: this.#keyManager.getIdentityKeypair(),
    })
    return this.#replicate(noiseStream)
  }

  /**
   * @param {NoiseSecretStream<any>} noiseStream
   */
  #replicate(noiseStream) {
    const replicationStream = this.#localPeers.connect(noiseStream)
    Promise.all([this.getDeviceInfo(), openedNoiseSecretStream(noiseStream)])
      .then(([{ name }, openedNoiseStream]) => {
        if (openedNoiseStream.destroyed || !name) return
        const peerId = keyToId(openedNoiseStream.remotePublicKey)
        return this.#localPeers.sendDeviceInfo(peerId, { name })
      })
      .catch((e) => {
        // Ignore error but log
        this.#l.log(
          'Failed to send device info to peer %h',
          noiseStream.remotePublicKey,
          e
        )
      })
    return replicationStream
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
    const project = this.#createProjectInstance({
      encryptionKeys,
      projectKey: projectKeypair.publicKey,
      projectSecretKey: projectKeypair.secretKey,
    })

    project.once('close', () => {
      this.#activeProjects.delete(projectPublicId)
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

    this.#l.log(
      'created project %h, public id: %S',
      projectKeypair.publicKey,
      projectPublicId
    )

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

    const project = this.#createProjectInstance(projectKeys)

    project.once('close', () => {
      this.#activeProjects.delete(projectPublicId)
    })

    // 3. Keep track of project instance as we know it's a properly existing project
    this.#activeProjects.set(projectPublicId, project)

    return project
  }

  /** @param {ProjectKeys} projectKeys */
  #createProjectInstance(projectKeys) {
    const projectId = keyToId(projectKeys.projectKey)
    return new MapeoProject({
      ...this.#projectStorage(projectId),
      ...projectKeys,
      projectMigrationsFolder: this.#projectMigrationsFolder,
      keyManager: this.#keyManager,
      sharedDb: this.#db,
      sharedIndexWriter: this.#projectSettingsIndexWriter,
      localPeers: this.#localPeers,
      logger: this.#loggerBase,
      getMediaBaseUrl: this.#mediaServer.getMediaAddress.bind(
        this.#mediaServer
      ),
    })
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
   * Add a project to this device. After adding a project the client should
   * await `project.$waitForInitialSync()` to ensure that the device has
   * downloaded their proof of project membership and the project config.
   *
   * @param {import('./generated/rpc.js').Invite} invite
   * @param {{ waitForSync?: boolean }} [opts] For internal use in tests, set opts.waitForSync = false to not wait for sync during addProject()
   * @returns {Promise<string>}
   */
  async addProject(
    { projectKey, encryptionKeys, projectInfo },
    { waitForSync = true } = {}
  ) {
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

    // No awaits here - need to update table in same tick as the projectExists check

    // 3. Update the project keys table
    this.#saveToProjectKeysTable({
      projectId,
      projectPublicId,
      projectKeys: {
        projectKey,
        encryptionKeys,
      },
      projectInfo,
    })

    // Any errors from here we need to remove project from db because it has not
    // been fully added and synced
    try {
      // 4. Write device info into project
      const project = await this.getProject(projectPublicId)

      try {
        const deviceInfo = await this.getDeviceInfo()
        if (deviceInfo.name) {
          await project[kSetOwnDeviceInfo]({ name: deviceInfo.name })
        }
      } catch (e) {
        // Can ignore an error trying to write device info
        this.#l.log(
          'ERROR: failed to write project %h deviceInfo %o',
          projectKey,
          e
        )
      }

      // 5. Wait for initial project sync
      if (waitForSync) {
        await this.#waitForInitialSync(project)
      }

      this.#activeProjects.set(projectPublicId, project)
    } catch (e) {
      this.#l.log('ERROR: could not add project', e)
      this.#db
        .delete(projectKeysTable)
        .where(eq(projectKeysTable.projectId, projectId))
        .run()
      throw e
    }
    this.#l.log('Added project %h, public ID: %S', projectKey, projectPublicId)
    return projectPublicId
  }

  /**
   * Sync initial data: the `auth` cores which contain the capability messages,
   * and the `config` cores which contain the project name & custom config (if
   * it exists). The API consumer should await this after `client.addProject()`
   * to ensure that the device is fully added to the project.
   *
   * @param {MapeoProject} project
   * @param {object} [opts]
   * @param {number} [opts.timeoutMs=5000] Timeout in milliseconds for max time
   * to wait between sync status updates before giving up. As long as syncing is
   * happening, this will never timeout, but if more than timeoutMs passes
   * without any sync activity, then this will resolve `false` e.g. data has not
   * synced
   * @returns {Promise<boolean>}
   */
  async #waitForInitialSync(project, { timeoutMs = 5000 } = {}) {
    const [capability, projectSettings] = await Promise.all([
      project.$getOwnCapabilities(),
      project.$getProjectSettings(),
    ])
    const {
      auth: { localState: authState },
      config: { localState: configState },
    } = project.$sync.getState()
    const isCapabilitySynced = capability !== Capabilities.NO_ROLE_CAPABILITIES
    const isProjectSettingsSynced =
      projectSettings !== MapeoProject.EMPTY_PROJECT_SETTINGS
    // Assumes every project that someone is invited to has at least one record
    // in the auth store - the capability record for the invited device
    const isAuthSynced = authState.want === 0 && authState.have > 0
    // Assumes every project that someone is invited to has at least one record
    // in the config store - defining the name of the project.
    // TODO: Enforce adding a project name in the invite method
    const isConfigSynced = configState.want === 0 && configState.have > 0
    if (
      isCapabilitySynced &&
      isProjectSettingsSynced &&
      isAuthSynced &&
      isConfigSynced
    ) {
      return true
    }
    return new Promise((resolve, reject) => {
      /** @param {import('./sync/sync-state.js').State} syncState */
      const onSyncState = (syncState) => {
        clearTimeout(timeoutId)
        if (syncState.auth.dataToSync || syncState.config.dataToSync) {
          timeoutId = setTimeout(onTimeout, timeoutMs)
          return
        }
        project.$sync.off('sync-state', onSyncState)
        resolve(this.#waitForInitialSync(project, { timeoutMs }))
      }
      const onTimeout = () => {
        project.$sync.off('sync-state', onSyncState)
        reject(new Error('Sync timeout'))
      }
      let timeoutId = setTimeout(onTimeout, timeoutMs)
      project.$sync.on('sync-state', onSyncState)
    })
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
    this.#l.log('set device info %o', deviceInfo)
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

  /**
   * @param {import('./media-server.js').StartOpts} [opts]
   */
  async startMediaServer(opts) {
    await this.#mediaServer.start(opts)
  }

  async stopMediaServer() {
    await this.#mediaServer.stop()
  }

  async startLocalPeerDiscovery() {
    return this.#localDiscovery.start()
  }

  /** @type {LocalDiscovery['stop']} */
  async stopLocalPeerDiscovery(opts) {
    return this.#localDiscovery.stop(opts)
  }

  /**
   * @returns {Promise<PublicPeerInfo[]>}
   */
  async listLocalPeers() {
    return omitPeerProtomux(this.#localPeers.peers)
  }
}

// We use the `protomux` property of connected peers internally, but we don't
// expose it to the API. I have avoided using a private symbol for this for fear
// that we could accidentally keep references around of protomux instances,
// which could cause a memory leak (it shouldn't, but just to eliminate the
// possibility)

/**
 * Remove the protomux property of connected peers
 *
 * @param {import('./local-peers.js').PeerInfo[]} peers
 * @returns {PublicPeerInfo[]}
 */
function omitPeerProtomux(peers) {
  return peers.map(
    ({
      // @ts-ignore
      // eslint-disable-next-line no-unused-vars
      protomux,
      ...publicPeerInfo
    }) => {
      return publicPeerInfo
    }
  )
}
