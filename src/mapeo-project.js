import path from 'path'
import Database from 'better-sqlite3'
import { decodeBlockPrefix, decode, parseVersionId } from '@comapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { discoveryKey } from 'hypercore-crypto'
import { TypedEmitter } from 'tiny-typed-emitter'
import ZipArchive from 'zip-stream-promise'
import * as b4a from 'b4a'
import mime from 'mime/lite'
// @ts-expect-error
import { Readable, pipelinePromise } from 'streamx'

import { NAMESPACES, NAMESPACE_SCHEMAS, UNIX_EPOCH_DATE } from './constants.js'
import { CoreManager } from './core-manager/index.js'
import { DataStore } from './datastore/index.js'
import { DataType, kCreateWithDocId, kSelect } from './datatype/index.js'
import { BlobStore } from './blob-store/index.js'
import { BlobApi } from './blob-api.js'
import { IndexWriter } from './index-writer/index.js'
import { projectSettingsTable } from './schema/client.js'
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
import {
  BLOCKED_ROLE_ID,
  COORDINATOR_ROLE_ID,
  Roles,
  LEFT_ROLE_ID,
} from './roles.js'
import {
  assert,
  buildBlobId,
  ExhaustivenessError,
  getDeviceId,
  projectKeyToId,
  projectKeyToPublicId,
  projectKeyToStatsId,
  valueOf,
} from './utils.js'
import { migrate } from './lib/drizzle-helpers.js'
import { omit } from './lib/omit.js'
import { MemberApi } from './member-api.js'
import {
  SyncApi,
  kHandleDiscoveryKey,
  kWaitForInitialSyncWithPeer,
} from './sync/sync-api.js'
import { Logger } from './logger.js'
import { IconApi } from './icon-api.js'
import { readConfig } from './config-import.js'
import TranslationApi from './translation-api.js'
import { NotFoundError, nullIfNotFound } from './errors.js'
import { WebSocket } from 'ws'
import { createWriteStream } from 'fs'
/** @import { ProjectSettingsValue, Observation, Track } from '@comapeo/schema' */
/** @import { Attachment, CoreStorage, BlobFilter, BlobId, BlobStoreEntriesStream, KeyPair, Namespace, ReplicationStream, GenericBlobFilter, MapeoValueMap, MapeoDocMap } from './types.js' */
/** @typedef {Omit<ProjectSettingsValue, 'schemaName'>} EditableProjectSettings */
/** @typedef {ProjectSettingsValue['configMetadata']} ConfigMetadata */
/** @typedef {Map<string,Attachment>} SeenAttachments*/
/** @typedef {object} BlobRef
 * @prop {string|undefined} mimeType
 * @prop {BlobId} blobId
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
export const kClearDataIfLeft = Symbol('clear data if left project')
export const kSetIsArchiveDevice = Symbol('set isArchiveDevice')
export const kIsArchiveDevice = Symbol('isArchiveDevice (temp - test only)')
export const kGeoJSONFileName = Symbol('geoJSONFileName')

const EMPTY_PROJECT_SETTINGS = Object.freeze({})

/** @type BlobId['variant'][]*/
const VARIANT_EXPORT_ORDER = ['original', 'preview', 'thumbnail']

/**
 * @extends {TypedEmitter<{ close: () => void }>}
 */
export class MapeoProject extends TypedEmitter {
  #projectKey
  #deviceId
  #identityKeypair
  #coreManager
  #indexWriter
  #dataStores
  #dataTypes
  #blobStore
  #coreOwnership
  #roles
  #sqlite
  #memberApi
  #iconApi
  #syncApi
  /** @type {TranslationApi} */
  #translationApi
  #l
  /** @type {Boolean} this avoids loading multiple configs in parallel */
  #loadingConfig

  static EMPTY_PROJECT_SETTINGS = EMPTY_PROJECT_SETTINGS

