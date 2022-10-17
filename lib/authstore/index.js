import { DataStore } from './datastore.js'
import { DataType } from '../datatype.js'

const capabilities = new DataType({
  name: 'capabilities',
  blockPrefix: 'capa',
  schema: {
    additionalProperties: true, // TODO: actual schema
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

// TODO: this may need its own sqlite-indexer and multi-core-indexer instances, particularly if we have multiple data types stored in this core
export class Authstore {
  constructor(options) {
    this.corestore = options.corestore
    this.capabilities = new DataStore({
      dataType: capabilities,
      corestore: options.corestore,
      indexer: options.indexer,
    })
  }

  async ready() {
    await this.capabilities.ready()
  }

  async create({ identityPublicKey, creator, capability }) {
    // TODO: validate that user can write new capabilities based on current capabilities
    return this.capabilities.create({
      id: identityPublicKey,
      creator,
      capability,
    })
  }

  async update({ identityPublicKey, creator, capability }) {
    // TODO: validate that user can write new capabilities based on current capabilities
    return this.capabilities.update({
      id: identityPublicKey,
      creator,
      capability,
    })
  }

  validateCapability({ identityPublicKey, capability }) {}

  getCapabilities(identityPublicKey) {
    return this.capabilities.query(`identifyPublicKey == ${identityPublicKey}`)
  }

  query(where) {
    return this.capabilities.query(where)
  }

  async close() {
    await this.corestore.close()
    await this.capabilities.close()
  }
}
