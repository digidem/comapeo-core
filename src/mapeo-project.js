import path from 'path'
import Database from 'better-sqlite3'
import { decodeBlockPrefix, decode, parseVersionId } from '@comapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql, count, eq } from 'drizzle-orm'

import { NAMESPACES, NAMESPACE_SCHEMAS } from './constants.js'
import { CoreManager } from './core-manager/index.js'
import { DataStore } from './datastore/index.js'
import {
  DataType,
  kCreateOrUpdateWithDocId,
  kCreateWithDocId,
} from './datatype/index.js'
import { BlobStore } from './blob-store/index.js'
import { BlobApi } from './blob-api.js'
import { IndexWriter } from './index-writer/index.js'
import { projectSettingsTable } from './schema/client.js'
import { DataExporter } from './data-exporter.js'
import {
  coreOwnershipTable,
  deviceInfoTable,
  fieldTable,
  observationTable,
  trackTable,
  presetTable,
  roleTable,
  iconTable,
  translationTable,
  remoteDetectionAlertTable,
} from './schema/project.js'
import {
  CoreOwnership,
  getWinner,
  mapAndValidateCoreOwnership,
} from './core-ownership.js'
import { BLOCKED_ROLE_ID, Roles, LEFT_ROLE_ID } from './roles.js'
import {
  getDeviceId,
  noop,
  projectKeyToId,
  projectKeyToPublicId,
  valueOf,
} from './utils.js'
import { migrate } from './lib/drizzle-helpers.js'
import { omit } from './lib/omit.js'
import { InviteLinksApiForProject } from './invite/invite-links-api.js'
import { MemberApi } from './member-api.js'
import {
  SyncApi,
  kHandleDiscoveryKey,
  kWaitForInitialSyncWithPeer,
} from './sync/sync-api.js'
import { Logger } from './logger.js'
import { IconApi } from './icon-api.js'
import { importCategories } from './import-categories.js'
import TranslationApi from './translation-api.js'
import {
  CategoryFileNotFoundError,
  ensureKnownError,
  getErrorCode,
  NotFoundError,
  ExhaustivenessError,
  nullIfNotFound,
  MultipleCategoryImportsError,
  UnexpectedDocSchemaError,
} from './errors.js'
import { WebSocket } from 'ws'

import ensureError from 'ensure-error'
import ReadyResource from 'ready-resource'

/** @import { MapShareExtension } from './generated/extensions.js' */
/** @import { ProjectSettingsValue, Observation, Track } from '@comapeo/schema' */
/** @import { CoreStorage, BlobFilter, BlobStoreEntriesStream, KeyPair, Namespace, ReplicationStream, GenericBlobFilter, MapeoValueMap, MapeoDocMap } from './types.js' */
/** @import {Role} from './roles.js' */
/** @import { TypedEmitter } from 'tiny-typed-emitter' */

/** @typedef {Omit<ProjectSettingsValue, 'schemaName'>} EditableProjectSettings */
/** @typedef {ProjectSettingsValue['configMetadata']} ConfigMetadata */
/**
 * @typedef {Object} Stats
 * @property {string[]} columns
 * @property {Array<[string, number]>} values
 */
/**
 * @typedef {Object} ProjectStats
 * @property {number} timezoneOffset
 * @property {Stats} observations
 * @property {Stats} tracks
 * @property {Stats} members
 */

const CORESTORE_STORAGE_FOLDER_NAME = 'corestore'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
export const kCoreManager = Symbol('coreManager')
export const kCoreOwnership = Symbol('coreOwnership')
export const kSetOwnDeviceInfo = Symbol('kSetOwnDeviceInfo')
export const kBlobStore = Symbol('blobStore')
export const kProjectReplicate = Symbol('replicate project')
export const kDataTypes = Symbol('dataTypes')
export const kProjectLeave = Symbol('leave project')
export const kClearData = Symbol('clear project data')
export const kSetIsArchiveDevice = Symbol('set isArchiveDevice')
export const kIsArchiveDevice = Symbol('isArchiveDevice (temp - test only)')
const EMPTY_PROJECT_SETTINGS = Object.freeze({ sendStats: false })

