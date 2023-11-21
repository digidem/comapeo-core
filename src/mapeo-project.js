// @ts-check
import path from 'path'
import Database from 'better-sqlite3'
import { decodeBlockPrefix } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import pDefer from 'p-defer'
import { discoveryKey } from 'hypercore-crypto'

import { CoreManager, NAMESPACES } from './core-manager/index.js'
import { DataStore } from './datastore/index.js'
import { DataType, kCreateWithDocId } from './datatype/index.js'
import { BlobStore } from './blob-store/index.js'
import { BlobApi } from './blob-api.js'
import { IndexWriter } from './index-writer/index.js'
import { projectSettingsTable } from './schema/client.js'
import {
  coreOwnershipTable,
  deviceInfoTable,
  fieldTable,
  observationTable,
  presetTable,
  roleTable,
  iconTable,
} from './schema/project.js'
import {
  CoreOwnership,
  getWinner,
  mapAndValidateCoreOwnership,
} from './core-ownership.js'
import { Capabilities } from './capabilities.js'
import {
  getDeviceId,
  projectKeyToId,
  projectKeyToPublicId,
  valueOf,
} from './utils.js'
import { MemberApi } from './member-api.js'
import { IconApi } from './icon-api.js'
import { SyncApi, kSyncReplicate } from './sync/sync-api.js'
import Hypercore from 'hypercore'
import { Logger } from './logger.js'

/** @typedef {Omit<import('@mapeo/schema').ProjectSettingsValue, 'schemaName'>} EditableProjectSettings */

const CORESTORE_STORAGE_FOLDER_NAME = 'corestore'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
export const kCoreOwnership = Symbol('coreOwnership')
export const kCapabilities = Symbol('capabilities')
export const kSetOwnDeviceInfo = Symbol('kSetOwnDeviceInfo')
export const kBlobStore = Symbol('blobStore')
export const kProjectReplicate = Symbol('replicate project')

export class MapeoProject {
  #projectId
  #deviceId
  #coreManager
  #dataStores
  #dataTypes
  #blobStore
  #coreOwnership
  #capabilities
  #ownershipWriteDone
  #memberApi
  #iconApi
  #syncApi
  #l

  /**
   * @param {Object} opts
   * @param {string} opts.dbPath Path to store project sqlite db. Use `:memory:` for memory storage
   * @param {string} opts.projectMigrationsFolder path for drizzle migration folder for project
   * @param {import('@mapeo/crypto').KeyManager} opts.keyManager mapeo/crypto KeyManager instance
   * @param {Buffer} opts.projectKey 32-byte public key of the project creator core
   * @param {Buffer} [opts.projectSecretKey] 32-byte secret key of the project creator core
   * @param {Partial<Record<import('./core-manager/index.js').Namespace, Buffer>>} [opts.encryptionKeys] Encryption keys for each namespace
   * @param {import('drizzle-orm/better-sqlite3').BetterSQLite3Database} opts.sharedDb
   * @param {IndexWriter} opts.sharedIndexWriter
   * @param {import('./types.js').CoreStorage} opts.coreStorage Folder to store all hypercore data
   * @param {(mediaType: 'blobs' | 'icons') => Promise<string>} opts.getMediaBaseUrl
   * @param {import('./local-peers.js').LocalPeers} opts.localPeers
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
    localPeers,
    logger,
  }) {
    this.#l = Logger.create('project', logger)
    this.#deviceId = getDeviceId(keyManager)
    this.#projectId = projectKeyToId(projectKey)

    ///////// 1. Setup database
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)
    migrate(db, { migrationsFolder: projectMigrationsFolder })

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
      logger: this.#l,
    })

    const indexWriter = new IndexWriter({
      tables: [
        observationTable,
        presetTable,
        fieldTable,
        coreOwnershipTable,
        roleTable,
        deviceInfoTable,
        iconTable,
      ],
      sqlite,
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
      projectSettings: new DataType({
        dataStore: this.#dataStores.config,
        table: projectSettingsTable,
        db: sharedDb,
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
      }),
    }

    this.#coreOwnership = new CoreOwnership({
      dataType: this.#dataTypes.coreOwnership,
    })
    this.#capabilities = new Capabilities({
      dataType: this.#dataTypes.role,
      coreOwnership: this.#coreOwnership,
      coreManager: this.#coreManager,
      projectKey: projectKey,
      deviceKey: keyManager.getIdentityKeypair().publicKey,
    })

    this.#memberApi = new MemberApi({
      deviceId: this.#deviceId,
      capabilities: this.#capabilities,
      coreOwnership: this.#coreOwnership,
      // @ts-expect-error
      encryptionKeys,
      projectKey,
      rpc: localPeers,
      dataTypes: {
        deviceInfo: this.#dataTypes.deviceInfo,
        project: this.#dataTypes.projectSettings,
      },
    })

    const projectPublicId = projectKeyToPublicId(projectKey)

    this.#blobStore = new BlobStore({
      coreManager: this.#coreManager,
    })

    this.$blobs = new BlobApi({
      blobStore: this.#blobStore,
      getMediaBaseUrl: async () => {
        let base = await getMediaBaseUrl('blobs')
        if (!base.endsWith('/')) {
          base += '/'
        }
        return base + projectPublicId
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
        return base + projectPublicId
      },
    })

    this.#syncApi = new SyncApi({
      coreManager: this.#coreManager,
      capabilities: this.#capabilities,
      logger: this.#l,
    })

    ///////// 4. Wire up sync

    // Replicate already connected local peers
    for (const peer of localPeers.peers) {
      if (peer.status !== 'connected') continue
      this.#syncApi[kSyncReplicate](peer.protomux)
    }

    localPeers.on('discovery-key', (discoveryKey, stream) => {
      // The core identified by this discovery key might not be part of this
      // project, but we can't know that so we will request it from the peer if
      // we don't have it. The peer will not return the core key unless it _is_
      // part of this project
      this.#coreManager.handleDiscoveryKey(discoveryKey, stream)
    })

    // When a new peer is found, try to replicate (if it is not a member of the
    // project it will fail the capability check and be ignored)
    localPeers.on('peer-add', (peer) => {
      this.#syncApi[kSyncReplicate](peer.protomux)
    })

    ///////// 5. Write core ownership record

    const deferred = pDefer()
    // Avoid uncaught rejection. If this is rejected then project.ready() will reject
    deferred.promise.catch(() => {})
    this.#ownershipWriteDone = deferred.promise

    const authCore = this.#coreManager.getWriterCore('auth').core
    authCore.on('ready', () => {
      if (authCore.length > 0) return
      const identityKeypair = keyManager.getIdentityKeypair()
      const coreKeypairs = getCoreKeypairs({
        projectKey,
        projectSecretKey,
        keyManager,
      })
      this.#coreOwnership
        .writeOwnership(identityKeypair, coreKeypairs)
        .then(deferred.resolve)
        .catch(deferred.reject)
    })
    this.#l.log('Created project instance %h', projectKey)
  }

  /**
   * CoreOwnership instance, used for tests
   */
  get [kCoreOwnership]() {
    return this.#coreOwnership
  }

