import Corestore from 'corestore'
import MultiCoreIndexer from 'multi-core-indexer'
import AJV from 'ajv'
import b4a from 'b4a'

class Mapeo {
  #indexers = new Map()
  #multiCoreIndexer
  #corestore
  #dataTypes

  constructor (options) {
    const { corestore, dataTypes } = options
    this.#corestore = corestore
    this.#dataTypes = dataTypes

    for (const dataType of dataTypes) {
      const indexer = new Indexer(dataType)
      this.#indexers.set(dataType.name, indexer)
      this[dataType.name] = new Datastore({ dataType, corestore, indexer })
    }

    this.#multiCoreIndexer = new MultiCoreIndexer(corestore.cores, {
      batch: (entries) => {
        for (const entry of entries) {
          const { block } = entry
          const dataType = this.getDataType(block)
          if (!dataType) continue
          const doc = dataType.decode(block)
          const indexer = this.#indexers.get(dataType.name)
          indexer.append(doc)
        }
      }
    })
  }

  getDataType (block) {
    const typeHex = b4a.toString(block, 'utf-8', 0, 3)
    return this.#dataTypes.find((dataType) => {
      return dataType.magicString === typeHex
    })
  }
}

class DataType {
  #encode = function defaultEncode (obj) {
    const block = this.magicString + JSON.stringify(obj)
    return b4a.from(block)
  }
  #decode = function defaultDecode (block) {
    const magicString = b4a.toString(block, 'utf-8', 0, 3)

    if (magicString !== this.magicString) {
      throw new Error(`DataType with hex identifier ${magicString} found, expected ${this.magicString}`)
    }

    return JSON.parse(b4a.toString(block, 'utf-8', 4))
  }
  #validate

  constructor ({ name, magicString, schema, encode, decode }) {
    this.name = name
    this.magicString = magicString
    this.schema = schema
    this.#encode = encode
    this.#decode = decode
    this.ajv = new AJV()
    this.#validate = this.ajv.compile(this.schema)
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

  async create (doc) {
    const writer = this.#corestore.get({ name: 'writer' })

    const result = await writer.append()
  }

  async read () {

  }

  async update () {

  }

  async list () {

  }

  async versions () {

  }

  query (statement) {
    return this.indexer.query(statement)
  }
}

class Indexer {
  #sqlite

  constructor({ name, cores, sqlite, extraColumns }) {
    this.name = name
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

  batch (entries) {
    const docs = Array.isArray(entries) ? entries : [entries]
    this.sqliteIndexer.batch(docs)
  }

  query (statement) {
    return this.sqlite.prepare(statement).all()
  }
}

const corestore = new Corestore(ram)

const observation = new DataType({
  name: 'observation',
  magicString: '6f62', // could make this automatically set based on the name, but that might be too magic
  schema: {},
  encode: (doc) => {
    return JSON.stringify(doc)
  },
  decode: (block) => {
    return JSON.parse(block)
  }
})

const mapeo = new Mapeo({
  corestore,
  dataTypes: [
    observation
  ]
})

const doc = await mapeo.observation.create({

})