/**
 * @typedef RoleChangeEvent
 * @property {Role & {reason: string | undefined}} role
 */

/**
 * @typedef {object} ProjectEvents
 * @property {() => void} close Project resources have been cleared up
 * @property {(changeEvent: RoleChangeEvent) => void} own-role-change
 */

/**
 * @type {ReadyResource & TypedEmitter<ProjectEvents>}
 */
export class MapeoProject extends ReadyResource {
  #projectKey
  #deviceId
  #getSwarmPublicKey
  #identityKeypair
  #coreManager
  #indexWriter
  #dataStores
  #dataTypes
  #blobStore
  #coreOwnership
  #roles
  #sqlite
  #db
  #memberApi
  #iconApi
  #syncApi
  /** @type {TranslationApi} */
  #translationApi
  /** @type {DataExporter} */
  #dataExporter
  #l
  /** @type {Boolean} this avoids loading multiple configs in parallel */
  #importingCategories

  static EMPTY_PROJECT_SETTINGS = EMPTY_PROJECT_SETTINGS
  #getFallbackProjectInfo

  /**
   * @param {Object} opts
   * @param {string} opts.dbPath Path to store project sqlite db. Use `:memory:` for memory storage
   * @param {string} opts.projectMigrationsFolder path for drizzle migration folder for project
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {() => Buffer} opts.getSwarmPublicKey Get the current 32 byte public key used for hyperswarm connections
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys Encryption keys for each namespace
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.sharedDb
   * @param {IndexWriter} opts.sharedIndexWriter
   * @param {CoreStorage} opts.coreStorage Folder to store all hypercore data
   * @param {(mediaType: 'blobs' | 'icons') => Promise<string>} opts.getMediaBaseUrl
   * @param {(url: string) => WebSocket} [opts.makeWebsocket]
   * @param {import('./local-peers.js').LocalPeers} opts.localPeers
   * @param {import('./invite/invite-links-api.js').InviteLinksApi} opts.inviteLinks
   * @param {boolean} opts.isArchiveDevice Whether this device is an archive device
   * @param {() => import('./schema/client.js').ProjectInfo | undefined} opts.getFallbackProjectInfo
   * @param {(deviceId: string) => Promise<boolean>} opts.markInternetPeerAsTrusted
   * @param {(deviceId: string) => Promise<void>} opts.disconnectFromPeer
   * @param {Logger} [opts.logger]
   *
   */
  constructor({
    dbPath,
    projectMigrationsFolder,
    sharedDb,
    sharedIndexWriter,
    coreStorage,
    keyManager,
    projectKey,
    projectSecretKey,
    encryptionKeys,
    getMediaBaseUrl,
    makeWebsocket = (url) => new WebSocket(url),
    localPeers,
    inviteLinks,
    logger,
    isArchiveDevice,
    getFallbackProjectInfo,
    markInternetPeerAsTrusted,
    disconnectFromPeer,
    getSwarmPublicKey,
  }) {
    super()

    this.#l = Logger.create('project', logger)
    this.#deviceId = getDeviceId(keyManager)
    this.#getSwarmPublicKey = getSwarmPublicKey
    this.#projectKey = projectKey
    this.#importingCategories = false
    this.#getFallbackProjectInfo = getFallbackProjectInfo

    const getReplicationStream = this[kProjectReplicate].bind(this, true)

    ///////// 1. Setup database

    this.#sqlite = new Database(dbPath)
    this.#sqlite.pragma('journal_mode=WAL')
    const db = drizzle(this.#sqlite)
    this.#db = db
    const migrationResult = migrate(db, {
      migrationsFolder: projectMigrationsFolder,
    })
    let reindex
    switch (migrationResult) {
      case 'initialized database':
      case 'no migration':
        reindex = false
        break
      case 'migrated':
        reindex = true
        break
      default:
        throw new ExhaustivenessError({ value: migrationResult })
    }

    const indexedTables = [
      observationTable,
      trackTable,
      presetTable,
      fieldTable,
      coreOwnershipTable,
      roleTable,
      deviceInfoTable,
      iconTable,
      translationTable,
      remoteDetectionAlertTable,
    ]

    ///////// 2. Wipe data if we need to re-index

    if (reindex) {
      for (const table of indexedTables) db.delete(table).run()

      sharedDb
        .delete(projectSettingsTable)
        .where(eq(projectSettingsTable.docId, this.#projectId))
        .run()
    }

    ///////// 3. Setup random-access-storage functions

    /** @type {ConstructorParameters<typeof CoreManager>[0]['storage']} */
    const coreManagerStorage = (name) =>
      coreStorage(path.join(CORESTORE_STORAGE_FOLDER_NAME, name))

    /** @type {ConstructorParameters<typeof DataStore>[0]['storage']} */
    const indexerStorage = (name) =>
      coreStorage(path.join(INDEXER_STORAGE_FOLDER_NAME, name))

    ///////// 4. Create instances

    this.#coreManager = new CoreManager({
      projectSecretKey,
      encryptionKeys,
      projectKey,
      keyManager,
      storage: coreManagerStorage,
      db,
      logger: this.#l,
    })

    this.#indexWriter = new IndexWriter({
      tables: indexedTables,
      sqlite: this.#sqlite,
      getWinner,
      mapDoc: (doc, version) => {
        switch (doc.schemaName) {
          case 'coreOwnership':
            return mapAndValidateCoreOwnership(doc, version)
          default:
            return doc
        }
      },
      logger: this.#l,
    })

