import MultiCoreIndexer from 'multi-core-indexer'
import b4a from 'b4a'
import ram from 'random-access-memory'

import { AuthStore } from './lib/authstore/index.js'
import { DataStore } from './lib/datastore/index.js'
import { Indexer } from './lib/indexer/index.js'
export { DataType } from './lib/datatype/index.js'

export class Mapeo {
  #indexers = new Map()
  #multiCoreIndexer
  #corestore
  #dataTypes

  constructor(options) {
    const { corestore, dataTypes, sqlite } = options
    this.#corestore = corestore
    this.#dataTypes = dataTypes

    for (const dataType of dataTypes) {
      const extraColumns = Object.keys(dataType.schema.properties)
        .filter((key) => {
          return (
            ['id', 'version', 'links', 'forks', 'properties'].includes(key) ===
            false
          )
        })
        .map((key) => {
          // TODO: better support for vaious types
          if (
            ['string', 'array', 'object'].includes(
              dataType.schema.properties[key].type
            )
          ) {
            return `${key} TEXT`
          } else if (dataType.schema.properties[key].type === 'number') {
            return `${key} REAL`
          } else if (dataType.schema.properties[key].type === 'integer') {
            return `${key} INTEGER`
          }
        })
        .join(', ')

      const indexer = new Indexer({
        dataType,
        sqlite,
        extraColumns,
      })

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
          indexer.batch([doc])
        }
      },
    })
  }

  async ready() {
    for (const dataType of this.#dataTypes) {
      await this[dataType.name].ready()
    }
  }

  get coreKeys() {
    return [...this.#corestore.cores.keys()]
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  getDataType(block) {
    const typeHex = b4a.toString(block, 'utf-8', 0, 4)
    return this.#dataTypes.find((dataType) => {
      return dataType.blockPrefix === typeHex
    })
  }

  async sync(options) {}

  async syncAuthStore(options) {}

  async syncDataStores(options) {}
}