  /**
   * Capabilities instance, used for tests
   */
  get [kCapabilities]() {
    return this.#capabilities
  }

  get [kBlobStore]() {
    return this.#blobStore
  }

  get deviceId() {
    return this.#deviceId
  }

  /**
   * Resolves when hypercores have all loaded
   */
  async ready() {
    await Promise.all([this.#coreManager.ready(), this.#ownershipWriteDone])
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

  get $member() {
    return this.#memberApi
  }

  get $sync() {
    return this.#syncApi
  }

  /**
   * @param {Partial<EditableProjectSettings>} settings
   * @returns {Promise<EditableProjectSettings>}
   */
  async $setProjectSettings(settings) {
    const { projectSettings } = this.#dataTypes

    // We only want to catch the error to the getByDocId call
    // Using try/catch for this is a little verbose when dealing with TS types
    const existing = await projectSettings
      .getByDocId(this.#projectId)
      .catch(() => {
        // project does not exist so return null
        return null
      })

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
      this.#l.log('No project settings')
      return /** @type {EditableProjectSettings} */ ({})
    }
  }

  async $getOwnCapabilities() {
    return this.#capabilities.getCapabilities(this.#deviceId)
  }

  /**
   * Replicate a project to a @hyperswarm/secret-stream. Invites will not
   * function because the RPC channel is not connected for project replication,
   * and only this project will replicate (to replicate multiple projects you
   * need to replicate the manager instance via manager[kManagerReplicate])
   *
   * @param {Exclude<Parameters<Hypercore.createProtocolStream>[0], boolean>} stream A duplex stream, a @hyperswarm/secret-stream, or a Protomux instance
   * @returns
   */
  [kProjectReplicate](stream) {
    const replicationStream = Hypercore.createProtocolStream(stream, {
      ondiscoverykey: async (discoveryKey) => {
        this.#coreManager.handleDiscoveryKey(discoveryKey, replicationStream)
      },
    })
    const protomux = replicationStream.noiseStream.userData
    // @ts-ignore - got fed up jumping through hoops to keep TS heppy
    this.#syncApi[kSyncReplicate](protomux)
    return replicationStream
  }

  /**
   * @param {Pick<import('@mapeo/schema').DeviceInfoValue, 'name'>} value
   * @returns {Promise<import('@mapeo/schema').DeviceInfo>}
   */
  async [kSetOwnDeviceInfo](value) {
    const { deviceInfo } = this.#dataTypes

    const configCoreId = this.#coreManager
      .getWriterCore('config')
      .key.toString('hex')

    let existingDoc
    try {
      existingDoc = await deviceInfo.getByDocId(configCoreId)
    } catch (err) {
      return await deviceInfo[kCreateWithDocId](configCoreId, {
        ...value,
        schemaName: 'deviceInfo',
      })
    }

    return deviceInfo.update(existingDoc.versionId, {
      ...value,
      schemaName: 'deviceInfo',
    })
  }

  /**
   * @returns {import('./icon-api.js').IconApi}
   */
  get $icons() {
    return this.#iconApi
  }
}

/**
 * @param {import("@mapeo/schema").ProjectSettings & { forks: string[] }} projectDoc
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

/**
 * Validate that a deviceInfo record is written by the device that is it about,
 * e.g. version.coreKey should equal docId
 *
 * @param {import('@mapeo/schema').DeviceInfo} doc
 * @param {import('@mapeo/schema').VersionIdObject} version
 * @returns {import('@mapeo/schema').DeviceInfo}
 */
function mapAndValidateDeviceInfo(doc, { coreDiscoveryKey }) {
  if (!coreDiscoveryKey.equals(discoveryKey(Buffer.from(doc.docId, 'hex')))) {
    throw new Error(
      'Invalid deviceInfo record, cannot write deviceInfo for another device'
    )
  }
  return doc
}