    this.#dataStores = {
      auth: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'auth',
        batch: (entries) => this.#indexWriter.batch(entries),
        storage: indexerStorage,
        reindex,
      }),
      config: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'config',
        batch: (entries) =>
          this.#handleConfigEntries(entries, {
            projectIndexWriter: this.#indexWriter,
            sharedIndexWriter,
          }),
        storage: indexerStorage,
        reindex,
      }),
      data: new DataStore({
        coreManager: this.#coreManager,
        namespace: 'data',
        batch: (entries) => this.#indexWriter.batch(entries),
        storage: indexerStorage,
        reindex,
      }),
    }

    /** @type {typeof TranslationApi.prototype.get} */
    const getTranslations = (...args) => this.$translation.get(...args)
    /** @type {(versionId: string) => Promise<string | undefined>} */
    const getDeviceIdForVersionId = async (...args) => {
      try {
        return this.$originalVersionIdToDeviceId(...args)
      } catch (e) {
        if (e instanceof NotFoundError) return undefined // core/ownership not synced yet
        throw e
      }
    }

    this.#dataTypes = {
      observation: new DataType({
        dataStore: this.#dataStores.data,
        table: observationTable,
        db,
        getDeviceIdForVersionId,
      }),
      track: new DataType({
        dataStore: this.#dataStores.data,
        table: trackTable,
        db,
        getDeviceIdForVersionId,
      }),
      remoteDetectionAlert: new DataType({
        dataStore: this.#dataStores.data,
        table: remoteDetectionAlertTable,
        db,
        getDeviceIdForVersionId,
      }),
      preset: new DataType({
        dataStore: this.#dataStores.config,
        table: presetTable,
        db,
        getTranslations,
        getDeviceIdForVersionId,
      }),
      field: new DataType({
        dataStore: this.#dataStores.config,
        table: fieldTable,
        db,
        getTranslations,
        getDeviceIdForVersionId,
      }),
      projectSettings: new DataType({
        dataStore: this.#dataStores.config,
        table: projectSettingsTable,
        db: sharedDb,
        getDeviceIdForVersionId,
      }),
      coreOwnership: new DataType({
        dataStore: this.#dataStores.auth,
        table: coreOwnershipTable,
        db,
      }),
      role: new DataType({
        dataStore: this.#dataStores.auth,
        table: roleTable,
        db,
      }),
      deviceInfo: new DataType({
        dataStore: this.#dataStores.config,
        table: deviceInfoTable,
        db,
      }),
      icon: new DataType({
        dataStore: this.#dataStores.config,
        table: iconTable,
        db,
        getDeviceIdForVersionId,
      }),
      translation: new DataType({
        dataStore: this.#dataStores.config,
        table: translationTable,
        db,
        getDeviceIdForVersionId,
      }),
    }
    this.#identityKeypair = keyManager.getIdentityKeypair()
    const coreKeypairs = getCoreKeypairs({
      projectKey,
      projectSecretKey,
      keyManager,
    })
    this.#coreOwnership = new CoreOwnership({
      dataType: this.#dataTypes.coreOwnership,
      coreKeypairs,
      identityKeypair: this.#identityKeypair,
    })
    this.#roles = new Roles({
      dataType: this.#dataTypes.role,
      coreOwnership: this.#coreOwnership,
      coreManager: this.#coreManager,
      projectKey: projectKey,
      deviceKey: this.#identityKeypair.publicKey,
    })

    this.#memberApi = new MemberApi({
      deviceId: this.#deviceId,
      roles: this.#roles,
      encryptionKeys,
      projectKey,
      rpc: localPeers,
      inviteLinks: new InviteLinksApiForProject(
        this.#projectPublicId,
        inviteLinks
      ),
      getSwarmPublicKey: this.#getSwarmPublicKey,
      makeWebsocket,
      getReplicationStream,
      waitForInitialSyncWithPeer: (deviceId, abortSignal) =>
        this.$sync[kWaitForInitialSyncWithPeer](deviceId, abortSignal),
      getProjectSettings: () => this.$getProjectSettings(),
      getDeviceInfo: async (deviceId) => {
        try {
          return await this.#dataTypes.deviceInfo.getByDocId(deviceId)
        } catch (e) {
          const configCoreId = await this.#coreOwnership.getCoreId(
            deviceId,
            'config'
          )
          return this.#dataTypes.deviceInfo.getByDocId(configCoreId)
        }
      },
      setDeviceInfo: async (deviceId, deviceInfo) => {
        await this.#dataTypes.deviceInfo[kCreateOrUpdateWithDocId](
          deviceId,
          deviceInfo
        )
      },
      markInternetPeerAsTrusted,
      disconnectFromPeer,
      logger: this.#l,
    })

    this.#blobStore = new BlobStore({
      coreManager: this.#coreManager,
      isArchiveDevice: isArchiveDevice,
      logger: this.#l,
    })

    this.#blobStore.on('error', (e) => {
      // Ignore hypercore inflight request cancellation
      if (ensureError(e).message.includes('REQUEST_CANCELLED')) return
      // TODO: Handle this error in some way - this error will come from an
      // unexpected error with background blob downloads
      console.error('BlobStore error', e)
    })

    this.$blobs = new BlobApi({
      blobStore: this.#blobStore,
      getMediaBaseUrl: async () => {
        let base = await getMediaBaseUrl('blobs')
        if (!base.endsWith('/')) {
          base += '/'
        }
        return base + this.#projectPublicId
      },
    })

    this.#iconApi = new IconApi({
      iconDataStore: this.#dataStores.config,
      iconDataType: this.#dataTypes.icon,
      getMediaBaseUrl: async () => {
        let base = await getMediaBaseUrl('icons')
        if (!base.endsWith('/')) {
          base += '/'
        }
        return base + this.#projectPublicId
      },
    })

    this.#syncApi = new SyncApi({
      coreManager: this.#coreManager,
      coreOwnership: this.#coreOwnership,
      roles: this.#roles,
      blobStore: this.#blobStore,
      logger: this.#l,
      makeWebsocket,
      getServerWebsocketUrls: async () => {
        const members = await this.#memberApi.getMany()
        /** @type {string[]} */
        const serverWebsocketUrls = []
        for (const member of members) {
          if (
            member.deviceType === 'selfHostedServer' &&
            member.selfHostedServerDetails
          ) {
            const { baseUrl } = member.selfHostedServerDetails
            serverWebsocketUrls.push(
              baseUrlToWS(baseUrl, this.#projectPublicId)
            )
          }
        }
        return serverWebsocketUrls
      },
      getReplicationStream,
    })

    this.#translationApi = new TranslationApi({
      dataType: this.#dataTypes.translation,
    })

    this.#dataExporter = new DataExporter({
      observations: this.#dataTypes.observation,
      tracks: this.#dataTypes.track,
      presets: this.#dataTypes.preset,
      deviceInfo: this.#dataTypes.deviceInfo,
      getProjectName: this.#getProjectName.bind(this),
      blobStore: this.#blobStore,
      logger: this.#l,
    })

    ///////// 5. Replicate local peers automatically

    // Replicate already connected local peers
    for (const peer of localPeers.peers) {
      if (peer.status !== 'connected') continue
      this.#coreManager.creatorCore.replicate(peer.protomux)
    }

    /**
     * @type {import('./local-peers.js').LocalPeersEvents['peer-add']}
     */
    const onPeerAdd = (peer) => {
      this.#coreManager.creatorCore.replicate(peer.protomux)
    }

    /**
     * @type {import('./local-peers.js').LocalPeersEvents['discovery-key']}
     */
    const onDiscoverykey = (discoveryKey, stream) => {
      this.#syncApi[kHandleDiscoveryKey](discoveryKey, stream)
    }

    // When a new peer is found, try to replicate (if it is not a member of the
    // project it will fail the role check and be ignored)
    localPeers.on('peer-add', onPeerAdd)

    // This happens whenever a peer replicates a core to the stream. SyncApi
    // handles replicating this core if we also have it, or requesting the key
    // for the core.
    localPeers.on('discovery-key', onDiscoverykey)

    this.#roles.on('update', (roleDocIds) => {
      for (const roleDocId of roleDocIds) {
        // Ignore docs not about ourselves
        if (roleDocId !== this.#deviceId) continue
        this.#handleRoleChange().catch((e) => {
          this.#l.log(`Error: Could not handle role change`, ensureError(e))
        })
      }
    })

    this.once('close', () => {
      localPeers.off('peer-add', onPeerAdd)
      localPeers.off('discovery-key', onDiscoverykey)
    })

    this.#l.log('Created project instance %h, %s', projectKey, isArchiveDevice)

    // Not necessary, because coreManager and blobStore "auto-open", but leaving
    // this here defensively in case we add additional resources to _open() in
    // the future
    this.ready().catch(noop)
  }

  /**
   * CoreManager instance, used for tests
   */
  get [kCoreManager]() {
    return this.#coreManager
  }

  /**
   * CoreOwnership instance, used for tests
   */
  get [kCoreOwnership]() {
    return this.#coreOwnership
  }

  /**
   * DataTypes object mappings, used for tests
   */
  get [kDataTypes]() {
    return this.#dataTypes
  }

  get [kBlobStore]() {
    return this.#blobStore
  }

  get deviceId() {
    return this.#deviceId
  }

  get #projectId() {
    return projectKeyToId(this.#projectKey)
  }

  get #projectPublicId() {
    return projectKeyToPublicId(this.#projectKey)
  }

  /**
   * Resolves when hypercores have all loaded
   * @returns {Promise<void>}
   */
  async _open() {
    await this.#coreManager.ready()
    await this.#blobStore.ready()
  }

  /**
   * Clear up resources via ready-resource
   */
  async _close() {
    this.#l.log('closing project %h', this.#projectId)
    await this.#memberApi.close()
    const dataStorePromises = []
    for (const dataStore of Object.values(this.#dataStores)) {
      dataStorePromises.push(dataStore.close())
    }
    await Promise.all(dataStorePromises)
    await this.#blobStore.close()
    await this.#coreManager.close()

    this.#sqlite.close()

    this.emit('close')
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

        if (schemaName === 'projectSettings') {
          projectSettingsEntries.push(entry)
        } else if (schemaName === 'translation') {
          const doc = decode(entry.block, {
            coreDiscoveryKey: entry.key,
            index: entry.index,
          })

          if (doc.schemaName !== 'translation') {
            throw new UnexpectedDocSchemaError({
              gotSchema: doc.schemaName,
              expectedSchema: 'translation',
            })
          }

          this.#translationApi.index(doc)
          otherEntries.push(entry)
        } else {
          otherEntries.push(entry)
        }
      } catch {
        // Ignore errors thrown by values that can't be decoded for now
      }
    }
    // TODO: Note that docs indexed to the shared index writer (project
    // settings) are not currently returned here, so it is not possible to
    // subscribe to updates for projectSettings
    const [indexed] = await Promise.all([
      projectIndexWriter.batch(otherEntries),
      sharedIndexWriter.batch(projectSettingsEntries),
    ])
    return indexed
  }

  get observation() {
    return this.#dataTypes.observation
  }
  get track() {
    return this.#dataTypes.track
  }
  get preset() {
    return this.#dataTypes.preset
  }
  get field() {
    return this.#dataTypes.field
  }

  get remoteDetectionAlert() {
    return this.#dataTypes.remoteDetectionAlert
  }

  get $member() {
    return this.#memberApi
  }

  get $sync() {
    return this.#syncApi
  }

  get $translation() {
    return this.#translationApi
  }

  /**
   * @param {Partial<EditableProjectSettings>} settings
   * @returns {Promise<EditableProjectSettings>}
   */
  async $setProjectSettings(settings) {
    const { projectSettings } = this.#dataTypes

    const existing = await projectSettings
      .getByDocId(this.#projectId)
      .catch(nullIfNotFound)

    if (existing) {
      return extractEditableProjectSettings(
        await projectSettings.update([existing.versionId, ...existing.forks], {
          ...valueOf(existing),
          ...settings,
        })
      )
    }

    return extractEditableProjectSettings(
      await projectSettings[kCreateWithDocId](this.#projectId, {
        ...settings,
        schemaName: 'projectSettings',
        sendStats: settings.sendStats ?? false,
      })
    )
  }

  /**
   * @returns {Promise<EditableProjectSettings>}
   */
  async $getProjectSettings() {
    try {
      return extractEditableProjectSettings(
        await this.#dataTypes.projectSettings.getByDocId(this.#projectId)
      )
    } catch {
      // if (e instanceof Error && e.name !== 'NotFoundError') throw e
      // If the project has not completed an initial sync, project settings will
      // not be available, so use fallback project info which is set from the
      // invite that was used to join the project.
      const fallbackInfo = this.#getFallbackProjectInfo()
      return fallbackInfo || EMPTY_PROJECT_SETTINGS
    }
  }

  /**
   * @returns {Promise<boolean>}
   */
  async $hasSyncedProjectSettings() {
    try {
      // Should error if we haven't synced before
      await this.#dataTypes.projectSettings.getByDocId(this.#projectId)
      return true
    } catch {
      return false
    }
  }

  /**
   * @returns {Promise<undefined | string>}
   */
  async #getProjectName() {
    return (await this.$getProjectSettings()).name
  }

  /**
   * @returns {Promise<Role & {reason: string | undefined}>}
   */
  async $getOwnRole() {
    const reason = await this.#roles.getRoleReason(this.#deviceId)
    const role = await this.#roles.getRole(this.#deviceId)
    return { ...role, reason }
  }

  async #handleRoleChange() {
    const role = await this.$getOwnRole()
    this.emit('own-role-change', { role })
  }

  /**
   * @deprecated
   * @param {string} originalVersionId The `originalVersionId` from a document.
   * @returns {Promise<string>} The device ID for this creator.
   * @throws When device ID cannot be found.
   */
  async $originalVersionIdToDeviceId(originalVersionId) {
    const { coreDiscoveryKey } = parseVersionId(originalVersionId)
    const coreId = this.#coreManager
      .getCoreByDiscoveryKey(coreDiscoveryKey)
      ?.key.toString('hex')
    if (!coreId) throw new NotFoundError()
    return this.#coreOwnership.getOwner(coreId)
  }

  /**
   * Replicate a project to a @hyperswarm/secret-stream. Invites will not
   * function because the RPC channel is not connected for project replication,
   * and only this project will replicate.
   *
   * @param {(
   *   boolean |
   *   import('stream').Duplex |
   *   import('streamx').Duplex
   * )} isInitiatorOrStream
   * @returns {ReplicationStream}
   */
  [kProjectReplicate](isInitiatorOrStream) {
    const replicationStream = this.#coreManager.creatorCore.replicate(
      isInitiatorOrStream,
      /**
       * Hypercore types need updating.
       * @type {any}
       */ ({
        keyPair: this.#identityKeypair,
        /** @param {Buffer} discoveryKey */
        ondiscoverykey: async (discoveryKey) => {
          const protomux =
            /** @type {import('protomux')<import('@hyperswarm/secret-stream')>} */ (
              replicationStream.noiseStream.userData
            )
          this.#syncApi[kHandleDiscoveryKey](discoveryKey, protomux)
        },
      })
    )
    return replicationStream
  }

  /**
   * @param {Pick<import('@comapeo/schema').DeviceInfoValue, 'name' | 'deviceType' | 'selfHostedServerDetails'>} value
   */
  async [kSetOwnDeviceInfo](value) {
    const { deviceInfo } = this.#dataTypes

    const doc = {
      name: value.name,
      deviceType: value.deviceType,
      selfHostedServerDetails: value.selfHostedServerDetails,
      schemaName: /** @type {const} */ ('deviceInfo'),
    }

    // TODO: Remove configCore once we know everyone has deviceId
    const configCoreId = this.#coreManager
      .getWriterCore('config')
      .key.toString('hex')

    const docIds = [this.deviceId, configCoreId]

    for (const docId of docIds) {
      await deviceInfo[kCreateOrUpdateWithDocId](docId, doc)
    }
  }

  /** @param {boolean} isArchiveDevice */
  async [kSetIsArchiveDevice](isArchiveDevice) {
    this.#blobStore.setIsArchiveDevice(isArchiveDevice)
  }

  /** @returns {boolean} */
  get [kIsArchiveDevice]() {
    return this.#blobStore.isArchiveDevice
  }

  /**
   * @returns {import('./icon-api.js').IconApi}
   */
  get $icons() {
    return this.#iconApi
  }

  /**
   * @returns {ProjectStats}
   */
  $getStats() {
    // Get timestamp for 3 months ago
    // Find members with createdAt > timestamp
    // Bucket by week
    // Same for obs, tracks
    const observations = countWeeks(this.#db, observationTable)
    const tracks = countWeeks(this.#db, trackTable)
    const members = countWeeks(this.#db, roleTable)

    const stats = {
      timezoneOffset: new Date().getTimezoneOffset(),
      observations,
      tracks,
      members,
    }

    return stats
  }

  /**
   * Export observations and/or tracks as a GeoJSON file
   * @param {string} exportFolder Path to save the file. The file name is auto-generated
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {string} [options.lang]
   * @returns {Promise<string>} The full path that the file was exported at
   */
  async exportGeoJSONFile(
    exportFolder,
    { observations = true, tracks = true, lang } = {}
  ) {
    return this.#dataExporter.exportGeoJSONFile(exportFolder, {
      observations,
      tracks,
      lang,
    })
  }

  /**
   * Export observations, tracks, and/or attachments as a zip file.
   * @param {string} exportFolder Path to save the file. The file name is auto-generated
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {boolean} [options.attachments=true] Whether all attachments for observations should be exported
   * @param {string} [options.lang]
   * @returns {Promise<string>} The full path that the file was exported at
   */
  async exportZipFile(
    exportFolder,
    { observations = true, tracks = true, attachments = true, lang } = {}
  ) {
    return this.#dataExporter.exportZipFile(exportFolder, {
      observations,
      tracks,
      attachments,
      lang,
    })
  }

  async [kProjectLeave]() {
    const ownRole = await this.$getOwnRole()

    if (ownRole.roleId !== BLOCKED_ROLE_ID) {
      await this.#roles.assignRole(this.#deviceId, LEFT_ROLE_ID)
    }

    await this[kClearData]()
  }

  /**
   * Clear synced data, but keep auth data and own data
   * @returns {Promise<void>}
   */
  async [kClearData]() {
    const namespacesWithoutAuth =
      /** @satisfies {Exclude<Namespace, 'auth'>[]} */ ([
        'config',
        'data',
        'blob',
        'blobIndex',
      ])
    const dataStoresToUnlink = Object.values(this.#dataStores).filter(
      (dataStore) => dataStore.namespace !== 'auth'
    )

    await Promise.all(dataStoresToUnlink.map((ds) => ds.close()))

    await Promise.all(
      namespacesWithoutAuth.flatMap((namespace) => [
        this.#coreManager.getWriterCore(namespace).core.close(),
        this.#coreManager.deleteOthersData(namespace),
      ])
    )

    await Promise.all(dataStoresToUnlink.map((ds) => ds.unlink()))

    /** @type {Set<string>} */
    const authSchemas = new Set(NAMESPACE_SCHEMAS.auth)
    for (const schemaName of this.#indexWriter.schemas) {
      const isAuthSchema = authSchemas.has(schemaName)
      if (!isAuthSchema) this.#indexWriter.deleteSchema(schemaName)
    }
  }

  /**
   * @deprecated
   * @param {object} opts
   * @param {string} opts.configPath
   * @returns {Promise<Error[]>}
   */
  async importConfig({ configPath }) {
    try {
      await this.$importCategories({ filePath: configPath })
      return []
    } catch (e) {
      return [ensureError(e)]
    }
  }

  /**
   * @param {object} opts
   * @param {string} opts.filePath
   * @returns {Promise<void>}
   */
  async $importCategories({ filePath }) {
    if (this.#importingCategories) {
      throw new MultipleCategoryImportsError()
    }
    this.#importingCategories = true

    try {
      await importCategories(this, { filePath, logger: this.#l })
    } catch (e) {
      if (getErrorCode(e) === 'ENOENT') {
        throw new CategoryFileNotFoundError({ filePath })
      }
      this.#l.log('ERROR: could not load config', e)
      throw ensureKnownError(e)
    } finally {
      this.#importingCategories = false
    }
  }
}

/**
 * @param {import("@comapeo/schema").ProjectSettings & { forks: string[] }} projectDoc
 * @returns {EditableProjectSettings}
 */
function extractEditableProjectSettings(projectDoc) {
  return omit(valueOf(projectDoc), ['schemaName'])
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
 * @returns {Record<Namespace, KeyPair>}
 */
function getCoreKeypairs({ projectKey, projectSecretKey, keyManager }) {
  const keypairs = /** @type {Record<Namespace, KeyPair>} */ ({})

  for (const namespace of NAMESPACES) {
    keypairs[namespace] =
      namespace === 'auth' && projectSecretKey
        ? { publicKey: projectKey, secretKey: projectSecretKey }
        : keyManager.getHypercoreKeypair(namespace, projectKey)
  }

  return keypairs
}

/**
 * @param {string} baseUrl
 * @param {string} projectPublicId
 * @returns {string}
 */
export function baseUrlToWS(baseUrl, projectPublicId) {
  const wsUrl = new URL(`/sync/${projectPublicId}`, baseUrl)
  wsUrl.protocol = wsUrl.protocol === 'http:' ? 'ws:' : 'wss:'

  return wsUrl.href
}

/**
 * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} db
 * @param {import('./datatype/index.js').MapeoDocTables} table
 * @returns {Stats}
 */
function countWeeks(db, table) {
  /** @type {Array<[string, number]>}*/
  const values = /** @type {Array<[string, number]>}*/ (
    db
      .select({
        week: sql`strftime('%Y-%W', date(${table.createdAt}, 'localtime'))`.as(
          'week'
        ),
        count: count().as('count'),
      })
      .from(table)
      .where(
        sql`date(${table.createdAt}, 'localtime') >= date('now', '-6 months', 'weekday 0')`
      )
      .groupBy(sql`week`)
      .orderBy(sql`week`)
      .values()
  )
  const columns = ['week', 'count']

  return { columns, values }
}