  /**
   * @param {Object} opts
   * @param {string} opts.dbPath Path to store project sqlite db. Use `:memory:` for memory storage
   * @param {string} opts.projectMigrationsFolder path for drizzle migration folder for project
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys Encryption keys for each namespace
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.sharedDb
   * @param {IndexWriter} opts.sharedIndexWriter
   * @param {CoreStorage} opts.coreStorage Folder to store all hypercore data
   * @param {(mediaType: 'blobs' | 'icons') => Promise<string>} opts.getMediaBaseUrl
   * @param {(url: string) => WebSocket} [opts.makeWebsocket]
   * @param {import('./local-peers.js').LocalPeers} opts.localPeers
   * @param {boolean} opts.isArchiveDevice Whether this device is an archive device
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
    logger,
    isArchiveDevice,
  }) {
    super()

    this.#l = Logger.create('project', logger)
    this.#deviceId = getDeviceId(keyManager)
    this.#projectKey = projectKey
    this.#loadingConfig = false

    const getReplicationStream = this[kProjectReplicate].bind(this, true)

    ///////// 1. Setup database

    this.#sqlite = new Database(dbPath)
    const db = drizzle(this.#sqlite)
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
        throw new ExhaustivenessError(migrationResult)
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
          case 'deviceInfo':
            return mapAndValidateDeviceInfo(doc, version)
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
    this.#dataTypes = {
      observation: new DataType({
        dataStore: this.#dataStores.data,
        table: observationTable,
        db,
        getTranslations,
      }),
      track: new DataType({
        dataStore: this.#dataStores.data,
        table: trackTable,
        db,
        getTranslations,
      }),
      remoteDetectionAlert: new DataType({
        dataStore: this.#dataStores.data,
        table: remoteDetectionAlertTable,
        db,
        getTranslations,
      }),
      preset: new DataType({
        dataStore: this.#dataStores.config,
        table: presetTable,
        db,
        getTranslations,
      }),
      field: new DataType({
        dataStore: this.#dataStores.config,
        table: fieldTable,
        db,
        getTranslations,
      }),
      projectSettings: new DataType({
        dataStore: this.#dataStores.config,
        table: projectSettingsTable,
        db: sharedDb,
        getTranslations,
      }),
      coreOwnership: new DataType({
        dataStore: this.#dataStores.auth,
        table: coreOwnershipTable,
        db,
        getTranslations,
      }),
      role: new DataType({
        dataStore: this.#dataStores.auth,
        table: roleTable,
        db,
        getTranslations,
      }),
      deviceInfo: new DataType({
        dataStore: this.#dataStores.config,
        table: deviceInfoTable,
        db,
        getTranslations,
      }),
      icon: new DataType({
        dataStore: this.#dataStores.config,
        table: iconTable,
        db,
        getTranslations,
      }),
      translation: new DataType({
        dataStore: this.#dataStores.config,
        table: translationTable,
        db,
        getTranslations: () => {
          throw new Error('Cannot get translation for translations')
        },
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
      coreOwnership: this.#coreOwnership,
      encryptionKeys,
      getProjectName: this.#getProjectName.bind(this),
      projectKey,
      rpc: localPeers,
      makeWebsocket,
      getReplicationStream,
      waitForInitialSyncWithPeer: (deviceId, abortSignal) =>
        this.$sync[kWaitForInitialSyncWithPeer](deviceId, abortSignal),
      dataTypes: {
        deviceInfo: this.#dataTypes.deviceInfo,
        project: this.#dataTypes.projectSettings,
      },
      logger: this.#l,
    })

    this.#blobStore = new BlobStore({
      coreManager: this.#coreManager,
      isArchiveDevice: isArchiveDevice,
      logger: this.#l,
    })

    this.#blobStore.on('error', (err) => {
      // TODO: Handle this error in some way - this error will come from an
      // unexpected error with background blob downloads
      console.error('BlobStore error', err)
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

    this.once('close', () => {
      localPeers.off('peer-add', onPeerAdd)
      localPeers.off('discovery-key', onDiscoverykey)
    })

    this.#l.log('Created project instance %h, %s', projectKey, isArchiveDevice)

    this.#trySendStats()
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
   *
   * @returns {Promise<void>}
   */
  ready() {
    return this.#coreManager.ready()
  }

  /**
   */
  async close() {
    this.#l.log('closing project %h', this.#projectId)
    this.#blobStore.close()
    const dataStorePromises = []
    for (const dataStore of Object.values(this.#dataStores)) {
      dataStorePromises.push(dataStore.close())
    }
    await Promise.all(dataStorePromises)
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

          assert(doc.schemaName === 'translation', 'expected a translation doc')
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
    } catch (e) {
      return /** @type {EditableProjectSettings} */ (EMPTY_PROJECT_SETTINGS)
    }
  }

