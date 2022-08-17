import Corestore from 'corestore'
import Sqlite from 'better-sqlite3'
import { KeyManager } from '@mapeo/crypto'
import ram from 'random-access-memory'
import { Project } from './lib/project.js'
import { getDiscoveryKey } from './lib/utils.js'

export class Mapeo {
  #projects = new Map()

  /**
   * @param {Object} options
   * @param {Buffer} options.rootKey
   */
  constructor(options) {
    const { rootKey } = options
    this.rootKey = rootKey
    this.keyManager = new KeyManager(rootKey)
    this.identityKeyPair = this.keyManager.getIdentityKeypair()
    this.corestore = new Corestore(ram)
    this.sqlite = new Sqlite(':memory:')
  }

  /**
   * @param {Object} options
   * @param {string} options.name
   * @param {PublicKey} options.key
   * @returns {Promise<Project>}
   */
  async project(options) {
    const { name, key } = options

    if (name && this.#projects.has(name)) {
      return this.#projects.get(name)
    }

    const project = new Project({
      name,
      key,
      corestore: this.corestore,
      keyPair: this.createKeyPair(name),
      sqlite: this.sqlite,
      createKeyPair: this.createKeyPair.bind(this),
    })

    await project.ready()
    this.#projects.set(name, project)
    return project
  }

  /**
   * @param {string} name
   * @returns {KeyPair}
   */
  createKeyPair(name) {
    return this.keyManager.getHypercoreKeypair(name)
  }

  static createRootKey() {
    return KeyManager.generateRootKey()
  }

  static getDiscoveryKey(key) {
    return getDiscoveryKey(key)
  }

  async close() {}
}
