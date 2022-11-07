import { Indexer } from '../indexer/index.js'
import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'

import { DataStore } from '../datastore/index.js'
import { DataType } from '../datatype/index.js'

const capabilitiesList = ['none', 'member', 'coordinator', 'creator']
const capabilities = new DataType({
  name: 'capabilities',
  blockPrefix: 'capa',
  schema: {
    properties: {
      capability: {
        type: 'string',
        enum: capabilitiesList,
      },
    },
    additionalProperties: true, // TODO: add full schema to mapeo-schema
  },
})

const ownership = new DataType({
  name: 'ownership',
  blockPrefix: 'owne',
  schema: {
    properties: {
      hypercoreKey: {
        type: 'string',
      },
    },
    additionalProperties: true, // TODO: add full schema to mapeo-schema
  },
})

// TODO: we may need to override this
function getWinner(docA, docB) {
  if (
    // Checking neither null nor undefined
    docA.timestamp != null &&
    docB.timestamp != null
  ) {
    if (docA.timestamp > docB.timestamp) return docA
    if (docB.timestamp > docA.timestamp) return docB
  }
  // They are equal or no timestamp property, so sort by version to ensure winner is deterministic
  return docA.version > docB.version ? docA : docB
}

export class AuthStore {
  #identityKeyPair
  #corestore

  constructor(options) {
    this.#identityKeyPair = options.identityKeyPair

    this.#corestore = options.corestore

    this.indexer = new Indexer({
      dataType: capabilities,
      sqlite: options.sqlite,
      extraColumns:
        'capability TEXT, identityPublicKey TEXT, blockIndex INTEGER',
    })

    this.capabilities = new DataStore({
      dataType: capabilities,
      corestore: options.corestore,
      indexer: this.indexer,
      keyPair: this.#identityKeyPair,
    })

    this.ownership = new DataStore({
      dataType: ownership,
      corestore: options.corestore,
      indexer: this.indexer,
      keyPair: this.#identityKeyPair,
    })
  }

  get coreKeys() {
    return [...this.#corestore.cores.keys()]
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  async ready() {
    const publicKey = this.#identityKeyPair.publicKey
    this.key = publicKey

    await this.capabilities.ready()
    if (!this.multiCoreIndexer) {
      this.multiCoreIndexer = new MultiCoreIndexer(this.cores, {
        storage: (key) => {
          return new ram(key)
        },
        batch: (entries) => {
          for (const entry of entries) {
            const doc = this.capabilities.decode(entry.block)
            this.indexer.batch([doc])
          }
        },
      })
    }
  }

  async create(data) {
    return this.capabilities.create({
      id: data.identityPublicKey,
      identityPublicKey: data.identityPublicKey,
      capability: data.capability,
      blockIndex: await this.getBlockIndex(data.identityPublicKey),
      links: [],
    })
  }

  async update(data) {
    return this.capabilities.update({
      id: data.identityPublicKey,
      identityPublicKey: data.identityPublicKey,
      capability: data.capability,
      blockIndex: await this.getBlockIndex(data.identityPublicKey),
      links: data.links || [],
    })
  }

  async getBlockIndex(identityPublicKey) {
    const blocks = await this.getBlocksByIdentityPublicKey(identityPublicKey)
    return blocks.length
  }

  async getBlocksByIdentityPublicKey(identityPublicKey) {
    let blocks = []

    for (const core of this.cores) {
      await core.ready()
      if (core.length) {
        for await (const buf of core.createReadStream()) {
          const data = this.capabilities.decode(buf)
          if (data.identityPublicKey === identityPublicKey) {
            blocks.push(data)
          }
        }
      }
    }

    return blocks.sort((a, b) => {
      return a.blockIndex > b.blockIndex
    })
  }

  async getBlockByVersion(version) {
    const [key, blockIndex] = version.split('@')
    const core = this.#corestore.get({ key })
    return core.get(blockIndex)
  }

  async getCapabilities(identityPublicKey) {
    const blocks = this.getBlocksByIdentityPublicKey(identityPublicKey)
    const capability = this.capabilities.query(
      `identityPublicKey == '${identityPublicKey}'`
    )

    const link = await this.getBlockByVersion(capability.links[0])
  }

  async validateStatement(statement) {
    const capability = statement.capability

    if (!capability.links.length) {
      return true
    }

    // TODO: support for multiple links?
    const linkedStatement = await this.getBlockByVersion(capability.links[0])

    if (
      linkedStatement.capability === 'none' ||
      linkedStatement.capability === 'member'
    ) {
      return false
    }

    if (
      linkedStatement.capability === 'coordinator' ||
      linkedStatement.capability === 'creator'
    ) {
      if (!linkedStatement.links.length) {
        return true
      }

      return this.validateStatement(linkedStatement)
    }

    return false
  }

  query(where) {
    return this.capabilities.query(where)
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

  addCore(key) {
    return this.#corestore.get({ key })
  }

  async close() {
    await this.#corestore.close()
    await this.capabilities.close()
  }
}
