import sodium from 'sodium-universal'
import b4a from 'b4a'

import { DataStore } from '../datastore/index.js'
import { idToKey, keyToId } from '../utils.js'

import { coreOwnership, devices, roles, defaultRoles } from './authtypes.js'

export class AuthStore {
  #identityKeyPair
  #keyPair
  #corestore
  #availableRoles
  #datastore
  #sqlite

  /**
   * @param {Object} options
   * @param {IdentityKeyPair} options.identityKeyPair the key pair of the identity
   * @param {KeyPair} options.keyPair the key pair used for the local writer hypercore
   * @param {PublicKey} options.projectPublicKey the public key of the project
   * @param {Corestore} options.corestore
   * @param {import('../sqlite.js').Sqlite} options.sqlite an instance of the internal Sqlite class
   * @param {AvailableRoles} [options.roles] an array of role names and capabilities
   */
  constructor(options) {
    this.#identityKeyPair = options.identityKeyPair
    this.#keyPair = options.keyPair
    this.#corestore = options.corestore.namespace('authstore')
    this.#availableRoles = options.roles || defaultRoles
    this.#sqlite = options.sqlite

    this.#datastore = new DataStore({
      corestore: this.#corestore,
      sqlite: options.sqlite,
      keyPair: this.#keyPair,
      identityPublicKey: this.#identityKeyPair.publicKey,
    })

    this.coreOwnership = this.#datastore.dataType(coreOwnership)
    this.devices = this.#datastore.dataType(devices)
    this.roles = this.#datastore.dataType(roles)

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

    await this.init()
  }

  async init() {
    try {
      await this.setCoreOwner(this.key)
    } catch (err) {
      if (err.message === 'Core already has an owner') {
        await this.getCoreOwner({ coreId: this.id })
      } else {
        throw err
      }
    }
  }

  async initProjectCreator() {
    await this.setProjectCreator()
    await this.addDevice({ identityId: this.identityId })
  }

  /**
   * @param {Buffer} message
   * @returns {Buffer} signature
   */
  signMessage(message) {
    const signature = b4a.alloc(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(
      signature,
      message,
      this.#identityKeyPair.secretKey
    )
    return signature
  }

  /**
   * @param {Buffer} message
   * @param {Buffer} signature
   * @param {Buffer} identityPublicKey
   * @returns {Boolean}
   */
  verifyMessage(message, signature, identityPublicKey) {
    return sodium.crypto_sign_verify_detached(
      signature,
      message,
      identityPublicKey
    )
  }

  /**
   * @param {PublicKey} coreKey
   */
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

    const signature = this.#signCoreOwnerMessage({
      identityId: this.identityId,
      authorId: this.identityId,
      coreId,
      authorIndex,
      deviceIndex,
    })

    return this.coreOwnership.create({
      id: this.identityId,
      authorId: this.identityId,
      type: 'core_ownership',
      coreId,
      action: 'core:owner',
      signature,
      authorIndex,
      deviceIndex,
    })
  }

  /**
   * @param {Object} options
   * @param {String} options.coreId
   * @returns {Promise<CoreOwnershipStatement|null>}
   */
  async getCoreOwner({ coreId }) {
    const statement = this.getCoreOwnershipStatementByCoreId(coreId)
    if (!statement) {
      return null
    }

    await this.verifyCoreOwner(statement)
    return statement
  }

  /**
   * @param {CoreOwnershipStatement} statement
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async verifyCoreOwner(statement) {
    const { id, authorId, coreId, signature, authorIndex, deviceIndex } =
      statement

    const verified = this.#verifyCoreOwnerMessage({
      signature,
      identityId: id,
      message: {
        identityId: id,
        authorId,
        coreId,
        authorIndex,
        deviceIndex,
      },
    })

    if (!verified) {
      throw new Error('Core ownership not verified')
    }
  }

  /**
   * @returns {Promise<RoleStatement|null>}
   * @throws {Error}
   */
  async getProjectCreator() {
    const statement = this.getRoleStatementByRole('creator')

    if (!statement) {
      return null
    }

    await this.verifyProjectCreator(statement)
    return statement
  }

  /**
   * @returns {Promise<RoleStatement>}
   * @throws {Error}
   */
  async setProjectCreator() {
    const existing = await this.getProjectCreator()
    if (existing) {
      throw new Error('Project already has a creator')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(this.identityId)

    const ownershipStatement = /** @type {CoreOwnershipStatement} */ (
      await this.getBlockByAuthorIndex({
        authorIndex: authorIndex - 1,
        authorId: this.identityId,
      })
    )

    if (!ownershipStatement) {
      throw new Error('No ownership statement found')
    }

    this.verifyCoreOwner(ownershipStatement)

    const signature = this.#signRoleMessage({
      identityId: this.identityId,
      authorId: this.identityId,
      role: 'creator',
      authorIndex,
      deviceIndex,
      links: [ownershipStatement.version],
    })

    return this.roles.create({
      id: this.identityId,
      type: 'roles',
      role: 'creator',
      signature,
      action: 'role:set',
      authorIndex,
      deviceIndex,
      links: [ownershipStatement.version],
    })
  }

  /**
   * @param {RoleStatement} roleStatement
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async verifyProjectCreator(roleStatement) {
    const { id, authorId, signature, authorIndex, deviceIndex, links } =
      roleStatement

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

    const verified = this.#verifyRoleMessage({
      signature,
      identityId: id,
      message: {
        identityId: id,
        authorId,
        role: 'creator',
        authorIndex,
        deviceIndex,
        links,
      },
    })

    if (!verified) {
      throw new Error('Project creator not verified: signature not verified')
    }

    const ownershipStatement = await this.getCoreOwnershipStatementByVersion(
      links[0]
    )
    if (!ownershipStatement) {
      throw new Error(
        'Project creator not verified: core ownership statement not found'
      )
    }

    return this.verifyCoreOwner(ownershipStatement)
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @returns {Promise<DeviceStatement|null>}
   */
  async getDevice(options) {
    const { identityId } = options
    const statement = this.getDeviceStatementById(identityId)

    if (!statement) {
      return null
    }

    await this.verifyDevice(statement)
    return statement
  }

  /**
   * @param {DeviceStatement} statement
   */
  async verifyDevice(statement) {
    const { id, signature, authorId, action, authorIndex, deviceIndex, links } =
      statement

    const verified = this.#verifyDeviceMessage({
      signature,
      identityId: authorId,
      message: {
        identityId: id,
        authorId,
        action,
        authorIndex,
        deviceIndex,
        links,
      },
    })

    if (!verified) {
      throw new Error('Device not verified')
    }

    await this.verifyLinks(links)
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @returns {Promise<DeviceStatement>}
   */
  async addDevice(options) {
    const { identityId } = options

    const existing = await this.getDevice({ identityId })
    if (existing) {
      throw new Error('Device already exists')
    }

    const authorIndex = await this.getAuthorIndex(this.identityId)
    const deviceIndex = await this.getDeviceIndex(identityId)

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    await this.verifyRole(authorRole)

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

    if (!link) {
      throw new Error('Device does not have a previous link')
    }

    let links = [link.version]

    await this.verifyLinks(links)

    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      action: 'device:add',
      authorIndex,
      deviceIndex,
      links,
    })

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:add',
      signature,
      authorIndex,
      deviceIndex,
      links,
    })
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @returns {Promise<DeviceStatement>}
   */
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

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    await this.verifyRole(authorRole)

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

    if (!projectCreator) {
      throw new Error('Project creator not found')
    }

    if (projectCreator.id === identityId) {
      // TODO: we may want to allow this in the future
      throw new Error('Project creator cannot be removed')
    }

    const link = await this.getBlockByDeviceIndex({
      deviceIndex: deviceIndex - 1,
      identityId,
    })

    if (!link) {
      throw new Error('A previous statement is required to remove a device')
    }

    let links = [link.version]

    await this.verifyLinks(links)

    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      action: 'device:remove',
      authorIndex,
      deviceIndex,
      links,
    })

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:remove',
      signature,
      authorIndex,
      deviceIndex,
      links,
    })
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @returns
   */
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

    const authorRole = await this.getRole({ identityId: this.identityId })

    if (!authorRole) {
      throw new Error('Author does not have a role')
    }

    await this.verifyRole(authorRole)

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

    if (!link) {
      throw new Error('Previous statement for this device not found')
    }

    const links = [link.version]

    await this.verifyLinks(links)

    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      action: 'device:restore',
      authorIndex,
      deviceIndex,
      links,
    })

    return this.devices.create({
      id: identityId,
      type: 'devices',
      action: 'device:restore',
      signature,
      authorIndex,
      deviceIndex,
      links,
    })
  }

  /**
   * @param {Object} options
   * @param {String} options.role
   * @param {String} options.identityId
   * @returns {Promise<RoleStatement>}
   * @throws {Error}
   */
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

    const ownershipStatement = /** @type {CoreOwnershipStatement} */ (
      await this.getBlockByAuthorIndex({
        authorIndex: authorIndex - 1,
        authorId: this.identityId,
      })
    )

    const links = []
    if (ownershipStatement) {
      links.push(ownershipStatement.version)
    }

    this.verifyRole(authorRole)

    const signature = this.#signRoleMessage({
      identityId,
      authorId: authorRole.id,
      role,
      authorIndex,
      deviceIndex,
      links,
    })

    return this.roles.create({
      id: identityId,
      type: 'roles',
      role: role,
      signature,
      action: 'role:set',
      authorIndex,
      deviceIndex,
      links,
    })
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @returns {Promise<null|RoleStatement>} options
   */
  async getRole(options) {
    const { identityId } = options
    const statement = this.getRoleStatementById(identityId)

    if (!statement) {
      return null
    }

    if (statement.role === 'creator') {
      await this.verifyProjectCreator(statement)
    } else {
      await this.verifyRole(statement)
    }
    return statement
  }

  /**
   * @param {RoleStatement} options
   */
  async verifyRole(options) {
    const { id, authorId, role, signature, links, authorIndex, deviceIndex } =
      options

    const verified = this.#verifyRoleMessage({
      identityId: authorId,
      signature,
      message: {
        identityId: id,
        authorId,
        role,
        authorIndex,
        deviceIndex,
        links,
      },
    })

    if (!verified) {
      throw new Error('Role not verified: signature not verified')
    }

    await this.verifyLinks(links)
  }

  /**
   *
   * @param {String[]} links
   */
  async verifyLinks(links) {
    for (const link of links) {
      const block = await this.getBlockByVersion(link)
      if (!block) {
        throw new Error('Not verified: link not found')
      }
      if (block.type === 'devices') {
        /** @ts-ignore: block.type check is sufficient */
        await this.verifyDevice(block)
      } else if (block.type === 'roles') {
        /** @ts-ignore: block.type check is sufficient */
        await this.verifyRole(block)
      } else if (block.type === 'core_ownership') {
        /** @ts-ignore: block.type check is sufficient */
        await this.verifyCoreOwner(block)
      } else {
        throw new Error('Not verified: link to unknown data type')
      }
    }
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.coreId
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @returns {String}
   */
  #signCoreOwnerMessage(options) {
    const signature = this.#createCoreOwnerSignatureString(options)
    return keyToId(this.signMessage(idToKey(signature)))
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.role
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {String[]} options.links
   * @returns {String}
   */
  #signRoleMessage(options) {
    const signature = this.#createRoleSignatureString(options)
    return keyToId(this.signMessage(idToKey(signature)))
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.action
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {String[]} options.links
   * @returns {String}
   */
  #signDeviceMessage(options) {
    const signature = this.#createDeviceSignatureString(options)
    return keyToId(this.signMessage(idToKey(signature)))
  }

  /**
   * @param {Object} options
   * @param {Object} options.message
   * @param {String} options.message.identityId
   * @param {String} options.message.authorId
   * @param {String} options.message.coreId
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {String} options.signature
   * @param {String} options.identityId
   * @returns {Boolean}
   */
  #verifyCoreOwnerMessage(options) {
    const messageString = this.#createCoreOwnerSignatureString(options.message)
    return this.verifyMessage(
      idToKey(messageString),
      idToKey(options.signature),
      idToKey(options.identityId)
    )
  }

  /**
   * @param {Object} options
   * @param {Object} options.message
   * @param {String} options.message.identityId
   * @param {String} options.message.authorId
   * @param {String} options.message.role
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {String[]} options.message.links
   * @param {String} options.signature
   * @param {String} options.identityId
   * @returns {Boolean}
   */
  #verifyRoleMessage(options) {
    const messageString = this.#createRoleSignatureString(options.message)
    return this.verifyMessage(
      idToKey(messageString),
      idToKey(options.signature),
      idToKey(options.identityId)
    )
  }

  /**
   * @param {Object} options
   * @param {Object} options.message
   * @param {String} options.message.identityId
   * @param {String} options.message.authorId
   * @param {String} options.message.action
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {String[]} options.message.links
   * @param {String} options.signature
   * @param {String} options.identityId
   * @returns {Boolean}
   */
  #verifyDeviceMessage(options) {
    const messageString = this.#createDeviceSignatureString(options.message)
    return this.verifyMessage(
      idToKey(messageString),
      idToKey(options.signature),
      idToKey(options.identityId)
    )
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.coreId
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @returns {String}
   */
  #createCoreOwnerSignatureString(options) {
    return this.#createSignatureString([
      'core_owners',
      options.identityId,
      options.authorId,
      options.coreId,
      options.authorIndex,
      options.deviceIndex,
    ])
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.role
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {String[]} options.links
   * @returns {String}
   */
  #createRoleSignatureString(options) {
    return this.#createSignatureString([
      'roles',
      options.identityId,
      options.authorId,
      options.role,
      options.authorIndex,
      options.deviceIndex,
      options.links.join(','),
    ])
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.action
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {String[]} options.links
   * @returns {String}
   */
  #createDeviceSignatureString(options) {
    return this.#createSignatureString([
      'devices',
      options.identityId,
      options.authorId,
      options.action,
      options.authorIndex,
      options.deviceIndex,
      options.links.join(','),
    ])
  }

  /**
   *
   * @param {Array<String|Number>} fragments
   * @returns {String}
   */
  #createSignatureString(fragments) {
    return fragments.join(':')
  }

  /**
   * @param {String} version
   * @returns {Promise<CoreOwnershipStatement|null>}
   */
  getCoreOwnershipStatementByVersion(version) {
    return /** @type {Promise<CoreOwnershipStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * @param {String} version
   * @returns {Promise<RoleStatement|null>}}
   */
  getRoleStatementByVersion(version) {
    return /** @type {Promise<RoleStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * @param {String} version
   * @returns {Promise<DeviceStatement|null>}
   */
  getDeviceStatementByVersion(version) {
    return /** @type {Promise<DeviceStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * @param {String} coreId
   * @returns {CoreOwnershipStatement|null}
   */
  getCoreOwnershipStatementByCoreId(coreId) {
    return /** @type {CoreOwnershipStatement} */ (
      this.#sqlite.get(
        `SELECT * FROM core_ownership WHERE coreId = '${coreId}'`
      )
    )
  }

  /**
   * @param {String} id
   * @returns {CoreOwnershipStatement|null}
   */
  getCoreOwnershipStatementById(id) {
    return /** @type {CoreOwnershipStatement} */ (
      this.#sqlite.get(`SELECT * FROM core_ownership WHERE id = '${id}'`)
    )
  }

  /**
   * @param {String} id
   * @returns {RoleStatement|null}
   */
  getRoleStatementById(id) {
    return /** @type {RoleStatement} */ (
      this.#sqlite.get(`SELECT * FROM roles WHERE id = '${id}'`)
    )
  }

  /**
   * @param {String} id
   * @returns {DeviceStatement|null}
   */
  getDeviceStatementById(id) {
    return /** @type {DeviceStatement} */ (
      this.#sqlite.get(`SELECT * FROM devices WHERE id = '${id}'`)
    )
  }

  /**
   * @param {String} role
   * @returns {RoleStatement|null}
   */
  getRoleStatementByRole(role) {
    return /** @type {RoleStatement} */ (
      this.#sqlite.get(`SELECT * FROM roles WHERE role = '${role}'`)
    )
  }

  /**
   * @param {String} identityId
   * @returns {Promise<Number>}
   */
  async getDeviceIndex(identityId) {
    const blocks = await this.getBlocksByIdentityId(identityId)
    return blocks.length
  }

  /**
   *
   * @param {String} version
   * @returns {Promise<null|CoreOwnershipStatement|RoleStatement|DeviceStatement>}
   */
  async getBlockByVersion(version) {
    const [keyString, blockIndex] = version.split('@')
    const core = await this.getCore(keyString)
    const block = await core.get(blockIndex)
    if (!block) {
      return null
    }
    const dataType = this.#datastore.getDataTypeForBlock(block)
    return /** @type {CoreOwnershipStatement|RoleStatement|DeviceStatement} */ (
      dataType.decode(block)
    )
  }

  /**
   *
   * @param {Object} options
   * @param {String} options.identityId
   * @param {Number} options.deviceIndex
   * @returns {Promise<undefined|CoreOwnershipStatement|RoleStatement|DeviceStatement>}
   */
  async getBlockByDeviceIndex({ identityId, deviceIndex }) {
    const blocks = await this.getBlocksByIdentityId(identityId)
    return blocks.find((block) => {
      return block.deviceIndex === deviceIndex
    })
  }

  /**
   *
   * @param {Object} options
   * @param {String} options.authorId
   * @param {Number} options.authorIndex
   * @returns {Promise<undefined|CoreOwnershipStatement|RoleStatement|DeviceStatement>}
   */
  async getBlockByAuthorIndex({ authorId, authorIndex }) {
    const blocks = await this.getBlocksByAuthorId(authorId)
    return blocks.find((block) => {
      return block.authorIndex === authorIndex
    })
  }

  /**
   * Get the current length of the author's chain of links
   * @param {String} identityId
   * @returns {Promise<Number>}
   */
  async getAuthorIndex(identityId) {
    const blocks = await this.getBlocksByAuthorId(identityId)
    return blocks.length
  }

  /**
   * Get all blocks for a given author
   * @param {String} authorId
   * @returns {Promise<Array<CoreOwnershipStatement|RoleStatement|DeviceStatement>>}
   */
  async getBlocksByAuthorId(authorId) {
    let blocks = []

    for await (const block of this.getBlocks()) {
      if (block.authorId === authorId) {
        blocks.push(block)
      }
    }

    return blocks
  }

  /**
   * @param {String} identityId
   * @returns {Promise<Array<CoreOwnershipStatement|RoleStatement|DeviceStatement>>}
   */
  async getBlocksByIdentityId(identityId) {
    let blocks = []

    for await (const block of this.getBlocks()) {
      if (block.id === identityId) {
        blocks.push(block)
      }
    }

    return blocks
  }

  /**
   *
   * @param {Object} options
   * @param {string} options.dataType
   * @param {string} options.identityId
   * @returns {Promise<Array<CoreOwnershipStatement|RoleStatement|DeviceStatement>>}
   */
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

  /**
   * @returns {AsyncGenerator<CoreOwnershipStatement|RoleStatement|DeviceStatement>}
   * @yields {CoreOwnershipStatement|RoleStatement|DeviceStatement}
   */
  async *getBlocks() {
    for (const core of this.cores) {
      await core.ready()
      if (core.length) {
        for await (const buf of core.createReadStream()) {
          const dataType = this.#datastore.getDataTypeForBlock(buf)
          if (dataType) {
            const data = dataType.decode(buf)
            yield /** @type {CoreOwnershipStatement|RoleStatement|DeviceStatement} */ (
              data
            )
          }
        }
      }
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async indexing() {
    return this.#datastore.indexing()
  }

  /**
   * @param {PublicKey|String} coreKey
   * @param {Object} [options]
   * @returns {Promise<Core>}
   */
  async getCore(coreKey, options) {
    return this.#datastore.getCore(coreKey, options)
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Object[]}
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Object}
   */
  get(sql, params) {
    return this.#sqlite.get(sql, params)
  }

  /**
   * @param {Object} options - Options object passed to `corestore.replicate`
   */
  replicate(options) {
    return this.#datastore.replicate(options)
  }

  /**
   * @returns {Promise<void>}
   */
  async close() {
    await this.#datastore.close()
  }
}
