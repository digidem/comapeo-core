import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'
import b4a from 'b4a'

import { DataType } from '../datatype/index.js'
import { idToKey, keyToId } from '../utils.js'

export class DataStore {
  #corestore
  #sqlite
  #indexer
  #identityPublicKey
  #dataTypesOptions
  #dataTypes = new Map()

  /** @type {KeyPair} */
  #keyPair

  /** @type {Core} */
  #writer

  /**
   * @param {Object} options
   * @param {Buffer} options.identityPublicKey the public key of the identity
   * @param {KeyPair} options.keyPair the local writer hypercore
   * @param {Corestore} options.corestore
   * @param {DataTypeOptions[]} options.dataTypes
   * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   */
  constructor(options) {
    const { identityPublicKey, keyPair, corestore, sqlite, dataTypes } = options

    this.#identityPublicKey = identityPublicKey
    this.#keyPair = keyPair
    this.#corestore = corestore
    this.#sqlite = sqlite
    this.#dataTypesOptions = dataTypes

    this.#indexer = new MultiCoreIndexer(this.cores, {
      /**
       * @param {String} key
       */
      storage: (key) => {
        return new ram(key)
      },
      /**
       * @param {Entry[]} entries
       */
      batch: (entries) => {
        for (const entry of entries) {
          const { block } = entry

          const dataType = this.getDataTypeForBlock(block)

          if (!dataType) continue

          dataType.index([block])
        }
      },
    })
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  get dataTypes() {
    return [...this.#dataTypes.values()]
  }

  async ready() {
    await this.#corestore.ready()

    this.#writer = this.#corestore.get({
      keyPair: this.#keyPair,
      sparse: false,
    })

    await this.#writer.ready()

    for (const options of this.#dataTypesOptions) {
      const datatype = this.#dataType(options)
      await datatype.ready()
    }

    await this.#indexer.addCore(this.#writer)
  }

  /**
   * @typedef {Object} DataTypeOptions
   * @property {String} name
   * @property {Object} schema
   * @property {String} blockPrefix
   * @property {String} extraColumns
   *
   * Create a new DataType in the DataStore
   * @param {DataTypeOptions} options
   * @returns {DataType}
   */
  #dataType(options) {
    if (this.#dataTypes.has(options.name)) {
      return this.#dataTypes.get(options.name)
    }

    const { name, schema, extraColumns, blockPrefix } = options

    const dataType = new DataType({
      name,
      identityPublicKey: this.#identityPublicKey,
      core: this.#writer,
      schema,
      blockPrefix,
      corestore: this.#corestore,
      sqlite: this.#sqlite,
      extraColumns,
    })

    this.#dataTypes.set(name, dataType)

    for (const core of dataType.cores) {
      core.on('ready', () => {
        if (!b4a.compare(core.key, this.#writer.key)) {
          this.#indexer.addCore(dataType.core)
        }
      })
    }

    return dataType
  }

  /**
   * @param {string} name
   * @returns {DataType}
   */
  getDataType(name) {
    return this.dataTypes.find((dataType) => {
      return dataType.name === name
    })
  }

  /**
   * @param {Block} block
   * @returns {DataType}
   */
  getDataTypeForBlock(block) {
    return this.dataTypes.find((dataType) => {
      return dataType.isType(block)
    })
  }

  /**
   * @param {string} dataTypeName
   * @param {Doc} data
   * @returns {Promise<Doc>}
   * @throws {Error}
   */
  async create(dataTypeName, data) {
    if (!this.#dataTypes.has(dataTypeName)) {
      throw new Error(`Data type ${dataTypeName} not found`)
    }

    const dataType = this.#dataTypes.get(dataTypeName)
    return dataType.create(data)
  }

  /**
   * @param {string} dataTypeName
   * @param {Doc} data
   * @returns {Promise<Doc>}
   * @throws {Error}
   */
  async update(dataTypeName, data) {
    if (!this.#dataTypes.has(dataTypeName)) {
      throw new Error(`Data type ${dataTypeName} not found`)
    }

    const dataType = this.#dataTypes.get(dataTypeName)
    return dataType.update(data)
  }

  /**
   * Wait for the indexer to finish available blocks
   * @returns {Promise<void>}
   */
  async indexing() {
    return new Promise((resolve) => {
      /** @type {ReturnType<setTimeout>} */
      let timeoutId

      const onIdle = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          this.#indexer.off('idle', onIdle)
          this.#indexer.off('indexing', onIndexing)
          resolve()
        }, 5)
      }

      if (this.#indexer.state.current === 'idle') {
        onIdle()
      }

      const onIndexing = () => {
        clearTimeout(timeoutId)
      }

      this.#indexer.on('idle', onIdle)
      this.#indexer.on('indexing', onIndexing)
    })
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Doc[]}
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }

  createReadStream() {
    return this.#writer.createReadStream(...arguments)
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

  /**
   * Get a core by key
   * @param {PublicKey|String} coreKey
   * @param {object} [options] options object passed to `corestore.get`
   * @returns {Promise<Core>}
   */
  async getCore(coreKey, options) {
    const key = idToKey(coreKey)

    if (keyToId(key) === keyToId(this.#writer.key)) {
      return this.#writer
    }

    const core = this.#corestore.get({ key, sparse: false, ...options })
    await core.ready()
    this.#indexer.addCore(core)
    return core
  }

  /**
   * Close the datastore
   * @returns {Promise<void>}
   */
  async close() {
    await this.#corestore.close()
    this.#sqlite.close()
  }
}
