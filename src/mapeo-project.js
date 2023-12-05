// @ts-check
import path from 'path'
import fs from 'fs/promises'
import yauzl from 'yauzl-promise'
import Database from 'better-sqlite3'
import { decodeBlockPrefix } from '@mapeo/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
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
import { SyncApi, kHandleDiscoveryKey } from './sync/sync-api.js'
import { Logger } from './logger.js'
import { IconApi } from './icon-api.js'
import { readPresets } from './config-import.js'

/** @typedef {Omit<import('@mapeo/schema').ProjectSettingsValue, 'schemaName'>} EditableProjectSettings */

const CORESTORE_STORAGE_FOLDER_NAME = 'corestore'
const INDEXER_STORAGE_FOLDER_NAME = 'indexer'
export const kCoreManager = Symbol('coreManager')
export const kCoreOwnership = Symbol('coreOwnership')
export const kCapabilities = Symbol('capabilities')
export const kSetOwnDeviceInfo = Symbol('kSetOwnDeviceInfo')
export const kBlobStore = Symbol('blobStore')
export const kProjectReplicate = Symbol('replicate project')
const EMPTY_PROJECT_SETTINGS = Object.freeze({})

export class MapeoProject {
  #projectId
  #deviceId
  #coreManager
  #dataStores
  #dataTypes
  #blobStore
  #coreOwnership
  #capabilities
  #memberApi
  #iconApi
  #syncApi
  #l

  static EMPTY_PROJECT_SETTINGS = EMPTY_PROJECT_SETTINGS

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
    const identityKeypair = keyManager.getIdentityKeypair()
    const coreKeypairs = getCoreKeypairs({
      projectKey,
      projectSecretKey,
      keyManager,
    })
    this.#coreOwnership = new CoreOwnership({
      dataType: this.#dataTypes.coreOwnership,
      coreKeypairs,
      identityKeypair,
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

    ///////// 4. Replicate local peers automatically

    // Replicate already connected local peers
    for (const peer of localPeers.peers) {
      if (peer.status !== 'connected') continue
      this.#coreManager.creatorCore.replicate(peer.protomux)
    }

    // When a new peer is found, try to replicate (if it is not a member of the
    // project it will fail the capability check and be ignored)
    localPeers.on('peer-add', (peer) => {
      this.#coreManager.creatorCore.replicate(peer.protomux)
    })

    // This happens whenever a peer replicates a core to the stream. SyncApi
    // handles replicating this core if we also have it, or requesting the key
    // for the core.
    localPeers.on('discovery-key', (discoveryKey, stream) => {
      this.#syncApi[kHandleDiscoveryKey](discoveryKey, stream)
    })

    this.#l.log('Created project instance %h', projectKey)
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
      return /** @type {EditableProjectSettings} */ (EMPTY_PROJECT_SETTINGS)
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
   * @param {Parameters<import('hypercore')['replicate']>[0]} stream A duplex stream, a @hyperswarm/secret-stream, or a Protomux instance
   * @returns
   */
  [kProjectReplicate](stream) {
    // @ts-expect-error - hypercore types need updating
    const replicationStream = this.#coreManager.creatorCore.replicate(stream, {
      // @ts-ignore - hypercore types do not currently include this option
      ondiscoverykey: async (discoveryKey) => {
        const protomux =
          /** @type {import('protomux')<import('@hyperswarm/secret-stream')>} */ (
            replicationStream.noiseStream.userData
          )
        this.#syncApi[kHandleDiscoveryKey](discoveryKey, protomux)
      },
    })
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

  /** @params {Object} opts
   * @property {String} path
   */
  async importConfig({ configPath }) {
    // console.log(path.resolve(configPath))
    try {
      await fs.stat(path.resolve(configPath))
    } catch (e) {
      console.log(`error loading config file ${configPath}`, e)
    }
    const zip = await yauzl.open(configPath)
    const ids = await this.preset.getMany()
    if (ids.length !== 0) await this.preset.delete(ids)
    try {
      for await (const entry of zip) {
        if (entry.filename === 'presets.json') {
          /* eslint-disable no-unused-vars */
          const { fields, presets } = await readPresets(
            await zip.openReadStream(entry)
          )
          for (let [fieldName, field] of Object.entries(fields)) {
            const fieldDoc = {
              // shouldn't schemaName be derived when calling .create?
              schemaName: 'field',
              label: fieldName,
              ...field,
            }
            fieldDoc.tagKey = fieldDoc.key
            delete fieldDoc.key
            await this.field.create(fieldDoc)
            const fields = await this.field.getMany()
            for (let field of fields) {
              console.log('docId', field.docId)
              console.log('tagKey', field.tagKey)
            }
            // this.#iconApi.create()
            // console.log(presets)
          }
          // this.preset.create()
          // console.log(presets)
        }
        if (entry.filename.endsWith('icons/')) {
          console.log(entry.filename)
        }
        // const file = await zip.openReadStream(entry)
        // file.pipe(process.stdout)
        // console.log(entry.filename, entry.createReadStream())
        // await pipeline(entry.createReadStream(), process.stdout)
        // await entry.createReadStream().pipe(process.stdout)
      }
    } catch (e) {
      console.log('error', e)
    } finally {
      await zip.close()
    }
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
 * @returns {Record<import('./core-manager/index.js').Namespace, import('./types.js').KeyPair>}
 */
function getCoreKeypairs({ projectKey, projectSecretKey, keyManager }) {
  const keypairs =
    /** @type {Record<import('./core-manager/index.js').Namespace, import('./types.js').KeyPair>} */ ({})

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