  /**
   * @returns {Promise<boolean>}
   */
  async $hasSyncedProjectSettings() {
    try {
      const settings = await this.#dataTypes.projectSettings.getByDocId(
        this.#projectId
      )

      return settings.createdAt !== UNIX_EPOCH_DATE
    } catch (e) {
      return false
    }
  }

  /**
   * @returns {Promise<undefined | string>}
   */
  async #getProjectName() {
    return (await this.$getProjectSettings()).name
  }

  async $getOwnRole() {
    return this.#roles.getRole(this.#deviceId)
  }

  /**
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
   * @returns {Promise<import('@comapeo/schema').DeviceInfo>}
   */
  async [kSetOwnDeviceInfo](value) {
    const { deviceInfo } = this.#dataTypes

    const configCoreId = this.#coreManager
      .getWriterCore('config')
      .key.toString('hex')

    const doc = {
      name: value.name,
      deviceType: value.deviceType,
      selfHostedServerDetails: value.selfHostedServerDetails,
      schemaName: /** @type {const} */ ('deviceInfo'),
    }

    const existingDoc = await deviceInfo
      .getByDocId(configCoreId)
      .catch(nullIfNotFound)
    if (existingDoc) {
      return await deviceInfo.update(existingDoc.versionId, doc)
    } else {
      return await deviceInfo[kCreateWithDocId](configCoreId, doc)
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

  #makeStats() {
    // Get timestamp for 3 months ago
    // Find members with createdAt > timestamp
    // Bucket by week
    // Same for obs, tracks

    const stats = [
      {
        start: Date.now(), // Timestamp for when week starts
        members: 0, // Number of new members this week
        observations: 0, // New observations this week
        tracks: 0, // New tracks this week
      },
    ]

    const project = projectKeyToStatsId(this.#projectKey)

    return { project, stats }
  }

  async #trySendStats() {
    const { collectStats } = await this.$getProjectSettings()
    if (!collectStats) return
    await this.#sendStats()
  }

  async #sendStats() {
    try {
      const stats = this.#makeStats()
      // Send to metrics-proxy
      // https://github.com/digidem/metrics-proxy
      // TODO: Pass this URL in constructor
      const statsEndpoint = 'http://example.com/prod'
      const response = await fetch(statsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: stats }),
      })
      if (!response.ok) throw new Error(await response.text())
    } catch (e) {
      if (!(e instanceof Error)) throw e
      this.#l.log(`ERROR: could not send project stats ${e.message}`)
    }
  }

  /**
   * @param {Iterable<Observation>} observations
   * @param {Object} options
   * @param {Set<string>} [options.seenObservations=new Set()]
   * @param {SeenAttachments} [options.seenAttachments]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportObservations(
    observations,
    { seenObservations = new Set(), seenAttachments = new Map() }
  ) {
    let first = true
    for (const observation of observations) {
      const { lat, lon, docId } = observation
      if (seenObservations.has(docId)) {
        continue
      }
      seenObservations.add(docId)
      for (const attachment of observation.attachments) {
        const { hash } = attachment
        if (!seenAttachments.has(hash)) {
          seenAttachments.set(hash, attachment)
        }
      }

      const metadataCoords = observation.metadata?.position?.coords
      const altitude = metadataCoords?.altitude

      /** @type {[number, number] | [number, number, number] | null} */
      let coordinates = null

      // Prioritize using the observation's `lat` and `lon` fields
      if (typeof lat === 'number' && typeof lon === 'number') {
        coordinates =
          typeof altitude === 'number' ? [lon, lat, altitude] : [lon, lat]
      } else {
        // Fall back to using the observation metadata's position if possible
        if (
          typeof metadataCoords?.latitude === 'number' &&
          typeof metadataCoords?.longitude === 'number'
        ) {
          coordinates =
            typeof altitude === 'number'
              ? [metadataCoords.longitude, metadataCoords.latitude, altitude]
              : [metadataCoords.longitude, metadataCoords.latitude]
        }
      }

      /** @type {import('geojson').Feature<import('geojson').Point | null>} */
      const feature = {
        type: 'Feature',
        properties: observation,
        geometry: coordinates
          ? {
              type: 'Point',
              coordinates,
            }
          : null,
      }
      const comma = first ? '' : ','
      first = false
      yield b4a.from(`${comma}\n      ` + JSON.stringify(feature))
    }
  }

  /**
   * @param {Iterable<Track>} tracks
   * @param {Object} options
   * @param {Set<string>} [options.seenObservations=new Set()]
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportTracks(
    tracks,
    { lang, seenObservations = new Set(), seenAttachments = new Map() } = {}
  ) {
    let first = true
    for (const track of tracks) {
      const { observationRefs } = track

      const observations = await Promise.all(
        observationRefs.map(({ docId }) =>
          this.#dataTypes.observation.getByDocId(docId, { lang })
        )
      )

      /** @type {([number, number] | [number, number, number])[]} */
      const coordinates = track.locations.map(
        ({ coords: { longitude, latitude, altitude } }) =>
          typeof altitude === 'number'
            ? [longitude, latitude, altitude]
            : [longitude, latitude]
      )
      const comma = first ? '' : ','
      first = false
      yield b4a.from(
        `${comma}\n      ` +
          JSON.stringify({
            type: 'Feature',
            properties: track,
            geometry: {
              type: 'LineString',
              coordinates,
            },
          }) +
          '\n'
      )

      let firstObs = true
      for await (const chunk of this.#exportObservations(observations, {
        seenObservations,
        seenAttachments,
      })) {
        if (firstObs) {
          yield b4a.from(',')
          firstObs = false
        }
        yield chunk
      }
    }
  }

  /**
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {AsyncIterable<Buffer | Uint8Array>}
   */
  async *#exportGeoJSONIterator({
    observations = true,
    tracks = true,
    lang,
    seenAttachments = new Map(),
  } = {}) {
    yield b4a.from(`{
  "type": "FeatureCollection",
  "features": [
`)

    const seenObservations = new Set()

    let hadTracks = false
    if (tracks) {
      const rows = await this.#dataTypes.track.getMany({ lang })
      for await (const chunk of this.#exportTracks(rows, {
        lang,
        seenObservations,
        seenAttachments,
      })) {
        hadTracks = true
        yield chunk
      }
    }

    if (observations) {
      if (hadTracks) {
        yield b4a.from(',')
      }
      const rows = await this.#dataTypes.observation.getMany({ lang })
      yield* this.#exportObservations(rows, {
        seenObservations,
        seenAttachments,
      })
    }

    yield b4a.from(`
  ]
}
`)
  }

  /**
   * Export observations and or tracks as a stream of GeoJSON data
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {SeenAttachments} [options.seenAttachments]
   * @param {string} [options.lang]
   * @returns {Readable<Buffer | Uint8Array>}
   */
  #exportGeoJSONStream({
    observations = true,
    tracks = true,
    lang,
    seenAttachments = new Map(),
  } = {}) {
    // Format based on https://doc.arcgis.com/en/arcgis-online/reference/geojson.htm

    return Readable.from(
      this.#exportGeoJSONIterator({
        observations,
        tracks,
        lang,
        seenAttachments,
      })
    )
  }

  /**
   *
   * @param {string} type Type of export this will be
   * @returns {Promise<string>}
   */
  async #exportPrefix(type = '') {
    const name = await this.#getProjectName()
    const date = new Date()
    const yyyy = date.getFullYear()
    const mm = `${date.getMonth() + 1}`.padStart(2, '0')
    const dd = `${date.getDate()}`.padStart(2, '0')
    return `CoMapeo_${name}_${type}_${yyyy}_${mm}_${dd}`
  }

  /**
   * @param {boolean} observations
   * @param {boolean} tracks
   * @returns {Promise<string>}
   */
  async [kGeoJSONFileName](observations, tracks) {
    let exportType = ''
    if (observations) exportType += 'Obsvns'
    if (tracks) {
      if (observations) exportType += '_'
      exportType += 'Tracks'
    }
    const prefix = await this.#exportPrefix(exportType)

    return prefix + '.geojson'
  }

  /**
   * @param {boolean} observations
   * @param {boolean} tracks
   * @returns {Promise<string>}
   */
  async #zipFileName(observations, tracks) {
    let exportType = ''
    if (observations) exportType += 'Obsvns'
    if (tracks) {
      if (observations) exportType += '_'
      exportType += 'Tracks'
    }
    const prefix = await this.#exportPrefix(exportType)

    return prefix + '.zip'
  }

  /**
   * Export observations and or tracks as a GeoJSON file
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
    const fileName = await this[kGeoJSONFileName](observations, tracks)
    const filePath = path.join(exportFolder, fileName)
    const source = this.#exportGeoJSONStream({ observations, tracks, lang })
    const sink = createWriteStream(filePath)
    await pipelinePromise(source, sink)

    return filePath
  }

  /**
   * @param {Attachment} attachment
   * @returns {Promise<null | BlobRef>}
   */
  async #tryGetAttachmentBlob(attachment) {
    // Audio must not have variants
    for (const variant of VARIANT_EXPORT_ORDER) {
      try {
        const blobId = buildBlobId(attachment, variant)
        const entry = await this.#blobStore.entry(blobId)
        if (!entry) continue
        const metadata = entry.value.metadata
        if (!metadata || typeof metadata !== 'object') continue
        let mimeType = undefined
        if ('mimeType' in metadata) {
          if (typeof metadata.mimeType === 'string') {
            mimeType = metadata.mimeType
          } else {
            this.#l.log('Invalid type for mimeType in blob', blobId, entry)
            continue
          }
        }
        return { blobId, mimeType }
      } catch (e) {
        if (!(e instanceof Error)) throw e
        this.#l.log(
          'Error loading blob id for attachment',
          attachment,
          variant,
          e.message
        )
        continue
      }
    }

    return null
  }

  /**
   * @param {ZipArchive} archive
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {boolean} [options.attachments=true] Whether all attachments for observations should be exported
   * @param {string} [options.lang]
   * @returns {Promise<void>}
   */
  async #exportToArchive(
    archive,
    { observations = true, tracks = true, attachments = true, lang } = {}
  ) {
    // GeoJSON
    const geoJSONFileName = await this[kGeoJSONFileName](observations, tracks)
    const seenAttachments = new Map()
    const geoJSONStream = this.#exportGeoJSONStream({
      observations,
      tracks,
      lang,
      seenAttachments,
    })

    // @ts-expect-error
    await archive.entry(geoJSONStream, { name: geoJSONFileName })

    const missingAttachments = []
    // Attachments
    if (attachments) {
      const mediaFolder = (await this.#exportPrefix('Media')) + '/'
      for (const attachment of seenAttachments.values()) {
        const ref = await this.#tryGetAttachmentBlob(attachment)
        if (ref === null) {
          missingAttachments.push(attachment)
          continue
        }

        const { blobId, mimeType } = ref
        let extensionString = ''
        if (mimeType) {
          const extension = mime.getExtension(mimeType)
          if (extension) {
            extensionString = '.' + extension
          } else {
            this.#l.log('Got unknown mime type in attachment blob', attachment)
          }
        }

        const stream = this.#blobStore.createReadStream(blobId)
        const name = path.posix.join(
          mediaFolder,
          `${attachment.name}_${blobId.variant}${extensionString}`
        )
        // @ts-expect-error
        await archive.entry(stream, { name })
      }

      if (missingAttachments.length) {
        this.#l.log(`Found missing attachments during export`)
        const missingContent = missingAttachments
          .map((attachment) => JSON.stringify(attachment))
          .join('\n')

        await archive.entry(missingContent, {
          name: mediaFolder + 'missing.ndjson',
        })
      }
    }
    // Finalize
    archive.finalize()
  }

  /**
   * Export observations, tracks, and or attachments as a zip file stream.
   * @param {Object} [options={}]
   * @param {boolean} [options.observations=true] Whether observations should be exported
   * @param {boolean} [options.tracks=true] Whether all tracks and their observations should be exported
   * @param {boolean} [options.attachments=true] Whether all attachments for observations should be exported
   * @param {string} [options.lang]
   * @returns {Readable<Buffer | Uint8Array>}
   */
  #exportZipStream({
    observations = true,
    tracks = true,
    attachments = true,
    lang,
  } = {}) {
    const archive = new ZipArchive()

    this.#exportToArchive(archive, {
      observations,
      tracks,
      attachments,
      lang,
    }).catch((e) => archive.emit('error', e))

    // @ts-expect-error
    return archive
  }

  /**
   * Export observations, tracks, and or attachments as a zip file.
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
    const fileName = await this.#zipFileName(observations, tracks)
    const filePath = path.join(exportFolder, fileName)
    const source = this.#exportZipStream({
      observations,
      tracks,
      attachments,
      lang,
    })
    const sink = createWriteStream(filePath)
    await pipelinePromise(source, sink)

    return filePath
  }

  /**
   * @returns {Promise<void>}
   */
  async #throwIfCannotLeaveProject() {
    const roleDocs = await this.#dataTypes.role.getMany()

    const ownRole = roleDocs.find(({ docId }) => this.#deviceId === docId)

    if (ownRole?.roleId === BLOCKED_ROLE_ID) {
      throw new Error('Cannot leave a project as a blocked device')
    }

    const allRoles = await this.#roles.getAll()

    const isOnlyDevice = allRoles.size <= 1
    if (isOnlyDevice) return

    const projectCreatorDeviceId = await this.#coreOwnership.getOwner(
      this.#projectId
    )

    for (const deviceId of allRoles.keys()) {
      if (deviceId === this.#deviceId) continue
      const isCreatorOrCoordinator =
        deviceId === projectCreatorDeviceId ||
        roleDocs.some(
          (doc) => doc.docId === deviceId && doc.roleId === COORDINATOR_ROLE_ID
        )
      if (isCreatorOrCoordinator) return
    }

    throw new Error(
      'Cannot leave a project that does not have an external creator or another coordinator'
    )
  }

  async [kProjectLeave]() {
    await this.#throwIfCannotLeaveProject()

    await this.#roles.assignRole(this.#deviceId, LEFT_ROLE_ID)

    await this[kClearDataIfLeft]()
  }

  /**
   * Clear data if we've left the project. No-op if you're still in the project.
   * @returns {Promise<void>}
   */
  async [kClearDataIfLeft]() {
    const role = await this.$getOwnRole()
    if (role.roleId !== LEFT_ROLE_ID) {
      return
    }

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

  /** @param {Object} opts
   *  @param {string} opts.configPath
   *  @returns {Promise<Error[]>}
   */
  async importConfig({ configPath }) {
    assert(
      !this.#loadingConfig,
      'Cannot run multiple config imports at the same time'
    )
    this.#loadingConfig = true

    try {
      // check for already present fields and presets and delete them if exist
      const presetsToDelete = await grabDocsToDelete(this.preset)
      const fieldsToDelete = await grabDocsToDelete(this.field)
      // delete only translations that refer to deleted fields and presets
      const translationsToDelete = await grabTranslationsToDelete({
        logger: this.#l,
        translation: this.$translation.dataType,
        preset: this.preset,
        field: this.field,
      })

      const config = await readConfig(configPath)
      /** @type {Map<string, import('./icon-api.js').IconRef>} */
      const iconNameToRef = new Map()
      /** @type {Map<string, import('@comapeo/schema').PresetValue['fieldRefs'][1]>} */
      const fieldNameToRef = new Map()
      /** @type {Map<string,import('@comapeo/schema').TranslationValue['docRef']>} */
      const presetNameToRef = new Map()

      // Do this in serial not parallel to avoid memory issues (avoid keeping all icon buffers in memory)
      for await (const icon of config.icons()) {
        const { docId, versionId } = await this.#iconApi.create(icon)
        iconNameToRef.set(icon.name, { docId, versionId })
      }

      // Ok to create fields and presets in parallel
      const fieldPromises = []
      for (const { name, value } of config.fields()) {
        fieldPromises.push(
          this.#dataTypes.field.create(value).then(({ docId, versionId }) => {
            fieldNameToRef.set(name, { docId, versionId })
          })
        )
      }
      await Promise.all(fieldPromises)

      const presetsWithRefs = []
      for (const { fieldNames, iconName, value, name } of config.presets()) {
        const fieldRefs = fieldNames.map((fieldName) => {
          const fieldRef = fieldNameToRef.get(fieldName)
          if (!fieldRef) {
            throw new NotFoundError(
              `field ${fieldName} not found (referenced by preset ${value.name})})`
            )
          }
          return fieldRef
        })

        if (!iconName) {
          throw new Error(`preset ${value.name} is missing an icon name`)
        }
        const iconRef = iconNameToRef.get(iconName)
        if (!iconRef) {
          throw new NotFoundError(
            `icon ${iconName} not found (referenced by preset ${value.name})`
          )
        }

        presetsWithRefs.push({
          preset: {
            ...value,
            iconRef,
            fieldRefs,
          },
          name,
        })
      }

      const presetPromises = []
      for (const { preset, name } of presetsWithRefs) {
        presetPromises.push(
          this.preset.create(preset).then(({ docId, versionId }) => {
            presetNameToRef.set(name, { docId, versionId })
          })
        )
      }

      await Promise.all(presetPromises)

      const translationPromises = []
      for (const { name, value } of config.translations()) {
        let docRef
        if (value.docRefType === 'field') {
          docRef = { ...fieldNameToRef.get(name) }
        } else if (value.docRefType === 'preset') {
          docRef = { ...presetNameToRef.get(name) }
        } else {
          throw new Error(`invalid docRefType ${value.docRefType}`)
        }
        if (docRef.docId && docRef.versionId) {
          translationPromises.push(
            this.$translation.put({
              ...value,
              docRef: {
                docId: docRef.docId,
                versionId: docRef.versionId,
              },
            })
          )
        } else {
          throw new NotFoundError(
            `docRef for ${value.docRefType} with name ${name} not found`
          )
        }
      }
      await Promise.all(translationPromises)

      // close the zip handles after we know we won't be needing them anymore
      await config.close()
      const presetIds = [...presetNameToRef.values()].map((val) => val.docId)

      await this.$setProjectSettings({
        defaultPresets: {
          point: presetIds,
          line: [],
          area: [],
          vertex: [],
          relation: [],
        },
        configMetadata: config.metadata,
      })

      const deletePresetsPromise = Promise.all(
        presetsToDelete.map(async (docId) => {
          const { deleted } = await this.preset.getByDocId(docId)
          if (!deleted) await this.preset.delete(docId)
        })
      )
      const deleteFieldsPromise = Promise.all(
        fieldsToDelete.map(async (docId) => {
          const { deleted } = await this.field.getByDocId(docId)
          if (!deleted) await this.field.delete(docId)
        })
      )
      const deleteTranslationsPromise = Promise.all(
        [...translationsToDelete].map(async (docId) => {
          const { deleted } = await this.$translation.dataType.getByDocId(docId)
          if (!deleted) await this.$translation.dataType.delete(docId)
        })
      )
      await Promise.all([
        deletePresetsPromise,
        deleteFieldsPromise,
        deleteTranslationsPromise,
      ])
      this.#loadingConfig = false
      return config.warnings
    } catch (e) {
      this.#l.log('error loading config', e)
      this.#loadingConfig = false
      return /** @type Error[] */ []
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
 @param {MapeoProject['field'] | MapeoProject['preset']} dataType
 @returns {Promise<String[]>}
 */
async function grabDocsToDelete(dataType) {
  const toDelete = []
  for (const { docId } of await dataType.getMany()) {
    toDelete.push(docId)
  }
  return toDelete
}

/**
 * @param {Object} opts
 * @param {Logger} opts.logger
 * @param {MapeoProject['$translation']['dataType']} opts.translation
 * @param {MapeoProject['preset']} opts.preset
 * @param {MapeoProject['field']} opts.field
 * @returns {Promise<Set<String>>}
 */
async function grabTranslationsToDelete(opts) {
  /** @type {Set<String>} */
  const toDelete = new Set()
  const translations = await opts.translation.getMany()
  await Promise.all(
    translations.map(async ({ docRefType, docRef, docId }) => {
      if (docRefType === 'field' || docRefType === 'preset') {
        let doc
        try {
          doc = await opts[docRefType].getByVersionId(docRef.versionId)
        } catch (e) {
          opts.logger.log(`referred ${docRef.versionId} is not found`)
        }
        if (doc) {
          toDelete.add(docId)
        }
      }
    })
  )
  return toDelete
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
 * Validate that a deviceInfo record is written by the device that is it about,
 * e.g. version.coreKey should equal docId
 *
 * @param {import('@comapeo/schema').DeviceInfo} doc
 * @param {import('@comapeo/schema').VersionIdObject} version
 * @returns {import('@comapeo/schema').DeviceInfo}
 */
function mapAndValidateDeviceInfo(doc, { coreDiscoveryKey }) {
  if (!coreDiscoveryKey.equals(discoveryKey(Buffer.from(doc.docId, 'hex')))) {
    throw new Error(
      'Invalid deviceInfo record, cannot write deviceInfo for another device'
    )
  }
  return doc
}

/**
 *
 * @param {string} baseUrl
 * @param {string} projectPublicId
 * @returns {string}
 */
export function baseUrlToWS(baseUrl, projectPublicId) {
  const wsUrl = new URL(`/sync/${projectPublicId}`, baseUrl)
  wsUrl.protocol = wsUrl.protocol === 'http:' ? 'ws:' : 'wss:'

  return wsUrl.href
}
