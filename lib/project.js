import { Datastore } from './datastore.js'

export class Project {
  #corestore
  #sqlite
  #keyPair
  #projectCore
  #datastores = new Map()
  #datastoresByKey = new Map()
  #createKeyPair
  #projectKeysExtension
  #requestProjectKeysExtension

  /**
   * @param {object} options
   * @param {string} options.name
   * @param {Object<string, any>} options.corestore - corestore instance
   * @param {Object<string, any>} options.sqlite - sqlite instance
   * @param {KeyPair} options.keyPair - key pair
   * @param {Function} options.createKeyPair - create key pair function
   */
  constructor({ name, key, corestore, keyPair, sqlite, createKeyPair }) {
    this.name = name
    this.#corestore = corestore.namespace(name)
    this.#sqlite = sqlite

    if (!key && !keyPair) {
      throw new Error('key or keyPair is required')
    }

    if (key) {
      this.key = typeof key === 'string' ? Buffer.from(key, 'hex') : key
    }

    this.#keyPair = keyPair
    this.#createKeyPair = createKeyPair
  }

  async _initProjectCore() {
    // TODO: replace/augment projectCore with capabilities core
    if (this.key) {
      this.#projectCore = await this.#corestore.get({
        key: this.key,
        valueEncoding: 'json',
      })
      await this.#projectCore.ready()
    } else {
      this.#projectCore = this.#corestore.get({
        name: this.name,
        valueEncoding: 'json',
      })

      await this.#projectCore.ready()

      if (this.#projectCore.length === 0) {
        await this.#projectCore.append({
          type: 'project',
          name: this.name,
        })
      }

      this.key = this.#projectCore.key
      this.discoveryKey = this.#projectCore.discoveryKey
    }
  }

  async ready() {
    await this.#corestore.ready()
    await this._initProjectCore()
    this._setExtensions()
  }

  _setExtensions() {
    this.#projectKeysExtension = this.#projectCore.registerExtension(
      'projectKeys',
      {
        encoding: 'json',
        onmessage: async (config) => {
          this._updateDatastores(config)
        },
      }
    )

    this.#requestProjectKeysExtension = this.#projectCore.registerExtension(
      'requestProjectKeys',
      {
        encoding: 'json',
        onmessage: async (message, peer) => {
          const keys = await this._getProjectKeys()
          if (Object.keys(keys).length > 0) {
            this.#projectKeysExtension.send(keys, peer)
          }
        },
      }
    )
  }

  async _getDatastoreConfig() {
    const config = []

    for (const datastore of this.#datastoresByKey.values()) {
      await datastore.ready()

      config.push({
        name: datastore.name,
        key: datastore.key,
        schema: datastore.schema,
        keys: datastore.keys,
      })
    }

    return config
  }

  async _updateDatastores(config) {
    for (const datastoreConfig of config) {
      const datastore = await this.data({
        name: datastoreConfig.name,
        schema: datastoreConfig.schema,
        keyPair: this.#createKeyPair(datastoreConfig.name),
      })

      for (const key of datastoreConfig.keys) {
        await datastore.addCore(key)
      }
    }
  }

  async sendProjectKeys(peer) {
    const keys = await this._getDatastoreConfig()
    return this.#projectKeysExtension.send(keys, peer)
  }

  requestProjectKeys(peer) {
    return this.#requestProjectKeysExtension.send({}, peer)
  }

  async data(options) {
    const { name, keyPair, schema } = options

    if (this.#datastores.has(name)) {
      return this.#datastores.get(name)
    }

    const datastore = new Datastore({
      name,
      corestore: this.#corestore,
      keyPair,
      schema,
      sqlite: this.#sqlite,
    })

    await datastore.ready()
    await datastore.writer()
    this.#datastores.set(name, datastore)
    this.#datastoresByKey.set(datastore.key, datastore)

    datastore.on('coreAdded', async () => {
      for (const peer of this.#projectCore.peers) {
        await this.sendProjectKeys(peer)
      }
    })

    return datastore
  }

  replicate(connection) {
    this.#projectCore.on('peer-add', async (peer) => {
      await this.sendProjectKeys(peer)
    })

    this.#corestore.replicate(connection)
  }

  get core() {
    return this.#projectCore
  }

  async close() {
    await this.#corestore.close()
  }
}
