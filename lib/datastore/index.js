import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'

import { DataType } from '../datatype/index.js'
import { idToKey, keyToId } from '../utils.js'

export class Datastore {
  #coreManager
  #sqlite
  #indexer
  #identityPublicKey
  #dataTypesOptions
  #dataTypes = new Map()

  /** @type {import('hypercore')} */
  #writer

  /**
   * @param {Object} options
   * @param {Buffer} options.identityPublicKey the public key of the identity
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager
   * @param {DataTypeOptions[]} options.dataTypes
   * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   * @param {'auth'|'data'} options.namespace
   */
  constructor(options) {
    const {
      identityPublicKey,
      coreManager,
      sqlite,
      dataTypes,
      namespace,
    } = options

    this.#identityPublicKey = identityPublicKey
    this.#coreManager = coreManager
    this.#sqlite = sqlite
    this.#dataTypesOptions = dataTypes
    this.namespace = namespace
  }

  get keys() {
    return this.cores.map((core) => {
      return core.key
    })
  }

  get cores() {
    return this.#coreManager.getCores(this.namespace).map((coreRecord) => {
      return coreRecord.core
    })
  }

  get dataTypes() {
    return [...this.#dataTypes.values()]
  }

  async ready() {
    const { core } = this.#coreManager.getWriterCore(this.namespace)
    this.#writer = core

    await this.#writer.ready()

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

          if (!dataType) {
            continue
          }

          dataType.index([entry])
        }
      },
    })

    this.#coreManager.on('add-core', async ({ core }) => {
      await core.ready()
      this.#indexer.addCore(core)
    })

    for (const options of this.#dataTypesOptions) {
      const datatype = this.#dataType(options)
      await datatype.ready()
    }
  }

  /**
   * @typedef {Object} DataTypeOptions
   * @property {String} name
   * @property {Object} schema
   * @property {String} blockPrefix
   * @property {String} extraColumns
   */

  /**
   * Create a new DataType in the Datastore
   * @param {DataTypeOptions} options
   * @returns {DataType}
   */
  #dataType(options) {
    if (this.#dataTypes.has(options.name)) {
      return this.#dataTypes.get(options.name)
    }

    const { name, schemaType, schemaVersion, extraColumns } = options

    const dataType = new DataType({
      name,
      namespace: this.namespace,
      identityPublicKey: this.#identityPublicKey,
      core: this.#writer,
      schemaType,
      schemaVersion,
      coreManager: this.#coreManager,
      sqlite: this.#sqlite,
      extraColumns,
    })

    this.#dataTypes.set(name, dataType)
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

  /**
   * @param {String} dataTypeName
   * @param {String} id
   * @returns {Doc}
   * @throws {Error}
   */
  getById(dataTypeName, id) {
    const dataType = this.getDataType(dataTypeName)
    return dataType.getById(id)
  }

  createReadStream() {
    return this.#writer.createReadStream(...arguments)
  }

  /**
   * Get a core by key
   * @param {PublicKey|String} coreKey
   * @returns {Promise<import('hypercore')>}
   */
  async getCore(coreKey) {
    const key = idToKey(coreKey)

    if (keyToId(key) === keyToId(this.#writer.key)) {
      return this.#writer
    }

    const { core } = this.#coreManager.addCore(key, this.namespace)
    await core.ready()
    return core
  }
}
