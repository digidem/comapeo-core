import { randomBytes } from 'crypto'

/**
 * The DataStore class provides methods for managing a single type of data.
 */
export class DataStore {
  #dataType
  #corestore
  #indexer
  #writer

  /**
   * @param {Object} options
   * @param {import('../datatype/index.js').DataType} options.dataType an instance of the [DataType](../datatype/) class
   * @param {Corestore} options.corestore an instance of the [Corestore](https://npmjs.com/corestore) class
   * @param {import('../indexer/index.js').Indexer} options.indexer an instance of the [Indexer](../indexer/) class
   */
  constructor({ dataType, corestore, indexer }) {
    this.#dataType = dataType
    this.#corestore = corestore
    this.#indexer = indexer
    this.#writer = this.#corestore.get({ name: 'writer' })
  }

  /**
   * Wait for the corestore and writer hypercore to be ready
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#writer.ready()
    await this.#corestore.ready()
  }

  /**
   * Validate a doc
   * @param {Doc} doc
   * @returns {Boolean}
   * @throws {Error}
   */
  validate(doc) {
    return this.#dataType.validate(doc)
  }

  /**
   * Encode a doc (an object), to a block (a Buffer)
   * @param {Doc} doc
   * @returns {Block}
   */
  encode(doc) {
    return this.#dataType.encode(doc)
  }

  /**
   * Decode a block (a Buffer), to a doc (an object)
   * @param {Block} block
   * @returns {Doc}
   */
  decode(block) {
    return this.#dataType.decode(block)
  }

  /**
   * Get a doc by id
   * @param {string} id
   * @returns {Doc}
   */
  getById(id) {
    return this.#indexer.get(
      `SELECT * from ${this.#indexer.name} where id = :id`,
      { id }
    )
  }

  /**
   * Create a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async create(data) {
    const doc = Object.assign(data, {
      id: data.id || randomBytes(8).toString('hex'),
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`,
      created_at: new Date().getTime(),
    })

    if (!doc.links) {
      doc.links = []
    }

    this.validate(doc)
    const encodedDoc = this.encode(doc)
    await this.#writer.append(encodedDoc)

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    await indexing
    return doc
  }

  /**
   * Update a doc
   * @param {Doc} data
   * @returns {Promise<Doc>}
   */
  async update(data) {
    const doc = Object.assign({}, data, {
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`,
      updated_at: new Date().getTime(),
    })

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    this.validate(doc)
    const encodedDoc = this.encode(doc)
    await this.#writer.append(encodedDoc)
    await indexing
    return doc
  }

  /**
   * Query indexed docs
   * @param {string} where sql where clause
   * @returns {Doc[]}
   */
  query(where) {
    return this.#indexer.query(where)
  }
}
