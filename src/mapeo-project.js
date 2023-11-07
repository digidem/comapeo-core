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
import { createBlobServer } from './blob-server/index.js'
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
import { getDeviceId, projectKeyToId, valueOf } from './utils.js'
import { MemberApi } from './member-api.js'
import { SyncController } from './sync/sync-controller.js'
import { IconApi } from './icon-api.js'

/** @typedef {Omit<import('@mapeo/schema').ProjectSettingsValue, 'schemaName'>} EditableProjectSettings */

const CORESTORE_STORAGE_FOLDER_NAME = 'corestore'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
export const kCoreOwnership = Symbol('coreOwnership')
export const kCapabilities = Symbol('capabilities')
export const kSetOwnDeviceInfo = Symbol('kSetOwnDeviceInfo')
export const kReplicate = Symbol('replicate')

export class MapeoProject {
  #projectId
  #deviceId
  #coreManager
  #dataStores
  #dataTypes
  #blobStore
  #blobServer
  #coreOwnership
  #capabilities
  #ownershipWriteDone
  #memberApi
  #syncController
  #iconApi

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
   * @param {import('./local-peers.js').LocalPeers} opts.rpc
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
    rpc,
  }) {
    this.#deviceId = getDeviceId(keyManager)
    this.#projectId = projectKeyToId(projectKey)

    ///////// 1. Setup database
    const sqlite = new Database(dbPath)
    const db = drizzle(sqlite)
    migrate(db, {
      migrationsFolder: new URL('../drizzle/project', import.meta.url).pathname,
    })

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
      tables: [
        observationTable,
        presetTable,
        fieldTable,
        coreOwnershipTable,
        roleTable,
        deviceInfoTable,
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

    this.#blobStore = new BlobStore({
      coreManager: this.#coreManager,
    })

    this.#blobServer = createBlobServer({
      logger: true,
      blobStore: this.#blobStore,
      prefix: '/blobs/',
      projectId: this.#projectId,
    })

    // @ts-ignore TODO: pass in blobServer
    this.$blobs = new BlobApi({
      projectId: this.#projectId,
      blobStore: this.#blobStore,
      blobServer: this.#blobServer,
    })

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
      rpc,
      dataTypes: {
        deviceInfo: this.#dataTypes.deviceInfo,
        project: this.#dataTypes.projectSettings,
      },
    })

    this.#iconApi = new IconApi({
      iconDataStore: this.#dataStores.config,
      iconDataType: this.#dataTypes.icon,
      projectId: this.#projectId,
      // TODO: Update after merging https://github.com/digidem/mapeo-core-next/pull/365
      getMediaBaseUrl: async () => {
        throw new Error('Not yet implemented')
      },
    })

    this.#syncController = new SyncController({
      coreManager: this.#coreManager,
      capabilities: this.#capabilities,
    })

    ///////// 4. Write core ownership record

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
    } catch {
      return /** @type {EditableProjectSettings} */ ({})
    }
  }

  async $getOwnCapabilities() {
    return this.#capabilities.getCapabilities(this.#deviceId)
  }

  /**
   *
   * @param {import('./types.js').ReplicationStream} stream
   * @returns
   */
  [kReplicate](stream) {
    return this.#syncController.replicate(stream)
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
