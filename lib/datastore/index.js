import { randomBytes } from "crypto"

export class DataStore {
  #dataType
  #corestore
  #indexer
  #writer
  #appendLock

  constructor({ dataType, corestore, indexer }) {
    this.#dataType = dataType
    this.#corestore = corestore
    this.#indexer = indexer
    this.#writer = this.#corestore.get({ name: 'writer' })
  }

  async ready () {
    await this.#writer.ready()
    await this.#corestore.ready()
  }

  validate (doc) {
    return this.#dataType.validate(doc)
  }

  encode (doc) {
    return this.#dataType.encode(doc)
  }

  decode (block) {
    return this.#dataType.decode(block)
  }

  getById (id) {
    return this.#indexer.get(`SELECT * from ${this.#indexer.name} where id = :id`, { id })
  }

  async create (data) {
    const doc = {
      id: data.id || randomBytes(8).toString('hex'),
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`,
      timestamp: new Date().toISOString(),
      properties: data.properties,
      links: data.links || []
    }

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

  async update (data) {
    const doc = Object.assign({}, data, {
      version: `${this.#writer.key.toString('hex')}@${this.#writer.length}`
    })

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    const encodedDoc = this.encode(doc)
    await this.#writer.append(encodedDoc)
    await indexing
    return doc
  }

  query (where) {
    return this.#indexer.query(where)
  }
}
