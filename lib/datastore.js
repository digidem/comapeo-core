import { TypedEmitter } from 'tiny-typed-emitter'
import Ajv from 'ajv'
import randomBytes from 'randombytes'
import raf from 'random-access-file'
import { Indexer } from './indexer.js'

export class Datastore extends TypedEmitter {
  #corestore
  #sqlite
  #keyPair
  #coresByKey = new Map()

  /**
   * @param {object} options
   * @param {string} options.name
   * @param {KeyPair} options.keyPair
   * @param {object} options.schema
   * @param {Object<string, any>} options.corestore
   * @param {Object<string, any>} options.sqlite
   */
  constructor({ name, corestore, keyPair, sqlite, schema }) {
    super()
    this.name = name
    this.#keyPair = keyPair
    this.#corestore = corestore.namespace(`datastore/${name}`)
    this.#sqlite = sqlite
    this.ajv = new Ajv()
    this.schema = schema
    this.indexer = new Indexer(this.cores, {
      name,
      sqlite,
      storage: (key) => {
        return raf(`./${key}`)
      },
    })
  }

  get key() {
    return this.#keyPair.publicKey.toString('hex')
  }

  async ready() {
    await this.#corestore.ready()
    await this.indexer.ready()
  }

  async writer() {
    const core = this.#corestore.get({
      name: this.name,
      valueEncoding: 'json',
    })

    await this.addCore(core, { local: true })
    this.writerKey = core.key.toString('hex')
    return core
  }

  async isFromLocalWriter(doc) {
    if (!doc || !doc.version) {
      return // TODO: type error
    }

    const key = doc.version.split('@')
    const writer = await this.writer()
    console.log(
      'writer',
      writer.key.toString('hex'),
      key[0],
      writer.key.toString('hex') === key[0]
    )
    return writer.key.toString('hex') === key[0]
  }

  async download({ start = 0, end = -1 }) {
    for (const core of this.cores) {
      await core.download({ start, end })
    }
  }

  async validate(data) {
    const valid = this.ajv.validate(this.schema, data)
    if (!valid) {
      throw new Error(this.ajv.errorsText())
    }
    return valid
  }

  async put(data) {
    this.validate(data.properties)
    const core = await this.writer(this.name)
    await core.ready()

    const doc = {
      id: data.id || randomBytes(8).toString('hex'),
      version: `${core.key.toString('hex')}@${core.length}`,
      timestamp: new Date().toISOString(),
      properties: data.properties,
      links: data.links || [],
      forks: data.forks || [],
    }

    this.indexer.onceWriteDoc(doc.version, (doc) => {
      this.emit('docIndexed', doc)
    })

    await core.append(doc)
    this.indexer.batch([doc])
    return doc
  }

  /**
   * @param {string} statement
   */
  query(statement) {
    return this.#sqlite.prepare(statement).all()
  }

  get cores() {
    return Array.from(this.#coresByKey.values())
  }

  get keys() {
    return Array.from(this.#coresByKey.keys())
  }

  /**
   * @param {string|Object<string, any>} keyOrCore
   */
  async addCore(keyOrCore, { local = false } = {}) {
    let key
    let core

    if (typeof keyOrCore === 'string') {
      key = keyOrCore
      core = this.#corestore.get({ key: Buffer.from(key, 'hex') })
      await core.ready()
      await core.download()
    } else {
      /** @type {Object<string, any>} */
      core = keyOrCore
      await core.ready()
      await core.download()
      key = core.key.toString('hex')
    }

    core.on('download', async (seq) => {
      const doc = await core.get(seq, { valueEncoding: 'json' })
      this.indexer.batch([doc])
    })

    if (local) {
      this.emit('coreAdded', core)
    }

    if (this.#coresByKey.has(key)) {
      return
    }

    this.#coresByKey.set(key, core)
    this.indexer.updateCores(this.cores)
  }

  async close() {
    for (const core of this.cores) {
      await core.close()
    }
  }
}
