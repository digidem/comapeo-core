import MultiCoreIndexer from 'multi-core-indexer'
import ram from 'random-access-memory'
import b4a from 'b4a'
import sodium from 'sodium-universal'

import { DataStore } from '../datastore/index.js'
import { DataType } from '../datatype/index.js'
import { Indexer } from '../datatype/indexer/index.js'

import { getBlockPrefix } from '../utils.js'

const defaultRoles = [
  {
    name: 'creator',
    capabilities: ['read', 'write', 'manage:device'],
  },
  {
    name: 'coordinator',
    capabilities: ['read', 'write', 'manage:device'],
  },
  {
    name: 'member',
    capabilities: ['read', 'write'],
  },
  {
    name: 'nonmember',
    capabilities: [],
  },
]

const capabilities = new DataType({
  name: 'capabilities',
  blockPrefix: 'capa',
  schema: {
    properties: {
      type: { type: 'string', pattern: '^role$' },
      role: {
        type: 'string',
        enum: defaultRoles.map((r) => r.name),
      },
      action: {
        type: 'string',
        enum: ['role:set', 'device:add', 'device:remove', 'device:restore'],
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
  #writerKeyPair

  constructor(options) {
    this.#identityKeyPair = options.identityKeyPair
    this.#writerKeyPair = options.hypercoreKeyPair
    this.#corestore = options.corestore.namespace('authstore')
    this.keyManager = options.keyManager
    this.roles = options.roles || defaultRoles

    this.capabilitiesIndexer = new Indexer({
      dataType: capabilities,
      sqlite: options.sqlite,
      extraColumns:
        'authorId TEXT, role TEXT, action TEXT, identityPublicKey TEXT, authorIndex INTEGER, blockIndex INTEGER, created INTEGER, timestamp INTEGER, signature TEXT',
    })

    this.capabilities = new DataStore({
      dataType: capabilities,
      corestore: options.corestore,
      indexer: this.capabilitiesIndexer,
      keyPair: this.keyManager.getHypercoreKeypair(
        // TODO: replace with #writerKeyPair
        'capabilities',
        this.#identityKeyPair.publicKey
      ),
      identityPublicKey: this.#identityKeyPair.publicKey,
    })

    this.ownershipIndexer = new Indexer({
      dataType: ownership,
      sqlite: options.sqlite,
      extraColumns:
        'authorId TEXT, hypercoreKey TEXT, signature TEXT, identityPublicKey TEXT, authorIndex INTEGER, blockIndex INTEGER, created INTEGER, timestamp INTEGER',
    })

    this.ownership = new DataStore({
      dataType: ownership,
      corestore: options.corestore,
      indexer: this.ownershipIndexer,
      keyPair: this.keyManager.getHypercoreKeypair(
        // TODO: replace with #writerKeyPair
        'ownership',
        this.#identityKeyPair.publicKey
      ),
      identityPublicKey: this.#identityKeyPair.publicKey,
    })
  }

  get key() {
    // TODO: consider replacing with this.#writerKeyPair.publicKey
    return this.#identityKeyPair.publicKey
  }

  get keys() {
    return this.cores.map((core) => {
      return core.key.toString('hex')
    })
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

        const { hypercoreKey, signature, identityPublicKey } =
          ownershipStatement

        return this.verifyMessage({
          message: b4a.from(hypercoreKey, 'hex'),
          signature: b4a.from(signature, 'hex'),
          identityPublicKey: b4a.from(identityPublicKey, 'hex'),
        })
      })
    )
  }

  verifyMessage(options) {
    const { message, signature, identityPublicKey } = options
    return sodium.crypto_sign_verify_detached(
      signature,
      message,
      identityPublicKey
    )
  }

  async getOwnershipStatement(hypercoreKey) {
    if (b4a.isBuffer(hypercoreKey)) {
      hypercoreKey = hypercoreKey.toString('hex')
    }

    return this.ownershipIndexer.query(`hypercoreKey = '${hypercoreKey}'`)
  }

  async createOwnershipStatement(hypercoreKey) {
    const signature = this.signHypercoreKey(hypercoreKey)
    const identityPublicKey = this.#identityKeyPair.publicKey.toString('hex')

    return this.ownership.create({
      id: identityPublicKey,
      type: 'ownership',
      hypercoreKey,
      signature: signature.toString('hex'),
      identityPublicKey,
    })
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
            data = this.ownership.decode(buf)
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

  async getBlockByBlockIndex(identityPublicKey, blockIndex) {
    const blocks = await this.getBlocksByIdentityPublicKey(identityPublicKey)
    return blocks.find((block) => block.blockIndex === blockIndex)
  }

  async getBlockByVersion(version) {
    const [keyString, blockIndex] = version.split('@')
    const core = this.getCore(keyString)

    if (core.length < blockIndex + 1) {
      const range = await core.download({ blocks: [blockIndex] })
      await range.done()
    }

    const buffer = await core.get(blockIndex)
    return this.capabilities.decode(buffer)
  }

  getCore(key, options) {
    if (typeof key === 'string') {
      key = b4a.from(key, 'hex')
    }

    return this.#corestore.get({ key, options })
  }

  async setProjectCreator(options) {
    const { projectPublicKey } = options
    const identityPublicKey = this.#identityKeyPair.publicKey.toString('hex')
    const ownership = await this.getOwnershipStatement(this.ownership.key)

    if (!ownership.length) {
      throw new Error('No ownership statement found')
    }

    if (ownership[0].identityPublicKey !== identityPublicKey) {
      throw new Error('Ownership statement does not match identityPublicKey')
    }

    const isOwner = this.verifyMessage({
      message: b4a.from(ownership[0].hypercoreKey, 'hex'),
      signature: b4a.from(ownership[0].signature, 'hex'),
      identityPublicKey: this.#identityKeyPair.publicKey,
    })

    if (!isOwner) {
      throw new Error('Ownership statement is not valid')
    }

    const signature = this.signMessage(
      `creator:${projectPublicKey}:${identityPublicKey}:${ownership[0].version}`
    )

    await this.setRole({
      identityPublicKey,
      role: 'creator',
      signature: signature.toString('hex'),
      links: [ownership[0].version],
    })
  }

  async setRole(options) {
    const { role, identityPublicKey } = options

    const blockIndex = await this.getBlockIndex(identityPublicKey)
    const info = await this.capabilities.info({ writerOnly: true })
    const authorIndex = info.length

    return this.capabilities.put({
      id: identityPublicKey,
      type: 'role',
      role,
      action: 'role:set',
      blockIndex: blockIndex + 1,
      authorIndex: authorIndex + 1,
      links: options.links || [],
    })
  }

  async getRole(identityPublicKey) {
    const currentStatement = this.capabilitiesIndexer.query(
      `id = '${identityPublicKey}'`
    )
    const verified = await this.verifyStatement(currentStatement)
  }

  signMessage(message) {
    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(
      signature,
      b4a.from(message),
      this.#identityKeyPair.secretKey
    )
    return signature
  }

  signHypercoreKey(hypercoreKey) {
    if (typeof hypercoreKey === 'string') {
      hypercoreKey = b4a.from(hypercoreKey, 'hex')
    }

    return this.signMessage(hypercoreKey)
  }

  async addDevice(options) {
    const { devicePublicKey, identityPublicKey } = options
  }

  async removeDevice(options) {
    const { identityPublicKey } = options

    const blockIndex = await this.getBlockIndex(identityPublicKey)
    const info = await this.capabilities.info({ writerOnly: true })
    const authorIndex = info.length

    return this.capabilities.put({
      id: identityPublicKey,
      type: 'role',
      action: 'device:remove',
      role: 'nonmember',
      blockIndex: blockIndex + 1,
      authorIndex: authorIndex + 1,
      links: options.links || [],
    })
  }

  async restoreDevice(options) {
    const { role, identityPublicKey } = options

    const blockIndex = await this.getBlockIndex(identityPublicKey)
    const info = await this.capabilities.info({ writerOnly: true })
    const authorIndex = info.length

    return this.capabilities.put({
      id: identityPublicKey,
      type: 'role',
      action: 'device:restore',
      role,
      blockIndex: blockIndex + 1,
      authorIndex: authorIndex + 1,
      links: options.links || [],
    })
  }

  async verifyStatement(statement) {
    if (!statement) return false
    if (!statement.id) return false
    if (!statement.role) return false
    if (!statement.signature) return false

    // get all the blocks for this id
    const blocks = await this.getBlocksByIdentityPublicKey(statement.id)
    // verify that this statement is valid
    // invalid so far can mean:
    // - if a device has been removed with `device:remove` without being restored
    // - if an author has an incorrect role for the action they are trying to perform
    // - if timestamps, deviceIndex, or authorIndex are non-sequential or jump around in unexpected ways
    // - if the signature is invalid
    // - if the role is not a valid role
    // - if the role is not a valid role for the given action
    // - if the links are not valid
    // - if the links chain is broken, as in it doesn't reach an ownership statement

    // get latest statement of author
    // verify author role: this.verifyRole({ identityPublicKey: statement.id, role: statement.role })
    // repeat recursively until no more statements
    // ensure that the chain reaches back to project creator ownership statement
  }

  async indexing() {
    return new Promise((resolve) => {
      let timeoutId

      const onIdle = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          this.multiCoreIndexer.off('idle', onIdle)
          this.multiCoreIndexer.off('indexing', onIndexing)
          resolve()
        }, 1)
      }

      if (this.multiCoreIndexer.state.current === 'idle') {
        onIdle()
      }

      const onIndexing = () => {
        clearTimeout(timeoutId)
      }

      this.multiCoreIndexer.on('idle', onIdle)
      this.multiCoreIndexer.on('indexing', onIndexing)
    })
  }

  query(where) {
    return this.capabilities.query(where)
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

  async addCores(keys, { sparse = false } = {}) {
    for (let key of keys) {
      if (typeof key === 'string') {
        key = b4a.from(key, 'hex')
      }
      const core = this.#corestore.get({ key, sparse })
      await core.ready()
      this.multiCoreIndexer.addCore(core)
    }
  }

  async close() {
    await this.capabilities.close()
    await this.ownership.close()
    await this.#corestore.close()
  }

  // async getCapabilities(identityPublicKey) {
  //   const rows = this.capabilities.query(
  //     `identityPublicKey == '${identityPublicKey}'`
  //   )

  //   const validCapabilities = []
  //   for (const capability of rows) {
  //     const valid = await this.verifyCapability(capability)
  //     if (valid) {
  //       validCapabilities.push(capability)
  //     }
  //   }

  //   return validCapabilities
  // }

  // async verifyStatementCreator (statement) {
  //   const hypercoreKey = statement.version.split('@')[0]
  //   const ownership = await this.ownership.query(`hypercoreKey = '${hypercoreKey}'`)

  //   return this.verifyOwnership({
  //     hypercoreKey: b4a.from(hypercoreKey, 'hex'),
  //     identityPublicKey: b4a.from(statement.authorId, 'hex'),
  //     signature: b4a.from(ownership[0].signature, 'hex')
  //   })
  // }

  // async verifyCapability(statement) {
  //   if (!statement) return false
  //   if (!statement.identityPublicKey) return false
  //   if (!statement.role) return false

  //   if (!statement.links || !statement.links.length) {
  //     if (statement.blockIndex === 0) {
  //       return this.verifyStatementCreator(statement)
  //     }

  //     return false
  //   }

  //   const linkedStatement = await this.getBlockByVersion(statement.links[0])

  //   const role = this.roles[linkedStatement.role]

  //   if (
  //     linkedStatement.role === 'none' ||
  //     linkedStatement.role === 'member'
  //   ) {
  //     return false
  //   }

  //   if (
  //     linkedStatement.role === 'coordinator' ||
  //     linkedStatement.role === 'creator'
  //   ) {
  //     if (!linkedStatement.links.length) {
  //       return true
  //     }

  //     return this.verifyCapability(linkedStatement)
  //   }

  //   return false
  // }

  // async createCapability(data) {
  //   return this.capabilities.create({
  //     id: data.identityPublicKey,
  //     identityPublicKey: data.identityPublicKey,
  //     role: data.role,
  //     blockIndex: await this.getBlockIndex(data.identityPublicKey),
  //     links: [],
  //   })
  // }

  // async updateCapability(data) {
  //   return this.capabilities.update(
  //     Object.assign({}, data, {
  //       blockIndex: await this.getBlockIndex(data.identityPublicKey),
  //     })
  //   )
  // }
}
