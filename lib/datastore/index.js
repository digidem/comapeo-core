import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'
import b4a from 'b4a'
import sodium from 'sodium-universal'

import { DataType } from '../datatype/index.js'
import { idToKey, keyToId } from '../utils.js'

export class DataStore {
  #corestore
  #sqlite
  #indexer
  #keyPair
  #writer
  #identityPublicKey
  #dataTypes = new Map()

  constructor(options) {
    const { identityPublicKey, keyPair, dataTypes, corestore, sqlite } = options

    this.#identityPublicKey = identityPublicKey
    this.#keyPair = keyPair
    this.#corestore = corestore
    this.#sqlite = sqlite

    if (dataTypes && dataTypes.length) {
      for (const dataType of dataTypes) {
        this.#dataTypes.set(dataType.name, dataType)
      }
    }

    this.#indexer = new MultiCoreIndexer(this.cores, {
      storage: (key) => {
        return new ram(key)
      },
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

  get localCore() {
    return this.#writer
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  get dataTypes() {
    return [...this.#dataTypes.values()]
  }

  async ready() {
    await this.#corestore.ready()
    const secretKey = this.#keyPair.secretKey
    const publicKey = this.#keyPair.publicKey

    this.#writer = this.#corestore.get({
      keyPair: this.#keyPair,
      sparse: false,
      auth: {
        sign(signable) {
          const signature = b4a.alloc(sodium.crypto_sign_BYTES)
          sodium.crypto_sign_detached(signature, signable, secretKey)
          return signature
        },
        verify(signable, signature) {
          return sodium.crypto_sign_verify_detached(
            signature,
            signable,
            publicKey
          )
        },
      },
    })

    await this.#writer.ready()
    await this.#indexer.addCore(this.#writer)
  }

  dataType(options) {
    if (this.#dataTypes.has(options.name)) {
      return this.#dataTypes.get(options.name)
    }

    const { name, schema, extraColumns, blockPrefix } = options

    const dataType = new DataType({
      name,
      schema,
      blockPrefix,
      identityPublicKey: this.#identityPublicKey,
      corestore: this.#corestore,
      core: this.#writer,
      keyPair: options.keyPair || this.#keyPair,
      sqlite: this.#sqlite,
      extraColumns,
    })

    this.#dataTypes.set(name, dataType)

    for (const core of dataType.cores) {
      this.#indexer.addCore(dataType.core)
    }

    return dataType
  }

  getDataTypeForBlock(block) {
    return this.dataTypes.find((dataType) => {
      return dataType.isType(block)
    })
  }

  async create(dataTypeName, options) {
    if (!this.#dataTypes.has(dataTypeName)) {
      throw new Error(`Data type ${dataTypeName} not found`)
    }

    const dataType = this.#dataTypes.get(dataTypeName)
    return dataType.create(options)
  }

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
  indexing() {
    return new Promise((resolve) => {
      let timeoutId

      const onIdle = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          this.#indexer.off('idle', onIdle)
          this.#indexer.off('indexing', onIndexing)
          resolve()
        }, 100)
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

  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }

  createReadStream() {
    return this.#writer.createReadStream(...arguments)
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

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

  async close() {
    await this.#corestore.close()
    this.#sqlite.close()
  }
}
