import { currentSchemaVersions } from '@mapeo/schema'
import mapObject from 'map-obj'
import { kCreateWithDocId } from './datatype/index.js'

// Randomly generated 8-byte encoded as hex
export const COORDINATOR_ROLE_ID = 'f7c150f5a3a9a855'
export const MEMBER_ROLE_ID = '012fd2d431c0bf60'
export const BLOCKED_ROLE_ID = '9e6d29263cba36c9'

/**
 * @typedef {object} DocCapability
 * @property {boolean} readOwn - can read own data
 * @property {boolean} writeOwn - can write own data
 * @property {boolean} readOthers - can read other's data
 * @property {boolean} writeOthers - can edit or delete other's data
 */

/**
 * @typedef {object} Capability
 * @property {string} name
 * @property {Record<import('@mapeo/schema').MapeoDoc['schemaName'], DocCapability>} docs
 * @property {RoleId[]} roleAssignment
 * @property {Record<import('./core-manager/core-index.js').Namespace, 'allowed' | 'blocked'>} sync
 */

/**
 * @typedef {typeof COORDINATOR_ROLE_ID | typeof MEMBER_ROLE_ID | typeof BLOCKED_ROLE_ID} RoleId
 */

/**
 * This is currently the same as 'Coordinator' capabilities, but defined
 * separately because the creator should always have ALL capabilities, but we
 * could edit 'Coordinator' capabilities in the future
 *
 * @type {Capability}
 */
export const CREATOR_CAPABILITIES = {
  name: 'Project Creator',
  docs: mapObject(currentSchemaVersions, (key) => {
    return [
      key,
      { readOwn: true, writeOwn: true, readOthers: true, writeOthers: true },
    ]
  }),
  roleAssignment: [COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID],
  sync: {
    auth: 'allowed',
    config: 'allowed',
    data: 'allowed',
    blobIndex: 'allowed',
    blob: 'allowed',
  },
}

/**
 * These are the capabilities assumed for a device when no capability record can
 * be found. This can happen when an invited device did not manage to sync with
 * the device that invited them, and they then try to sync with someone else. We
 * want them to be able to sync the auth and config store, because that way they
 * may be able to receive their role record, and they can get the project config
 * so that they can start collecting data.
 *
 * @type {Capability}
 */
export const NO_ROLE_CAPABILITIES = {
  name: 'No Role',
  docs: mapObject(currentSchemaVersions, (key) => {
    return [
      key,
      { readOwn: true, writeOwn: true, readOthers: false, writeOthers: false },
    ]
  }),
  roleAssignment: [],
  sync: {
    auth: 'allowed',
    config: 'allowed',
    data: 'blocked',
    blobIndex: 'blocked',
    blob: 'blocked',
  },
}

/** @type {Record<RoleId, Capability>} */
export const DEFAULT_CAPABILITIES = {
  [MEMBER_ROLE_ID]: {
    name: 'Member',
    docs: mapObject(currentSchemaVersions, (key) => {
      return [
        key,
        { readOwn: true, writeOwn: true, readOthers: true, writeOthers: false },
      ]
    }),
    roleAssignment: [],
    sync: {
      auth: 'allowed',
      config: 'allowed',
      data: 'allowed',
      blobIndex: 'allowed',
      blob: 'allowed',
    },
  },
  [COORDINATOR_ROLE_ID]: {
    name: 'Coordinator',
    docs: mapObject(currentSchemaVersions, (key) => {
      return [
        key,
        { readOwn: true, writeOwn: true, readOthers: true, writeOthers: true },
      ]
    }),
    roleAssignment: [COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID],
    sync: {
      auth: 'allowed',
      config: 'allowed',
      data: 'allowed',
      blobIndex: 'allowed',
      blob: 'allowed',
    },
  },
  [BLOCKED_ROLE_ID]: {
    name: 'Blocked',
    docs: mapObject(currentSchemaVersions, (key) => {
      return [
        key,
        {
          readOwn: false,
          writeOwn: false,
          readOthers: false,
          writeOthers: false,
        },
      ]
    }),
    roleAssignment: [],
    sync: {
      auth: 'blocked',
      config: 'blocked',
      data: 'blocked',
      blobIndex: 'blocked',
      blob: 'blocked',
    },
  },
}

export class Capabilities {
  #dataType
  #coreOwnership
  #coreManager
  #projectCreatorAuthCoreId
  #ownDeviceId

  static NO_ROLE_CAPABILITIES = NO_ROLE_CAPABILITIES

