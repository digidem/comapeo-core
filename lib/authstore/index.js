import { Indexer } from '../indexer/index.js'
import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'
import b4a from 'b4a'

import { DataStore } from '../datastore/index.js'
import { DataType } from '../datatype/index.js'

import { getBlockPrefix } from '../utils.js'

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

export class AuthStore {
  #identityKeyPair
  #corestore

  constructor(options) {
    this.#identityKeyPair = options.identityKeyPair
    this.#corestore = options.corestore


    this.capabilitiesIndexer = new Indexer({
      dataType: capabilities,
      sqlite: options.sqlite,
      extraColumns:
        'capability TEXT, identityPublicKey TEXT, blockIndex INTEGER',
    })

    this.capabilities = new DataStore({
      dataType: capabilities,
      corestore: options.corestore,
      indexer: this.capabilitiesIndexer,
      keyPair: this.#identityKeyPair,
    })

    this.ownershipIndexer = new Indexer({
      dataType: capabilities,
      sqlite: options.sqlite,
      extraColumns:
        'hypercorePublicKey TEXT, ownershipSignature TEXT, identityPublicKey TEXT, blockIndex INTEGER',
    })

    this.ownership = new DataStore({
      dataType: ownership,
      corestore: options.corestore,
      indexer: this.ownershipIndexer,
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
    await this.ownership.ready()

    if (!this.multiCoreIndexer) {
      this.multiCoreIndexer = new MultiCoreIndexer(this.cores, {
        storage: (key) => {
          return new ram(key)
        },
        batch: (entries) => {
          for (const entry of entries) {
            const { block } = entry
            const prefix = getBlockPrefix(block)

            if (prefix === capabilities.blockPrefix) {
              const doc = this.capabilities.decode(entry.block)
              this.capabilitiesIndexer.batch([doc])
            } else if (prefix === ownership.blockPrefix) {
              const doc = this.capabilities.decode(entry.block)
              this.ownershipIndexer.batch([doc])
            }
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
    const [keyString, blockIndex] = version.split('@')
    const key = b4a.from(keyString, 'hex')
    const core = this.#corestore.get({ key })
    const buffer = await core.get(blockIndex)
    return this.capabilities.decode(buffer)
  }

  async getCapabilities(identityPublicKey) {
    const rows = this.capabilities.query(
      `identityPublicKey == '${identityPublicKey}'`
    )

    const validCapabilities = []
    for (const capability of rows) {
      const valid = await this.validateStatement(capability)
      if (valid) {
        validCapabilities.push(capability)
      }
    }

    return validCapabilities
  }

  async validateStatement(statement) {

    if (!statement.links || !statement.links.length) {
      return true
    }

    // TODO: support for multiple links?
    const linkedStatement = await this.getBlockByVersion(statement.links[0])

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
    await this.capabilities.close()
    await this.ownership.close()
    await this.#corestore.close()
  }
}
