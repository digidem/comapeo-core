import { randomBytes } from 'crypto'

import MultiCoreIndexer from 'multi-core-indexer'
import sodium from 'sodium-universal'
import ram from 'random-access-memory'
import { linkSync } from 'fs'

/**
 * @typedef {Object} Statement
 * @property {string} key - unique id for this statement
 * @property {string} type - type of statement
 * @property {string} projectPublicKey - the hypercore where this statement was appended
 * @property {string} identityPublicKey - the identity that this capability statement is about
 * @property {string} [capability] - capability set by this statement
 * @property {string[]} links - links to previous statements about the identityPublicKey
 */

export class AuthStore {
  #dataTypes = new Map()
  #corestore
  #indexer
  #writer
  #identityKeyPair
  #projectKeyPair

  capabilities = ['none', 'member', 'admin', 'creator']

  constructor(options) {
    this.#indexer = options.indexer
    this.#identityKeyPair = options.identityKeyPair
    this.#projectKeyPair = options.projectKeyPair
    this.#corestore = options.corestore

    this.multiCoreIndexer = new MultiCoreIndexer(this.cores, {
      storage: (key) => {
        return new ram(key)
      },
    })
  }

  async ready() {
    await this.#corestore.ready()
    const secretKey = this.#identityKeyPair.secretKey
    const publicKey = this.#identityKeyPair.publicKey

    this.key = publicKey

    this.#writer = this.#corestore.get({
      keyPair: this.#identityKeyPair,
      valueEncoding: 'json',
      auth: {
        sign(signable) {
          const signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES)
          sodium.crypto_sign_detached(signature, signable, secretKey)
          return signature
        },
        verify(signable, signature) {
          return sodium.crypto_sign_verify_detached(
            signature,
            signable,
            publicKey
          )
        },
      },
    })

    await this.#writer.ready()
    await this.#appendIdentityStatement()
  }

  get coreKeys() {
    return [
      ...this.cores.map((core) => {
        return core.key.toString('hex')
      }),
    ]
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  /**
   * @returns {IdentityPublicKey}
   */
  get identityPublicKey() {
    return this.#identityKeyPair.publicKey
  }

  /**
   * @returns {IdentityPublicKeyString}
   */
  get identityPublicKeyString() {
    return this.#identityKeyPair.publicKey.toString('hex')
  }

  /**
   * @returns {PublicKey}
   */
  get projectPublicKey() {
    return this.#projectKeyPair.publicKey
  }

  /**
   * @returns {PublicKeyString}
   */
  get projectPublicKeyString() {
    return this.#projectKeyPair.publicKey.toString('hex')
  }

  /**
   * Create a statement that identifies the user as the owner of this authstore
   */
  async #appendIdentityStatement() {
    return this.append({
      type: 'identity',
      identityPublicKey: this.identityPublicKeyString,
      projectPublicKey: this.projectPublicKeyString,
      capability: null,
    })
  }

  /**
   * @param {object} options
   * @param {string} options.type
   * @param {string} options.capability
   * @param {IdentityPublicKeyString} options.identityPublicKey
   * @returns {Promise<Statement>}
   */
  async append({ type, capability, identityPublicKey }) {
    // const capabilities = await this.getCapabilities()
    // const lastStatement = capabilities[capabilities.length - 1]

    const statement = {
      key: randomBytes(8).toString('hex'),
      type,
      creator: this.identityPublicKeyString,
      projectPublicKey: this.projectPublicKeyString,
      identityPublicKey,
      capability,
      links: [],
    }

    const creatorLastStatement = await this.resolveIdentityCapabilities(
      this.identityPublicKeyString
    )

    if (creatorLastStatement) {
      statement.links.push(creatorLastStatement.key)
    }

    if (identityPublicKey !== this.identityPublicKeyString) {
      const userLastStatement = await this.resolveIdentityCapabilities(
        identityPublicKey
      )
      if (userLastStatement) {
        statement.links.push(userLastStatement.key)
      }
    }

    await this.#writer.append(statement)
    return statement
  }

  /**
   * @param {string} [identityPublicKey]
   * @returns {Promise<CapabilityStatement[]>}
   */
  async getUnorderedCapabilities(identityPublicKey) {
    let capabilities = []

    for (const core of this.cores) {
      await core.ready()

      if (core.length) {
        for await (const buf of core.createReadStream()) {
          const data = JSON.parse(buf.toString())
          capabilities.push(data)
        }
      }
    }

    if (identityPublicKey) {
      return capabilities.filter((capability) => {
        return capability.identityPublicKey === identityPublicKey
      })
    }

    return capabilities
  }

  /**
   * @returns {Promise<CapabilityStatement[]>}
   */
  async getCapabilities(identityPublicKey) {
    const unordered = await this.getUnorderedCapabilities(identityPublicKey)
    const ordered = []

    // TODO: this ordering approach seems brittle
    for (const statement of unordered) {
      if (!statement.links.length) {
        ordered.unshift(statement)
      } else {
        const index = ordered.findIndex((item) => {
          return statement.links.includes(item.key)
        })

        ordered.splice(index + 1, 0, statement)
      }
    }

    return ordered
  }

  /**
   * @param {IdentityPublicKeyString} [identityPublicKey]
   * @returns {Promise<CapabilityStatement|undefined>}
   */
  async resolveIdentityCapabilities(identityPublicKey) {
    const statements = await this.getCapabilities(identityPublicKey)
    let lowestCapability = null
    let lowestCapabilityIndex = null

    for (const statement of statements) {
      if (statement.type === 'capabilities') {
        const capabilityIndex = this.capabilities.indexOf(statement.capability)

        if (
          lowestCapability === null ||
          capabilityIndex < lowestCapabilityIndex
        ) {
          lowestCapability = statement
          lowestCapabilityIndex = capabilityIndex
        }
      }
    }

    // return lowest-level capability
    return lowestCapability
  }

  /**
   * @returns {Promise<Boolean>}
   */
  async hasCapability({ capability, identityPublicKey }) {
    const statement = await this.resolveIdentityCapabilities(identityPublicKey)
    if (!statement) return false

    const statementCapabilityIndex = this.capabilities.indexOf(
      statement.capability
    )

    const capabilityIndex = this.capabilities.indexOf(capability)
    return statementCapabilityIndex >= capabilityIndex
  }

  replicate() {
    return this.#corestore.replicate(...arguments)
  }

  addCore(key) {
    return this.#corestore.get({ key })
  }

  getStatement(key) {
    const statements = this.getUnorderedCapabilities()
    return statements.find((statement) => {
      return statement.key === key
    })
  }
}