  /**
   *
   * @param {object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'auth'>,
   *   typeof import('./schema/project.js').roleTable,
   *   'role',
   *   import('@mapeo/schema').Role,
   *   import('@mapeo/schema').RoleValue
   * >} opts.dataType
   * @param {import('./core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {import('./core-manager/index.js').CoreManager} opts.coreManager
   * @param {Buffer} opts.projectKey
   * @param {Buffer} opts.deviceKey public key of this device
   */
  constructor({ dataType, coreOwnership, coreManager, projectKey, deviceKey }) {
    this.#dataType = dataType
    this.#coreOwnership = coreOwnership
    this.#coreManager = coreManager
    this.#projectCreatorAuthCoreId = projectKey.toString('hex')
    this.#ownDeviceId = deviceKey.toString('hex')
  }

  /**
   * Get the capabilities for device `deviceId`.
   *
   * @param {string} deviceId
   * @returns {Promise<Capability>}
   */
  async getCapabilities(deviceId) {
    let roleId
    try {
      const roleAssignment = await this.#dataType.getByDocId(deviceId)
      roleId = roleAssignment.roleId
    } catch (e) {
      // The project creator will have all capabilities
      const authCoreId = await this.#coreOwnership.getCoreId(deviceId, 'auth')
      if (authCoreId === this.#projectCreatorAuthCoreId) {
        return CREATOR_CAPABILITIES
      } else {
        // When no role assignment exists, e.g. a newly added device which has
        // not yet synced role records.
        return NO_ROLE_CAPABILITIES
      }
    }
    if (!isKnownRoleId(roleId)) {
      return DEFAULT_CAPABILITIES[BLOCKED_ROLE_ID]
    }
    const capabilities = DEFAULT_CAPABILITIES[roleId]
    return capabilities
  }

  /**
   * Get capabilities of all devices in the project. For your own device, if you
   * have not yet synced your own role record, the "no role" capabilties is
   * returned. The project creator will have `CREATOR_CAPABILITIES` unless a
   * different role has been assigned.
   *
   * @returns {Promise<Record<string, Capability>>} Map of deviceId to Capability
   */
  async getAll() {
    const roles = await this.#dataType.getMany()
    let projectCreatorDeviceId
    try {
      projectCreatorDeviceId = await this.#coreOwnership.getOwner(
        this.#projectCreatorAuthCoreId
      )
    } catch (e) {
      // Not found, we don't know who the project creator is so we can't include
      // them in the returned map
    }
    /** @type {Record<string, Capability>} */
    const capabilities = {}
    for (const role of roles) {
      const deviceId = role.docId
      if (!isKnownRoleId(role.roleId)) continue
      capabilities[deviceId] = DEFAULT_CAPABILITIES[role.roleId]
    }
    const includesSelf = Boolean(capabilities[this.#ownDeviceId])
    if (!includesSelf) {
      const isProjectCreator = this.#ownDeviceId === projectCreatorDeviceId
      if (isProjectCreator) {
        capabilities[this.#ownDeviceId] = CREATOR_CAPABILITIES
      } else {
        capabilities[this.#ownDeviceId] = NO_ROLE_CAPABILITIES
      }
    }
    return capabilities
  }

  /**
   * Assign a role to the specified `deviceId`. Devices without an assigned role
   * are unable to sync, except the project creator that defaults to having all
   * capabilities. Only the project creator can assign their own role. Will
   * throw if the device trying to assign the role lacks the `roleAssignment`
   * capability for the given roleId
   *
   * @param {string} deviceId
   * @param {keyof DEFAULT_CAPABILITIES} roleId
   */
  async assignRole(deviceId, roleId) {
    let fromIndex = 0
    let authCoreId
    try {
      authCoreId = await this.#coreOwnership.getCoreId(deviceId, 'auth')
      const authCoreKey = Buffer.from(authCoreId, 'hex')
      const authCore = this.#coreManager.getCoreByKey(authCoreKey)
      if (authCore) {
        await authCore.ready()
        fromIndex = authCore.length
      }
    } catch {
      // This will usually happen when assigning a role to a newly invited
      // device that has not yet synced (so we do not yet have a replica of
      // their authCore). In this case we want fromIndex to be 0
    }
    const isAssigningProjectCreatorRole =
      authCoreId === this.#projectCreatorAuthCoreId
    if (isAssigningProjectCreatorRole && !this.#isProjectCreator()) {
      throw new Error(
        "Only the project creator can assign the project creator's role"
      )
    }
    const ownCapabilities = await this.getCapabilities(this.#ownDeviceId)
    if (!ownCapabilities.roleAssignment.includes(roleId)) {
      throw new Error('No capability to assign role ' + roleId)
    }
    await this.#dataType[kCreateWithDocId](deviceId, {
      schemaName: 'role',
      roleId,
      fromIndex,
    })
  }

  async #isProjectCreator() {
    const ownAuthCoreId = this.#coreManager
      .getWriterCore('auth')
      .key.toString('hex')
    return ownAuthCoreId === this.#projectCreatorAuthCoreId
  }
}

/**
 *
 * @param {string} roleId
 * @returns {roleId is keyof DEFAULT_CAPABILITIES}
 */
function isKnownRoleId(roleId) {
  return roleId in DEFAULT_CAPABILITIES
}
