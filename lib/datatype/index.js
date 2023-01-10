import b4a from 'b4a'
import { randomBytes } from 'crypto'

import { getBlockPrefix, idToKey, keyToId, parseVersion } from '../utils.js'
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
  #corestore
  #sqlite
  #indexer
  #writer

  /** @type {EncodeDataType} */
  #encode = function defaultEncode(obj) {
    const block = this.blockPrefix + JSON.stringify(obj)
    return b4a.from(block)
  }

  /** @type {DecodeDataType} */
  #decode = function defaultDecode(block) {
    const blockPrefix = getBlockPrefix(block)

    if (blockPrefix !== this.blockPrefix) {
      throw new Error(
        `Data processed by ${this.name} DataType with blockPrefix ${blockPrefix} found, expected ${this.blockPrefix}`
      )
    }

    return JSON.parse(b4a.toString(block, 'utf8', 1))
  }

  /**
   * @param {Object} options
   * @param {String} options.name the name of the data type used as sqlite table name
   * @param {String} options.blockPrefix the prefix used to identify the data type
   * @param {Object} options.schema the schema used to validate the data type
   * @param {String} options.extraColumns the extra columns to add to the sqlite table
   * @param {Buffer} options.identityPublicKey the public key of the identity
   * @param {import('hypercore')} options.core the local writer hypercore
   * @param {import('corestore')} options.corestore an instance of the [Corestore](https://npmjs.com/corestore) class
   * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   * @param {import('./indexer/index.js').Indexer} [options.indexer] an instance of the [Indexer](../indexer/) class
   * @param {EncodeDataType} [options.encode] a function to encode the data type
   * @param {DecodeDataType} [options.decode] a function to decode the data type
   */
  constructor(options) {
    const {
      name,
      identityPublicKey,
      core,
      schema,
      blockPrefix,
      corestore,
      indexer,
      sqlite,
      extraColumns,
      encode,
      decode,
    } = options
    this.name = name
    this.blockPrefix = blockPrefix
    this.schema = schema
    this.#corestore = corestore
    this.#sqlite = sqlite

    this.#indexer =
      indexer ||
      new Indexer({
        name: this.name,
        sqlite,
        extraColumns,
      })

    this.#writer = core
    this.identityPublicKey = identityPublicKey
    this.identityId = keyToId(identityPublicKey)

    if (encode) {
      this.#encode = encode
    }

    if (decode) {
      this.#decode = decode
    }
  }

  /**
   * Wait for the corestore and writer hypercore to be ready
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#corestore.ready()
    await this.#writer.ready()
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
  decode(block) {
    return this.#decode(block)
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
    return [...this.#corestore.cores.values()]
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
   * @returns {import('hypercore')|undefined}
   */
  getCore(coreKey) {
    return this.cores.find((core) => core.key.equals(coreKey))
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
    await this.#writer.ready()

    const created = data.created || new Date().getTime()
    const doc = Object.assign({}, data, {
      id: data.id || randomBytes(8).toString('hex'),
      authorId: this.identityId,
      // TODO: remove the version property when integrating mapeo-schema
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`,
      created,
      timestamp: created,
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
    await indexing
    return doc
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
    return getBlockPrefix(block) === this.blockPrefix
  }

  /**
   * Index an array of blocks
   * @param {Block[]} blocks
   * @returns {void}
   */
  index(blocks) {
    const docs = blocks.map((block) => {
      return this.decode(block)
    })

    this.#indexer.batch(docs)
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
