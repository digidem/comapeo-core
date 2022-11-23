import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'
import b4a from 'b4a'
import sodium from 'sodium-universal'

import { DataStore } from '../datastore/index.js'
import { DataType } from '../datatype/index.js'
import { Indexer } from '../indexer/index.js'

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
    this.keyManager = options.keyManager

    this.capabilitiesIndexer = new Indexer({
      dataType: capabilities,
      sqlite: options.sqlite,
      extraColumns:
        'creatorId TEXT, capability TEXT, identityPublicKey TEXT, blockIndex INTEGER',
    })

    this.capabilities = new DataStore({
      dataType: capabilities,
      corestore: options.corestore,
      indexer: this.capabilitiesIndexer,
      keyPair: this.keyManager.getHypercoreKeypair(
        'capabilities',
        this.#identityKeyPair.publicKey
      ),
      identityPublicKey: this.#identityKeyPair.publicKey,
    })

    this.ownershipIndexer = new Indexer({
      dataType: ownership,
      sqlite: options.sqlite,
      extraColumns:
        'creatorId TEXT, hypercoreKey TEXT, ownershipSignature TEXT, identityPublicKey TEXT, blockIndex INTEGER',
    })

    this.ownership = new DataStore({
      dataType: ownership,
      corestore: options.corestore,
      indexer: this.ownershipIndexer,
      keyPair: this.keyManager.getHypercoreKeypair(
        'ownership',
        this.#identityKeyPair.publicKey
      ),
      identityPublicKey: this.#identityKeyPair.publicKey,
    })
  }

  get key() {
    return this.capabilities.key
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  async ready() {
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
              const doc = this.ownership.decode(entry.block)
              this.ownershipIndexer.batch([doc])
            }
          }
        },
      })
    }

    await this.#setOwnershipStatementsIfMissing([
      this.capabilities.key,
      this.ownership.key,
    ])
  }

  #setOwnershipStatementsIfMissing(hypercoreKeys) {
    return Promise.all(
      hypercoreKeys.map(async (key) => {
        const hypercoreKeyString = key.toString('hex')
        let results = await this.getOwnershipStatement(hypercoreKeyString)

        let ownershipStatement
        if (!results.length) {
          ownershipStatement = await this.createOwnershipStatement(
            hypercoreKeyString
          )
        } else {
          ownershipStatement = results[0]
        }

        const { hypercoreKey, ownershipSignature, identityPublicKey } =
          ownershipStatement

        return this.verifyOwnership({
          hypercoreKey: b4a.from(hypercoreKey, 'hex'),
          ownershipSignature: b4a.from(ownershipSignature, 'hex'),
          identityPublicKey: b4a.from(identityPublicKey, 'hex'),
        })
      })
    )
  }

  signHypercoreKey(hypercoreKey) {
    if (typeof hypercoreKey === 'string') {
      hypercoreKey = b4a.from(hypercoreKey, 'hex')
    }

    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(
      signature,
      hypercoreKey,
      this.#identityKeyPair.secretKey
    )
    return signature
  }

  verifyOwnership(options) {
    const { hypercoreKey, identityPublicKey, ownershipSignature } = options
    return sodium.crypto_sign_verify_detached(
      ownershipSignature,
      hypercoreKey,
      identityPublicKey
    )
  }

  async getOwnershipStatement(hypercoreKey) {
    return this.ownershipIndexer.query(`hypercoreKey = '${hypercoreKey}'`)
  }

  async createOwnershipStatement(hypercoreKey) {
    const ownershipSignature = this.signHypercoreKey(hypercoreKey)

    return this.ownership.create({
      hypercoreKey,
      ownershipSignature,
      identityPublicKey: this.#identityKeyPair.publicKey.toString('hex'),
    })
  }

  async createCapability(data) {
    return this.capabilities.create({
      id: data.identityPublicKey,
      identityPublicKey: data.identityPublicKey,
      capability: data.capability,
      blockIndex: await this.getBlockIndex(data.identityPublicKey),
      links: [],
    })
  }

  async updateCapability(data) {
    return this.capabilities.update(
      Object.assign({}, data, {
        blockIndex: await this.getBlockIndex(data.identityPublicKey),
      })
    )
  }

  async getBlockIndex(identityPublicKey) {
    const blocks = await this.getBlocksByIdentityPublicKey(identityPublicKey)
    return blocks.length
  }

  async getBlocksByIdentityPublicKey(identityPublicKey, options = {}) {
    let blocks = []

    for (const core of this.cores) {
      await core.ready()
      if (core.length) {
        for await (const buf of core.createReadStream()) {
          const prefix = getBlockPrefix(buf)
          let data
          if (prefix === capabilities.blockPrefix) {
            data = this.capabilities.decode(buf)
          } else if (prefix === ownership.blockPrefix) {
            data= this.ownership.decode(buf)
          }
          if (data.identityPublicKey === identityPublicKey) {
            if (options.datatypes && options.datatypes.includes(data.type)) {
              blocks.push(data)
            }
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
    const core = this.getCore(keyString)
    const buffer = await core.get(blockIndex)
    return this.capabilities.decode(buffer)
  }

  async getCapabilities(identityPublicKey) {
    const rows = this.capabilities.query(
      `identityPublicKey == '${identityPublicKey}'`
    )

    const validCapabilities = []
    for (const capability of rows) {
      const valid = await this.verifyCapability(capability)
      if (valid) {
        validCapabilities.push(capability)
      }
    }

    return validCapabilities
  }

  getCore(key) {
    if (typeof key === 'string') {
      key = b4a.from(key, 'hex')
    }

    return this.#corestore.get({ key })
  }

  async verifyCapability(statement) {
    if (!statement) return false
    if (!statement.identityPublicKey) return false
    if (!statement.capability) return false

    if (!statement.links || !statement.links.length) {
      if (statement.identityPublicKey === statement.creatorId) {
        if (statement.capability === 'creator') {
          // TODO: prove that creatorId is the creator of the hypercore
          return true
        }

        return false
      }
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

      return this.verifyCapability(linkedStatement)
    }

    return false
  }

  query(where) {
    return this.capabilities.query(where)
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

  addCores(cores) {
    for (const core of cores) {
      this.#corestore.get({ key: core.key })
    }
  }

  async close() {
    await this.capabilities.close()
    await this.ownership.close()
    await this.#corestore.close()
  }
}
