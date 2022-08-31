import MultiCoreIndexer from 'multi-core-indexer'
import SqliteIndexer from '@mapeo/sqlite-indexer'
import AJV from 'ajv'
import b4a from 'b4a'
import ram from 'random-access-memory'
import { randomBytes } from 'crypto'

export class Mapeo {
  #indexers = new Map()
  #multiCoreIndexer
  #corestore
  #dataTypes

  constructor (options) {
    const { corestore, dataTypes, sqlite } = options
    this.#corestore = corestore
    this.#dataTypes = dataTypes

    for (const dataType of dataTypes) {
      const indexer = new Indexer({ dataType, sqlite })
      this.#indexers.set(dataType.name, indexer)
      this[dataType.name] = new DataStore({ dataType, corestore, indexer })
    }

    this.#multiCoreIndexer = new MultiCoreIndexer(this.cores, {
      storage: (key) => {
        return new ram(key)
      },
      batch: (entries) => {
        for (const entry of entries) {
          const { block } = entry
          const dataType = this.getDataType(block)
          if (!dataType) continue
          const doc = dataType.decode(block)
          const indexer = this.#indexers.get(dataType.name)

          // TODO: replace with real schema
          doc.properties = JSON.stringify(doc.properties)
          indexer.batch(doc)
        }
      }
    })
  }

  get cores () {
    return [...this.#corestore.cores.values()]
  }

  getDataType (block) {
    const typeHex = b4a.toString(block, 'utf-8', 0, 4)
    return this.#dataTypes.find((dataType) => {
      return dataType.blockPrefix === typeHex
    })
  }
}

export class DataType {
  #encode = function defaultEncode (obj) {
    const block = this.blockPrefix + JSON.stringify(obj)
    return b4a.from(block)
  }

  #decode = function defaultDecode (block) {
    const blockPrefix = b4a.toString(block, 'utf-8', 0, 4)

    if (blockPrefix !== this.blockPrefix) {
      throw new Error(`DataType with hex identifier ${blockPrefix} found, expected ${this.blockPrefix}`)
    }

    return JSON.parse(b4a.toString(block, 'utf-8', 4))
  }

  #validate

  constructor ({ name, blockPrefix, schema, encode, decode }) {
    this.name = name
    this.blockPrefix = blockPrefix
    this.schema = schema
    this.ajv = new AJV()
    this.#validate = this.ajv.compile(this.schema)

    if (encode) {
      this.#encode = encode
    }

    if (decode) {
      this.#decode = decode
    }
  }

  validate (doc) {
    return this.#validate(doc)
  }

  encode (doc) {
    return this.#encode(doc)
  }

  decode (block) {
    return this.#decode(block)
  }
}

class DataStore {
  #dataType
  #corestore
  #indexer

  constructor({ dataType, corestore, indexer }) {
    this.#dataType = dataType
    this.#corestore = corestore
    this.#indexer = indexer
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

  async create (data) {
    const writer = this.#corestore.get({ name: 'writer' })
    await writer.ready()

    const doc = {
      id: data.id || randomBytes(8).toString('hex'),
      version: `${writer.key.toString('hex')}@${writer.length}`,
      timestamp: new Date().toISOString(),
      properties: data.properties,
      links: data.links || []
    }

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    const encodedDoc = this.encode(doc)
    await writer.append(encodedDoc)
    await indexing
    return doc
  }

  getById (id) {
    return this.#indexer.get(`SELECT * from ${this.#indexer.name} where id = :id`, { id })
  }

  getByVersion (version) {
    return this.#indexer.get(`SELECT * from ${this.#indexer.name} where version = :version`, { version })
  }

  async update (data) {
    const writer = this.#corestore.get({ name: 'writer' })
    await writer.ready()

    const doc = Object.assign({}, data, {
      version: `${writer.key.toString('hex')}@${writer.length}`
    })

    const indexing = new Promise((resolve) => {
      this.#indexer.onceWriteDoc(doc.version, (doc) => {
        resolve(doc)
      })
    })

    const encodedDoc = this.encode(doc)
    await writer.append(encodedDoc)
    await indexing
    return doc
  }

  list ({ limit = 10, offset = 0, where }) {
    let statement = `SELECT * from ${this.#indexer.name} LIMIT ${limit} OFFSET ${offset}`

    if (where) {
      statement += ` WHERE ${where}`
    }

    return this.#indexer.list(statement)
  }

  async versions () {

  }

  query (statement) {
    return this.indexer.query(statement)
  }
}

class Indexer {
  #sqlite

  constructor({ dataType, sqlite, extraColumns }) {
    this.name = dataType.name
    this.#sqlite = sqlite
    this.extraColumns = extraColumns

    this.#sqlite.pragma('journal_mode = wal')

    this.#sqlite
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.name}
			(
				id TEXT PRIMARY KEY NOT NULL,
				version TEXT NOT NULL,
        properties TEXT NOT NULL,
				links TEXT,
				forks TEXT
				${this.extraColumns ? ', ' + this.extraColumns : ''}
			)
			WITHOUT ROWID`
      )
      .run()

    this.#sqlite
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${this.name}_backlinks
			(version TEXT PRIMARY KEY NOT NULL)
			WITHOUT ROWID`
      )
      .run()

    this.sqliteIndexer = new SqliteIndexer(this.#sqlite, {
      docTableName: this.name,
      backlinkTableName: `${this.name}_backlinks`,
      extraColumns: this.extraColumns,
    })
  }

  onceWriteDoc (version, listener) {
    this.sqliteIndexer.onceWriteDoc(version, listener)
  }

  batch (entries) {
    const docs = Array.isArray(entries) ? entries : [entries]
    this.sqliteIndexer.batch(docs)
  }

  get (statement, data) {
    return this.#sqlite.prepare(statement).get(data)
  }

  list (statement) {
    return this.#sqlite.prepare(statement).all()
  }
}
