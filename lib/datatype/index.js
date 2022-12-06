import b4a from 'b4a'
import { randomBytes } from 'crypto'
import sodium from 'sodium-universal'

import { getBlockPrefix } from '../utils.js'
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
  #keyPair
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
   * @param {Corestore} options.corestore an instance of the [Corestore](https://npmjs.com/corestore) class
   * @param {import('./indexer/index.js').Indexer} options.indexer an instance of the [Indexer](../indexer/) class
   */
  constructor(options) {
    const {
      name,
      identityPublicKey,
      core,
      keyPair,
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

    if (!core && !keyPair) {
      throw new Error('Either core or keyPair must be provided')
    }

    this.#indexer =
      indexer ||
      new Indexer({
        name: this.name,
        sqlite,
        extraColumns,
      })

    this.#writer = core
    this.#keyPair = keyPair
    this.identityPublicKeyString = (
      identityPublicKey || keyPair?.publicKey
    )?.toString('hex')

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

    if (!this.#writer) {
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
    }

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
   * Get a doc by id
   * @param {string} id
   * @returns {Doc}
   */
  getById(id) {
    return this.#sqlite.get(`select * from ${this.name} where id = '${id}'`)
  }

  /**
   * Put a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async put(data) {
    await this.#writer.ready()

    const created = data.created || new Date().getTime()
    const doc = Object.assign({}, data, {
      id: data.id || randomBytes(8).toString('hex'),
      authorId: this.identityPublicKeyString,
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`,
      created,
      timestamp: created,
    })

    if (!doc.links) {
      doc.links = []
    }

    if (!doc.links.length) {
      const existing = this.#sqlite.query(
        `select version from ${this.name} where id = '${doc.id}' ORDER BY timestamp`
      )

      if (existing) {
        doc.links = existing.map((row) => row.version)
      }
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
    return this.put(data)
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

    return this.put(doc)
  }

  isType(block) {
    return getBlockPrefix(block) === this.blockPrefix
  }

  index(blocks) {
    const docs = blocks.map((block) => {
      return this.decode(block)
    })

    this.#indexer.batch(docs)
  }

  /**
   * Query indexed docs
   * @param {string} [where] sql where clause
   * @returns {Doc[]}
   */
  query(where) {
    return this.#indexer.query(where)
  }

  createReadStream(options) {
    return this.#writer.createReadStream(options)
  }

  async close() {
    await this.#writer.close()
    await this.#corestore.close()
    await this.#sqlite.close()
  }
}
