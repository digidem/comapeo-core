import { randomBytes } from 'crypto'
import { encode, decode, getJsonSchema, getSchemaPrefix } from 'mapeo-schema'

import {
  getBlockPrefix,
  idToKey,
  keyToId,
  parseVersion,
  parseSqlResponse,
} from '../utils.js'
import { Indexer } from './indexer/index.js'

/**
 * @callback EncodeDataType
 * @param {Doc} doc
 * @returns {Block}
 */

/**
 * @callback DecodeDataType
 * @param {Block} block
 * @returns {Doc}
 */

/**
 * The DataType class provides methods for managing a single type of data.
 */
export class DataType {
  #coreManager
  #sqlite
  #indexer
  #writer
  #writerId
  #encode
  #decode

  /**
   * @param {Object} options
   * @param {String} options.name the name of the data type used as sqlite table name
   * @param {import('../core-manager/core-index.js').Namespace} options.namespace the namespace this data type belongs to
   * @param {String} options.schemaType the name of the schema
   * @param {Number} options.schemaVersion the version of the schema
   * @param {String} options.extraColumns the extra columns to add to the sqlite table
   * @param {Buffer} options.identityPublicKey the public key of the identity
   * @param {import('hypercore')} options.core the local writer hypercore
   * @param {import('../core-manager/index.js').CoreManager} options.coreManager an instance of the CoreManager class
   * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   * @param {import('./indexer/index.js').Indexer} [options.indexer] an instance of the [Indexer](../indexer/) class
   * @param {EncodeDataType} [options.encode] a function to encode the data type
   * @param {DecodeDataType} [options.decode] a function to decode the data type
   */
  constructor(options) {
    this.name = options.name
    this.namespace = options.namespace
    this.#coreManager = options.coreManager
    this.#sqlite = options.sqlite

    const { dataTypeId } = getSchemaPrefix(options.schemaType)

    this.#indexer =
      options.indexer ||
      new Indexer({
        name: this.name,
        sqlite: options.sqlite,
        extraColumns: options.extraColumns,
      })

    this.#writer = options.core
    this.identityPublicKey = options.identityPublicKey
    this.identityId = keyToId(options.identityPublicKey)
    this.#encode = options.encode ? options.encode : encode
    this.#decode = options.decode ? options.decode : decode
    this.schemaType = options.schemaType
    this.schemaVersion = options.schemaVersion
    this.dataTypeId = dataTypeId
    this.jsonSchema = getJsonSchema({
      schemaType: this.schemaType,
      schemaVersion: this.schemaVersion,
    })
  }

  /**
   * Wait for the corestore and writer hypercore to be ready
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#writer.ready()
    this.#writerId = keyToId(this.#writer.key)
  }

  /**
   * @param {Doc} doc
   * @returns {Block}
   */
  encode(doc) {
    return this.#encode(doc)
  }

  /**
   * @param {Block} block
   * @returns {Doc}
   */
  decode(block, { coreId, blockIndex }) {
    return this.#decode(block, { coreId, seq: blockIndex })
  }

  get key() {
    return this.#writer.key
  }

  get keys() {
    return this.cores.map((core) => {
      return core.key.toString('hex')
    })
  }

  get core() {
    return this.#writer
  }

  get cores() {
    return this.#coreManager.getCores(this.namespace).map((coreRecord) => {
      return coreRecord.core
    })
  }

  async info({ writerOnly = false } = {}) {
    if (writerOnly) {
      return this.#writer.info()
    }

    return Promise.all(
      this.cores.map(async (core) => {
        return core.info()
      })
    )
  }

  /**
   * @param {PublicKey} coreKey
   * @returns {import('hypercore') | undefined}
   */
  getCore(coreKey) {
    return this.#coreManager.getCoreByKey(coreKey)
  }

  /**
   * Get a doc by id
   * @param {String} id
   * @returns {Doc}
   */
  getById(id) {
    return this.#sqlite.get(`select * from ${this.name} where id = '${id}'`)
  }

  /**
   * Get a doc by version
   * @param {String} version
   * @returns {Promise<Doc|undefined>}
   */
  async getByVersion(version) {
    const { coreId, blockIndex } = parseVersion(version)
    const core = this.getCore(idToKey(coreId))

    if (core) {
      return /** @type {Promise<Doc|undefined>} */ (core.get(blockIndex))
    }
  }

  /**
   * Get a doc by version
   * @param {String} version
   * @returns {Promise<Block|undefined>}
   */
  async getBlockByVersion(version) {
    const { coreId, blockIndex } = parseVersion(version)
    const core = this.getCore(idToKey(coreId))
    if (core) {
      return /** @type {Promise<Block|undefined>} */ (core.get(blockIndex))
    }
  }

  /**
   * Put a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async #put(data) {
    const created = data.created || new Date().getTime()

    const doc = Object.assign({}, data, {
      id: data.id || randomBytes(8).toString('hex'),
      version: `${this.#writerId}/${this.#writer.length}`,
      authorId: this.identityId,
      created,
      timestamp: created,
      schemaType: this.schemaType,
      schemaVersion: this.schemaVersion,
    })

    if (!doc.links) {
      doc.links = []
    }

    const encodedDoc = this.encode(doc)

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    await this.#writer.append(encodedDoc)
    const indexedDoc = await indexing
    return parseSqlResponse(indexedDoc)
  }

  /**
   * Create a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async create(data) {
    return this.#put(data)
  }

  /**
   * Update a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async update(data) {
    const doc = Object.assign({}, data, {
      updated: new Date().getTime(),
    })

    await this.#shouldUpdate(doc)
    return this.#put(doc)
  }

  /**
   * Check if a doc should be updated
   * @param {Doc} doc
   * @throws {Error} if the doc should not be updated
   * @returns {Promise<void>}
   */
  async #shouldUpdate(doc) {
    const { id, links } = doc

    if (!id) {
      throw new Error('Cannot update a doc without an id')
    }

    if (!links || !links.length) {
      throw new Error(
        'Cannot update a doc without a link to the previous version'
      )
    }

    for (const version of links) {
      const block = await this.getBlockByVersion(version)

      if (!block) {
        throw new Error(`Block not found for version ${version}`)
      }

      if (!this.isType(block)) {
        throw new Error(
          `Block with version ${version} is not of type ${this.name}`
        )
      }
    }
  }

  /**
   * Check if a block is of this DataType
   * @param {Block} block
   * @returns {boolean}
   */
  isType(block) {
    const { dataTypeId, schemaVersion } = getBlockPrefix(block)
    return (
      dataTypeId === this.dataTypeId && schemaVersion === this.schemaVersion
    )
  }

  /**
   * Index an array of blocks
   * @param {Block[]} blocks
   * @returns {Doc[]}
   */
  index(entries) {
    const docs = entries.map((entry) => {
      const { block, index, key } = entry
      return this.decode(block, { blockIndex: index, coreId: key })
    })

    this.#indexer.batch(docs)
    return docs
  }

  /**
   * Query indexed docs
   * @param {string} sql sql statement
   * @param {any[]} params
   * @returns {Doc[]}
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }

  /**
   * Create a read stream of blocks from the local writer hypercore
   * @param {Object} [options]
   * @return {import('streamx').Readable}
   */
  createReadStream(options) {
    return this.#writer.createReadStream(options)
  }
}
