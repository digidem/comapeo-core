import { KeyManager } from '@mapeo/crypto'

import { AuthStore } from './lib/authstore/index.js'
import { DataStore } from './lib/datastore/index.js'
import { Discovery } from './lib/discovery/index.js'
import { CoreManager } from './lib/core-manager/index.js'
import { Sqlite } from './lib/sqlite.js'

export class MapeoProject {
  #sqliteDatabase
  #sqlite

  #authstore
  #datastore
  #discovery
  #coreManager
  #keyManager

  #rootKey
  #identityKeyPair
  #projectPublicKey
  #projectSecretKey

  /**
   * @typedef {Object} MapeoProjectOptionsBase
   * @property {Buffer} rootKey
   * @property {any} storage
   * @property {string} sqliteFilepath
   * @property {IdentityKeyPair} identityKeyPair
   * @property {Boolean | undefined} mdns
   * @property {Boolean | DhtOptions | undefined} dht
   * 
   * @typedef {MapeoProjectOptionsBase & { projectPublicKey: PublicKey, projectKeyPair: never }} MapeoProjectPublicKeyOption
   * @typedef {MapeoProjectOptionsBase & { projectPublicKey: never, projectKeyPair: KeyPair }} MapeoProjectKeyPairOption
   * @typedef {MapeoProjectPublicKeyOption | MapeoProjectKeyPairOption} MapeoProjectOptions
   */

  /**
   * @param {MapeoProjectOptions} options
   */
  constructor(options) {
    this.storage = options.storage
    this.#rootKey = options.rootKey
    this.#keyManager = new KeyManager(this.#rootKey)
    this.#identityKeyPair = options.identityKeyPair

    // Internal sqlite wrapper
    this.#sqlite = new Sqlite(options.sqliteFilepath)

    // Access to the sqlite database
    this.#sqliteDatabase = this.#sqlite.db

    if (options.projectPublicKey) {
      this.#projectPublicKey = options.projectPublicKey
    } else if (options.projectKeyPair) {
      this.#projectPublicKey = options.projectKeyPair.publicKey
      this.#projectSecretKey = options.projectKeyPair.secretKey
    } else {
      throw new Error('Must provide either projectPublicKey or projectKeyPair')
    }

    this.#discovery = new Discovery({
      identityKeyPair: this.#identityKeyPair,
      mdns: options.mdns,
      dht: options.dht,
    })

    this.#coreManager = new CoreManager({
      keyManager: this.#keyManager,
      storage: this.storage,
      db: this.#sqliteDatabase,
      projectKey: this.#projectPublicKey,
      projectSecretKey: this.#projectSecretKey,
    })

    this.#authstore = new AuthStore({
      identityKeyPair: this.#identityKeyPair,
      projectPublicKey: this.#projectPublicKey, // TODO: handle pubkey vs keypair in authstore like MapeoProjectOptions
      keyPair: options.projectKeyPair,
      corestore: this.#corestore, // TODO: replace with coreManager
      sqlite: this.#sqlite,
    })

    this.#datastore = new DataStore({
      dataTypes: [{ // TODO: replace with real schemas
        name: 'observation',
        schema: {},
        blockPrefix: 'o',
        extraColumns: ''
      }],
      identityPublicKey: this.#identityKeyPair.publicKey,
      keyPair: options.projectKeyPair,
      corestore: this.#corestore, // TODO: replace with coreManager
      sqlite: this.#sqlite,
    })
  }

  async ready() {
    await this.#authstore.ready()
  }

  async close() {
    await this.#authstore.close()
  }
}
