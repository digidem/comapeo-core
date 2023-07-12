import * as path from 'path'
import Database from 'better-sqlite3'
import { KeyManager } from '@mapeo/crypto'

import { Authstore } from './lib/authstore'
import { CoreManager } from './lib/core-manager'
import { Sqlite } from './lib/sqlite'

export class Mapeo {
  #sqliteDatabase
  #keyManager
  #coreManager
  #authstore
  #sqlite

  #storageDirectory
  #sqliteFilepath
  #hypercoreDirectory

  /**
   *
   * @param {Object} options
   * @param {Buffer} options.rootKey
   * @param {String} options.storageDirectory
   * @param {Buffer} options.projectKey
   * @param {Buffer} options.projectSecretKey
   */
  constructor(options) {
    this.#storageDirectory = options.storageDirectory
    this.#sqliteFilepath = path.join(this.#storageDirectory, 'mapeo.sqlite')
    this.#hypercoreDirectory = path.join(this.#storageDirectory, 'hypercore')
    this.#sqliteDatabase = new Database(this.#sqliteFilepath)
    this.#sqlite = new Sqlite(this.#sqliteDatabase)
    this.#keyManager = new KeyManager(options.rootKey)

    this.identityKeyPair = this.#keyManager.getIdentityKeyPair()
    this.projectKeyPair = {
      publicKey: options.projectKey,
      secretKey: options.projectSecretKey,
    }

    this.#coreManager = new CoreManager({
      db: this.#sqliteDatabase,
      keyManager: this.#keyManager,
      projectKey: options.keyPair.publicKey,
      projectSecretKey: options.keyPair.secretKey,
      storage: options.storage,
    })

    this.auth = new Authstore({
      identityKeyPair: this.identityKeyPair,
      projectPublicKey: this.projectKeyPair.publicKey,
      sqlite: this.#sqlite,
      coreManager: this.#coreManager,
    })
  }
}
