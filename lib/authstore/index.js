import sodium from 'sodium-universal'
import b4a from 'b4a'

import { DataStore } from '../datastore/index.js'
import { idToKey, keyToId, parseVersion } from '../utils.js'

import { coreOwnership, devices, roles, defaultRoles } from './authtypes.js'

export class AuthStore {
  #keyPair
  #identityKeyPair
  #corestore
  #availableRoles
  #datastore
  #sqlite

  /**
   * A class for managing capability statements that provide authorization in a project.
   * @param {Object} options
   * @param {PublicKey} [options.projectPublicKey] the public key of the project. Only needed if user is not the project owner.
   * @param {KeyPair} options.keyPair The key pair used for the local writer hypercore.
   * @param {IdentityKeyPair} options.identityKeyPair The key pair of the identity.
   * @param {import('corestore')} options.corestore
   * @param {import('../sqlite.js').Sqlite} options.sqlite An instance of the internal Sqlite class.
   * @param {AvailableRoles} [options.roles] An array of role names and capabilities.
   */
  constructor(options) {
    this.#keyPair = options.keyPair
    this.#identityKeyPair = options.identityKeyPair
    this.#corestore = options.corestore
    this.#availableRoles = options.roles || defaultRoles
    this.#sqlite = options.sqlite

    if (!options.projectPublicKey) {
      this.projectPublicKey = this.#keyPair.publicKey
    } else {
      this.projectPublicKey = options.projectPublicKey
    }

    this.#datastore = new DataStore({
      corestore: this.#corestore,
      sqlite: options.sqlite,
      keyPair: this.#keyPair,
      identityPublicKey: this.#identityKeyPair.publicKey,
      dataTypes: [coreOwnership, devices, roles],
    })
  }

  /**
   * @returns {string} The id of the local writer hypercore.
   */
  get id() {
    return keyToId(this.key)
  }

  /**
   * @returns {PublicKey} The public key of the local writer hypercore.
   */
  get key() {
    return this.#keyPair.publicKey
  }

  /**
   * @returns {string} The id of the identity of this device.
   */
  get authorId() {
    return keyToId(this.#identityKeyPair.publicKey)
  }

  /**
   * @returns {string[]} The ids of the local writer hypercore and remote peer hypercores.
   */
  get keys() {
    return this.cores.map((core) => {
      return core.key.toString('hex')
    })
  }

  /**
   * @returns {import('hypercore')[]} The local writer hypercore and remote peer hypercores.
   */
  get cores() {
    return [...this.#corestore.cores.values()]
  }

  /**
   * Wait for the internals of authstore to be ready.
   * @returns {Promise<void>}
   */
  async ready() {
    await this.#datastore.ready()

    this.coreOwnership = this.#datastore.getDataType('coreOwnership')
    this.devices = this.#datastore.getDataType('devices')
    this.roles = this.#datastore.getDataType('roles')

    await this.#init()
  }

  /**
   *  Initialize the local writer hypercore.
   *  @returns {Promise<void>}
   */
  async #init() {
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

  /**
   * Create the statements for the project creator role. Only to be called once on initital project creation.
   * @returns {Promise<void>}
   */
  async initProjectCreator() {
    await this.setProjectCreator()
    await this.addDevice({ identityId: this.authorId })
  }

  /**
   * Create the core ownership statement for a given core key
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

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(this.authorId)

    if (authorIndex !== 0 || deviceIndex !== 0) {
      throw new Error('Only the project creator can set the core owner')
    }

    const timestamp = new Date().getTime()
    const signature = this.#signCoreOwnerMessage({
      identityId: this.authorId,
      authorId: this.authorId,
      coreId,
      projectId: this.id,
      storeType: 'auth',
      authorIndex,
      deviceIndex,
      timestamp,
    })

    return this.coreOwnership?.create({
      id: this.authorId,
      authorId: this.authorId,
      type: 'coreOwnership',
      coreId,
      storeType: 'auth',
      action: 'core:owner',
      created: timestamp,
      signature,
      authorIndex,
      deviceIndex,
    })
  }

  /**
   * Get the owner of a core by its id.
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
   * Verify a core ownership statement.
   * @param {CoreOwnershipStatement} statement
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async verifyCoreOwner(statement) {
    const {
      id,
      authorId,
      coreId,
      signature,
      authorIndex,
      deviceIndex,
      timestamp,
    } = statement

    const verified = this.#verifyCoreOwnerMessage({
      signature,
      identityId: id,
      message: {
        identityId: id,
        authorId,
        coreId,
        projectId: this.id,
        storeType: 'auth',
        authorIndex,
        deviceIndex,
        timestamp,
      },
    })

    if (!verified) {
      throw new Error('Core ownership not verified')
    }
  }

  /**
   * Get the statement for the creator of the project.
   * @returns {Promise<RoleStatement|null>}
   * @throws {Error}
   */
  async getProjectCreator() {
    const statement = this.getRoleStatementByRole('project-creator')

    if (!statement) {
      return null
    }

    await this.verifyProjectCreator(statement)
    return statement
  }

  /**
   * Create the statement for the project creator role.
   * @returns {Promise<RoleStatement>}
   * @throws {Error}
   */
  async setProjectCreator() {
    const existing = await this.getProjectCreator()
    if (existing) {
      throw new Error('Project already has a creator')
    }

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(this.authorId)

    if (authorIndex !== 1 && deviceIndex !== 1) {
      throw new Error(
        'Project creator record must be created by the first device'
      )
    }

    const ownershipStatement = /** @type {CoreOwnershipStatement} */ (
      await this.getBlockByAuthorIndex({
        authorIndex: authorIndex - 1,
        authorId: this.authorId,
      })
    )

    if (!ownershipStatement) {
      throw new Error('No ownership statement found')
    }

    this.verifyCoreOwner(ownershipStatement)

    const timestamp = new Date().getTime()
    const signature = this.#signRoleMessage({
      identityId: this.authorId,
      authorId: this.authorId,
      role: 'project-creator',
      projectId: this.id,
      authorIndex,
      deviceIndex,
      timestamp,
      links: [ownershipStatement.version],
    })

    return /** @type {Promise<RoleStatement>} */ (
      this.roles?.create({
        id: this.authorId,
        type: 'roles',
        role: 'project-creator',
        projectId: this.id,
        created: timestamp,
        signature,
        action: 'role:set',
        authorIndex,
        deviceIndex,
        links: [ownershipStatement.version],
      })
    )
  }

  /**
   * Verify a project creator role statement.
   * @param {RoleStatement} roleStatement
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async verifyProjectCreator(roleStatement) {
    const {
      id,
      authorId,
      signature,
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    } = roleStatement

    if (
      !roleStatement ||
      !roleStatement.id ||
      roleStatement.type !== 'roles' ||
      roleStatement.role !== 'project-creator' ||
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
        projectId: this.id,
        role: 'project-creator',
        authorIndex,
        deviceIndex,
        timestamp,
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
   * Get the statement for a device by its identityId.
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
   * Verify a device statement.
   * @param {DeviceStatement} statement
   */
  async verifyDevice(statement) {
    const {
      id,
      signature,
      authorId,
      action,
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    } = statement

    const verified = this.#verifyDeviceMessage({
      signature,
      identityId: authorId,
      message: {
        identityId: id,
        authorId,
        projectId: this.id,
        action,
        authorIndex,
        deviceIndex,
        timestamp,
        links,
      },
    })

    if (!verified) {
      throw new Error('Device not verified')
    }

    await this.verifyLinks(links)
  }

  /**
   * Add a device to the project.
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

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(identityId)
    const authorRole = await this.getRole({ identityId: this.authorId })

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

    const timestamp = new Date().getTime()
    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      projectId: this.id,
      action: 'device:add',
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    })

    return /** @type {Promise<DeviceStatement>} */ (
      this.devices?.create({
        id: identityId,
        authorId: this.authorId,
        projectId: this.id,
        type: 'devices',
        action: 'device:add',
        created: timestamp,
        signature,
        authorIndex,
        deviceIndex,
        links,
      })
    )
  }

  /**
   * Remove a device from the project.
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

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(identityId)

    const authorRole = await this.getRole({ identityId: this.authorId })

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

    const timestamp = new Date().getTime()
    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      projectId: this.id,
      action: 'device:remove',
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    })

    return /** @type {Promise<DeviceStatement>} */ (
      this.devices?.create({
        id: identityId,
        authorId: this.authorId,
        projectId: this.id,
        type: 'devices',
        action: 'device:remove',
        created: timestamp,
        signature,
        authorIndex,
        deviceIndex,
        links,
      })
    )
  }

  /**
   * Restore a device that has been removed from the project.
   * @param {Object} options
   * @param {String} options.identityId
   * @returns {Promise<DeviceStatement>}
   */
  async restoreDevice(options) {
    const { identityId } = options

    // order blocks by deviceIndex so we can check that they were created in the correct order
    const existing = (
      await this.getBlocksByType({ dataType: 'devices', identityId })
    ).sort((a, b) => {
      return b.deviceIndex - a.deviceIndex
    })

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

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(identityId)

    const authorRole = await this.getRole({ identityId: this.authorId })

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

    const timestamp = new Date().getTime()
    const signature = this.#signDeviceMessage({
      identityId,
      authorId: authorRole.id,
      projectId: this.id,
      action: 'device:restore',
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    })

    return /** @type {Promise<DeviceStatement>} */ (
      this.devices?.create({
        id: identityId,
        authorId: this.authorId,
        projectId: this.id,
        type: 'devices',
        action: 'device:restore',
        created: timestamp,
        signature,
        authorIndex,
        deviceIndex,
        links,
      })
    )
  }

  /**
   * Set the role of an identity in the project.
   * @param {Object} options
   * @param {String} options.role
   * @param {String} options.identityId
   * @returns {Promise<RoleStatement>}
   * @throws {Error}
   */
  async setRole(options) {
    const { role, identityId } = options

    const existing = await this.getRole({ identityId })
    const authorRole = await this.getRole({ identityId: this.authorId })

    if (existing && existing.role === role) {
      throw new Error(`Role ${role} already set`)
    }

    if (existing && existing.role === 'project-creator') {
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

    const authorIndex = await this.getAuthorIndex(this.authorId)
    const deviceIndex = await this.getDeviceIndex(this.authorId)

    const ownershipStatement = /** @type {CoreOwnershipStatement} */ (
      await this.getBlockByAuthorIndex({
        authorIndex: authorIndex - 1,
        authorId: this.authorId,
      })
    )

    const links = []
    if (ownershipStatement) {
      links.push(ownershipStatement.version)
    }

    this.verifyRole(authorRole)

    const timestamp = new Date().getTime()
    const signature = this.#signRoleMessage({
      identityId,
      authorId: authorRole.id,
      role,
      projectId: this.id,
      authorIndex,
      deviceIndex,
      timestamp,
      links,
    })

    return /** @type {Promise<RoleStatement>} */ (
      this.roles?.create({
        id: identityId,
        type: 'roles',
        role,
        projectId: this.id,
        created: timestamp,
        signature,
        action: 'role:set',
        authorIndex,
        deviceIndex,
        links,
      })
    )
  }

  /**
   * Get the role of an identity in the project.
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

    if (statement.role === 'project-creator') {
      await this.verifyProjectCreator(statement)
    } else {
      await this.verifyRole(statement)
    }
    return statement
  }

  /**
   * @param {RoleStatement} options
   * @returns {Promise<void>}
   * @throws {Error}
   */
  async verifyRole(options) {
    const {
      id,
      authorId,
      role,
      signature,
      links,
      authorIndex,
      deviceIndex,
      timestamp,
    } = options

    if (role === 'project-creator') {
      return this.verifyProjectCreator(options)
    }

    const verified = this.#verifyRoleMessage({
      identityId: authorId,
      signature,
      message: {
        identityId: id,
        authorId,
        projectId: this.id,
        role,
        authorIndex,
        deviceIndex,
        timestamp,
        links,
      },
    })

    if (!verified) {
      throw new Error('Role not verified: signature not verified')
    }

    await this.verifyLinks(links)
  }

  /**
   * Verify the links of a statement.
   * @param {String[]} links
   * @returns {Promise<void>}
   * @throws {Error}
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
      } else if (block.type === 'coreOwnership') {
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
   * @param {String} options.storeType
   * @param {String} options.projectId
   * @param {Number} options.authorIndex
   * @param {Number} options.timestamp
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
   * @param {String} options.projectId
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {Number} options.timestamp
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
   * @param {String} options.projectId
   * @param {String} options.action
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {Number} options.timestamp
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
   * @param {String} options.message.projectId
   * @param {String} options.message.storeType
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {Number} options.message.timestamp
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
   * @param {String} options.message.projectId
   * @param {String} options.message.role
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {Number} options.message.timestamp
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
   * @param {String} options.message.projectId
   * @param {String} options.message.action
   * @param {Number} options.message.authorIndex
   * @param {Number} options.message.deviceIndex
   * @param {Number} options.message.timestamp
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
   * @param {String} options.projectId
   * @param {String} options.storeType
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {Number} options.timestamp
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
      options.timestamp,
    ])
  }

  /**
   * @param {Object} options
   * @param {String} options.identityId
   * @param {String} options.authorId
   * @param {String} options.projectId
   * @param {String} options.role
   * @param {Number} options.authorIndex
   * @param {Number} options.deviceIndex
   * @param {Number} options.timestamp
   * @param {String[]} options.links
   * @returns {String}
   */
  #createRoleSignatureString(options) {
    return this.#createSignatureString([
      'roles',
      options.identityId,
      options.authorId,
      options.projectId,
      options.role,
      options.authorIndex,
      options.deviceIndex,
      options.timestamp,
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
   * @param {Number} options.timestamp
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
      options.timestamp,
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
   * Sign a message with the identity key pair.
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
   * Verify that a message was signed by the given identity.
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
   * Get a core ownership statement by version.
   * @param {String} version
   * @returns {Promise<CoreOwnershipStatement|null>}
   */
  getCoreOwnershipStatementByVersion(version) {
    return /** @type {Promise<CoreOwnershipStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * Get a role statement by version.
   * @param {String} version
   * @returns {Promise<RoleStatement|null>}}
   */
  getRoleStatementByVersion(version) {
    return /** @type {Promise<RoleStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * Get a device statement by version.
   * @param {String} version
   * @returns {Promise<DeviceStatement|null>}
   */
  getDeviceStatementByVersion(version) {
    return /** @type {Promise<DeviceStatement>} */ (
      this.getBlockByVersion(version)
    )
  }

  /**
   * Get a core ownership statement by coreId.
   * @param {String} coreId
   * @returns {CoreOwnershipStatement|null}
   */
  getCoreOwnershipStatementByCoreId(coreId) {
    return /** @type {CoreOwnershipStatement} */ (
      this.#sqlite.get(`SELECT * FROM coreOwnership WHERE coreId = '${coreId}'`)
    )
  }

  /**
   * Get a core ownership statement by id.
   * @param {String} id
   * @returns {CoreOwnershipStatement|null}
   */
  getCoreOwnershipStatementById(id) {
    return /** @type {CoreOwnershipStatement} */ (
      this.#sqlite.get(`SELECT * FROM coreOwnership WHERE id = '${id}'`)
    )
  }

  /**
   * Get a role statement by id.
   * @param {String} id
   * @returns {RoleStatement|null}
   */
  getRoleStatementById(id) {
    return /** @type {RoleStatement} */ (
      this.#sqlite.get(`SELECT * FROM roles WHERE id = '${id}'`)
    )
  }

  /**
   * Get a device statement by id.
   * @param {String} id
   * @returns {DeviceStatement|null}
   */
  getDeviceStatementById(id) {
    return /** @type {DeviceStatement} */ (
      this.#sqlite.get(`SELECT * FROM devices WHERE id = '${id}'`)
    )
  }

  /**
   * Get a role statement by role.
   * @param {String} role
   * @returns {RoleStatement|null}
   */
  getRoleStatementByRole(role) {
    return /** @type {RoleStatement} */ (
      this.#sqlite.get(`SELECT * FROM roles WHERE role = '${role}'`)
    )
  }

  /**
   * Get the current length of statements for a device.
   * @param {String} identityId
   * @returns {Promise<Number>}
   */
  async getDeviceIndex(identityId) {
    const blocks = await this.getBlocksByIdentityId(identityId)
    return blocks.length
  }

  /**
   * Get a block by its version.
   * @param {String} version
   * @returns {Promise<null|CoreOwnershipStatement|RoleStatement|DeviceStatement>}
   */
  async getBlockByVersion(version) {
    const { coreId, blockIndex } = parseVersion(version)
    const core = await this.getCore(coreId)
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
   * Get a block by the device index.
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
   * Get a block by the author index.
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
   * Get all blocks for a given identity.
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
   * Get all blocks for a given data type.
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
   * Get all blocks.
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
   * Wait for indexing to complete.
   * @returns {Promise<void>}
   */
  async indexing() {
    return this.#datastore.indexing()
  }

  /**
   * Get a hypercore.
   * @param {PublicKey|String} coreKey
   * @param {Object} [options]
   * @returns {Promise<import('hypercore')>}
   */
  async getCore(coreKey, options) {
    return this.#datastore.getCore(coreKey, options)
  }

  /**
   * Query the sqlite index of documents.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Object[]}
   */
  query(sql, params) {
    return this.#sqlite.query(sql, params)
  }

  /**
   * Get a single row from the sqlite index of documents.
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Object}
   */
  get(sql, params) {
    return this.#sqlite.get(sql, params)
  }

  /**
   * Replicate all hypercores.
   * @param {Boolean} isInitiator - a boolean indicating whether this device is initiating or responding to a connection
   * @param {Object} options - Options object passed to `corestore.replicate`
   */
  replicate(isInitiator, options) {
    return this.#datastore.replicate(isInitiator, options)
  }

  /**
   * Close the internals of authstore.
   * @returns {Promise<void>}
   */
  async close() {
    await this.#datastore.close()
  }
}
