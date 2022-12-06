import sodium from 'sodium-universal'
import b4a from 'b4a'

import { DataStore } from '../datastore/index.js'
import { idToKey, keyToId } from '../utils.js'

import {
  coreOwnership,
  devices,
  roles,
  capabilities,
  defaultRoles,
  availableCapabilities,
} from './authtypes.js'

export class AuthStore {
  #identityKeyPair
  #keyPair
  #corestore
  #availableRoles
  #availableCapabilities
  #datastore

  constructor(options) {
    this.#identityKeyPair = options.identityKeyPair
    this.#keyPair = options.keyPair
    this.#corestore = options.corestore.namespace('authstore')
    this.#availableRoles = options.roles || defaultRoles
    this.#availableCapabilities = availableCapabilities

    this.#datastore = new DataStore({
      corestore: this.#corestore,
      sqlite: options.sqlite,
      keyPair: this.#keyPair,
      identityPublicKey: this.#identityKeyPair.publicKey,
    })

    this.coreOwnership = this.#datastore.dataType({
      ...coreOwnership,
      keyPair: this.#keyPair,
    })

    this.devices = this.#datastore.dataType({
      ...devices,
      keyPair: this.#keyPair,
    })

    this.roles = this.#datastore.dataType({
      ...roles,
      keyPair: this.#keyPair,
    })

    this.capabilities = this.#datastore.dataType({
      keyPair: this.#keyPair,
    })

    this.identityId = keyToId(this.#identityKeyPair.publicKey)
    this.projectPublicKey = options.projectPublicKey
    this.projectId = keyToId(this.projectPublicKey)
  }

  get identityPublicKey() {
    return this.#identityKeyPair.publicKey
  }

  get id() {
    return keyToId(this.#keyPair.publicKey)
  }

  get key() {
    return this.#keyPair.publicKey
  }

  get keys() {
    return this.cores.map((core) => {
      return core.key.toString('hex')
    })
  }

  get localCore() {
    return this.#datastore.localCore
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  async ready() {
    await this.#datastore.ready()
    await this.coreOwnership.ready()
    await this.devices.ready()
    await this.roles.ready()
    await this.capabilities.ready()

    await this.init()
  }

  async init() {
    try {
      await this.setCoreOwner(this.id)
    } catch (err) {
      if (err.message === 'Core already has an owner') {
        await this.verifyCoreOwner(this.id)
      } else {
        throw err
      }
    }
  }

  async initProjectCreator() {
    await this.setProjectCreator({ projectId: this.projectId })
    await this.addDevice({ identityId: this.identityId })
  }

  signMessage(message) {
    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(
      signature,
      message,
      this.#identityKeyPair.secretKey
    )
    return signature
  }

  verifyMessage(options) {
    const { message, signature, identityPublicKey } = options

    return sodium.crypto_sign_verify_detached(
      signature,
      message,
      identityPublicKey
    )
  }

  async setCoreOwner(coreKey) {
    if (!coreKey) {
      coreKey = this.key
    }

    const coreId = keyToId(coreKey)
    const existing = await this.getCoreOwner({ coreId })

    if (existing) {
      throw new Error('Core already has an owner')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(this.identityId)
    const signature = this.signMessage(idToKey(coreId))

    return this.coreOwnership.create({
      id: this.identityId,
      type: 'core_ownership',
      coreId,
      action: 'core:owner',
      signature: signature.toString('hex'),
      authorIndex,
      deviceIndex,
    })
  }

  async getCoreOwner({ coreId }) {
    const results = this.#datastore.query(
      `SELECT * FROM core_ownership WHERE coreId = '${coreId}'`
    )

    if (!results.length) {
      return null
    }

    const [statement] = results
    await this.verifyCoreOwner(statement)
    return statement
  }

  async verifyCoreOwner(ownershipStatement) {
    const { id, coreId, signature } = ownershipStatement

    if (!ownershipStatement || ownershipStatement.type !== 'core_ownership') {
      throw new Error('Unable to find ownership statement')
    }

    const verified = this.verifyMessage({
      message: idToKey(coreId),
      signature: idToKey(signature),
      identityPublicKey: idToKey(id),
    })

    if (!verified) {
      throw new Error('Core ownership not verified')
    }
  }

  async getProjectCreator() {
    const results = this.#datastore.query(
      `SELECT * FROM roles WHERE role = 'creator'`
    )

    if (!results.length) {
      return null
    }

    const [statement] = results
    await this.verifyProjectCreator({
      ...statement,
      projectId: this.projectId,
    })
    return statement
  }

  async setProjectCreator(options) {
    const { projectId } = options

    const existing = await this.getProjectCreator()
    if (existing) {
      throw new Error('Project already has a creator')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(this.identityId)

    const ownershipStatement = await this.getBlockByAuthorIndex({
      authorIndex: authorIndex - 1,
      authorId: this.identityId,
    })

    this.verifyCoreOwner(ownershipStatement)

    const signature = this.signMessage(idToKey(projectId))

    return this.roles.create({
      id: this.identityId,
      type: 'roles',
      role: 'creator',
      signature: keyToId(signature),
      action: 'role:set',
      authorIndex,
      deviceIndex,
      links: [ownershipStatement.version],
    })
  }

  async verifyProjectCreator(roleStatement) {
    const { id, signature, links } = roleStatement
    const projectId = this.projectId
    if (
      !roleStatement ||
      !roleStatement.id ||
      roleStatement.type !== 'roles' ||
      roleStatement.role !== 'creator' ||
      !roleStatement.signature
    ) {
      throw new Error(
        'Project creator not verified: full role statement required'
      )
    }

    if (!links.length) {
      throw new Error(
        'Project creator not verified: link to core ownership statement not found'
      )
    }

    const verified = this.verifyMessage({
      message: idToKey(projectId),
      signature: idToKey(signature),
      identityPublicKey: idToKey(id),
    })

    if (!verified) {
      throw new Error('Project creator not verified: signature not verified')
    }

    const ownershipStatement = await this.getBlockByVersion(links[0])
    return this.verifyCoreOwner(ownershipStatement)
  }

  async getDevice(options) {
    const { identityId } = options
    const results = this.#datastore.query(
      `SELECT * FROM devices WHERE id = '${identityId}'`
    )

    if (!results.length) {
      return null
    }

    const [statement] = results
    await this.verifyDevice(statement)
    return statement
  }

  async verifyDevice(options) {
    const { id, signature, authorId, links } = options

    const verified = this.verifyMessage({
      message: idToKey(id),
      signature: idToKey(signature),
      identityPublicKey: idToKey(authorId),
    })

    if (!verified) {
      throw new Error('Device not verified')
    }

    await this.verifyLinks(links)
  }

  async addDevice(options) {
    const { identityId } = options

    const existing = await this.getDevice({ identityId })
    if (existing) {
      throw new Error('Device already exists')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(identityId)
    const signature = this.signMessage(idToKey(identityId))

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    const role = this.#availableRoles.find(
      (role) => role.name === authorRole.role
    )

    if (!role) {
      throw new Error('Author role not found')
    }

    if (!role.capabilities.includes('manage:devices')) {
      throw new Error('Author does not have permission to add device')
    }

    const link = await this.getBlockByDeviceIndex({
      deviceIndex: deviceIndex - 1,
      identityId,
    })

    let links = []
    if (link) {
      links.push(link.version)
    } else {
      const authorCoreOwnership = await this.getCoreOwner({ coreId: this.id })
      links.push(authorCoreOwnership.version)
    }

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:add',
      signature: keyToId(signature),
      authorIndex,
      deviceIndex,
      links,
    })
  }

  async removeDevice(options) {
    const { identityId } = options

    const existing = await this.getDevice({ identityId })

    if (!existing) {
      throw new Error('Device cannot be removed because it has not been added')
    }

    if (existing.action === 'device:remove') {
      throw new Error(
        'Device cannot be removed because it has already been removed'
      )
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(identityId)
    const signature = this.signMessage(idToKey(identityId))

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    const role = this.#availableRoles.find(
      (role) => role.name === authorRole.role
    )

    if (!role) {
      throw new Error('Author role not found')
    }

    if (!role.capabilities.includes('manage:devices')) {
      throw new Error('Author does not have permission to add device')
    }

    const projectCreator = await this.getProjectCreator()

    if (projectCreator.id === identityId) {
      // TODO: we may want to allow this in the future
      throw new Error('Project creator cannot be removed')
    }

    const link = await this.getBlockByDeviceIndex({
      deviceIndex: deviceIndex - 1,
      identityId,
    })

    let links = []
    if (link) {
      links.push(link.version)
    } else {
      const authorCoreOwnership = await this.getCoreOwner({ coreId: this.id })
      links.push(authorCoreOwnership.version)
    }

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:remove',
      signature: keyToId(signature),
      authorIndex,
      deviceIndex,
      links,
    })
  }

  async restoreDevice(options) {
    const { identityId } = options

    // order blocks by deviceIndex so we can check that they were created in the correct order
    const existing = (
      await this.getBlocksByType({ dataType: 'devices', identityId })
    ).sort((a, b) => {
      return b.deviceIndex - a.deviceIndex
    })

    // TODO: more checks to ensure timestamp/deviceIndex/authorIndex/etc. is correct
    const [mostRecent] = existing

    if (mostRecent.action !== 'device:remove') {
      throw new Error(
        'Device cannot be restored because it has not been removed'
      )
    }

    if (!existing.length) {
      throw new Error(
        'Device cannot be restored because it has not been added or removed'
      )
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(identityId)
    const signature = this.signMessage(idToKey(identityId))

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    const role = this.#availableRoles.find(
      (role) => role.name === authorRole.role
    )

    if (!role) {
      throw new Error('Author role not found')
    }

    if (!role.capabilities.includes('manage:devices')) {
      throw new Error('Author does not have permission to add device')
    }

    const link = await this.getBlockByDeviceIndex({
      deviceIndex: deviceIndex - 1,
      identityId,
    })

    let links = []
    if (link) {
      links.push(link.version)
    } else {
      const authorCoreOwnership = await this.getCoreOwner({ coreId: this.id })
      links.push(authorCoreOwnership.version)
    }

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:restore',
      signature: keyToId(signature),
      authorIndex,
      deviceIndex,
      links,
    })
  }

  async setRole(options) {
    const { role, identityId } = options

    const existing = await this.getRole({ identityId })
    const authorRole = await this.getRole({ identityId: this.identityId })

    if (existing && existing.role === role) {
      throw new Error(`Role ${role} already set`)
    }

    if (existing && existing.role === 'creator') {
      // TODO: we may want to allow this in the future
      throw new Error('Project creator role cannot be changed')
    }

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    const roleDetails = this.#availableRoles.find(
      (item) => item.name === authorRole.role
    )

    if (!roleDetails) {
      throw new Error('Author role not found')
    }

    if (!roleDetails.capabilities.includes('manage:devices')) {
      throw new Error('Author does not have permission to change roles')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(this.identityId)

    const ownershipStatement = await this.getBlockByAuthorIndex({
      authorIndex: authorIndex - 1,
      authorId: this.identityId,
    })

    this.verifyRole(authorRole)

    const signature = this.signMessage(idToKey(`${identityId}:${role}`))

    return this.roles.create({
      id: identityId,
      type: 'roles',
      role: role,
      signature: keyToId(signature),
      action: 'role:set',
      authorIndex,
      deviceIndex,
      links: [ownershipStatement.version],
    })
  }

  async getRole(options) {
    const { identityId } = options
    const results = this.#datastore.query(
      `SELECT * FROM roles WHERE id = '${identityId}'`
    )

    if (!results.length) {
      return null
    }

    const [statement] = results
    if (statement.role === 'creator') {
      await this.verifyProjectCreator(statement)
    } else {
      await this.verifyRole(statement)
    }
    return statement
  }

  async verifyRole(options) {
    const { id, signature, links } = options

    let message
    if (options.role === 'creator') {
      message = this.projectPublicKey
    } else {
      message = idToKey(`${id}:${options.role}`)
    }

    const verified = this.verifyMessage({
      message,
      signature: idToKey(signature),
      identityPublicKey: idToKey(options.authorId),
    })

    if (!verified) {
      throw new Error('Role not verified: signature not verified')
    }

    await this.verifyLinks(links)
  }

  async verifyLinks(links) {
    for (const link of links) {
      const block = await this.getBlockByVersion(link)
      if (block.type === 'devices') {
        await this.verifyDevice(block)
      } else if (block.type === 'roles') {
        await this.verifyRole(block)
      } else if (block.type === 'core_ownership') {
        await this.verifyCoreOwner(block)
      } else {
        throw new Error('Role not verified: link to unknown data type')
      }
    }
  }

  async getDeviceIndex(identityId) {
    const blocks = await this.getBlocksByIdentityId(identityId)
    return blocks.length
  }

  async getBlockByVersion(version) {
    const [keyString, blockIndex] = version.split('@')
    const core = await this.getCore(keyString)
    const block = await core.get(blockIndex)
    const dataType = this.#datastore.getDataTypeForBlock(block)
    return dataType.decode(block)
  }

  async getBlockByDeviceIndex({ identityId, deviceIndex }) {
    const blocks = await this.getBlocksByIdentityId(identityId)
    return blocks.find((block) => {
      return block.deviceIndex === deviceIndex
    })
  }

  async getBlockByAuthorIndex({ authorId, authorIndex }) {
    const blocks = await this.getBlocksByAuthorId(authorId)
    return blocks.find((block) => {
      return block.authorIndex === authorIndex
    })
  }

  async getAuthorIndex(identityId) {
    const blocks = await this.getBlocksByAuthorId(identityId)
    return blocks.length
  }

  async getBlocksByAuthorId(authorId, options = {}) {
    let blocks = []

    for await (const block of this.getBlocks()) {
      if (block.authorId === authorId) {
        blocks.push(block)
      }
    }

    return blocks
  }

  async getBlocksByIdentityId(identityId, options = {}) {
    let blocks = []

    for await (const block of this.getBlocks()) {
      if (block.id === identityId) {
        blocks.push(block)
      }
    }

    return blocks
  }

  async getBlocksByType({ dataType, identityId }) {
    let blocks = []

    for await (const block of this.getBlocks()) {
      if (block.type === dataType) {
        if (identityId) {
          if (block.id === identityId) {
            blocks.push(block)
          }
        } else {
          blocks.push(block)
        }
      }
    }

    return blocks
  }

  async *getBlocks() {
    for (const core of this.cores) {
      await core.ready()
      if (core.length) {
        for await (const buf of core.createReadStream()) {
          const dataType = this.#datastore.getDataTypeForBlock(buf)
          if (dataType) {
            const data = dataType.decode(buf)
            yield data
          }
        }
      }
    }
  }

  async indexing() {
    return this.#datastore.indexing()
  }

  async getCore(coreKey, options) {
    return this.#datastore.getCore(coreKey, options)
  }

  query() {
    return this.#datastore.query(...arguments)
  }

  replicate(options) {
    return this.#datastore.replicate(options)
  }

  async close() {
    await this.#datastore.close()
  }
}
