import MultiCoreIndexer from 'multi-core-indexer'
import b4a from 'b4a'
import ram from 'random-access-memory'

import { DataStore } from './lib/datastore/index.js'
import { Indexer } from './lib/indexer/index.js'

export { DataType } from './lib/datatype/index.js'

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
          indexer.batch([doc])
        }
      }
    })
  }

  async ready () {
    for (const dataType of this.#dataTypes) {
      await this[dataType.name].ready
    }
  }

  get coreKeys () {
    return [...this.#corestore.cores.keys()]
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
