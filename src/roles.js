import { currentSchemaVersions } from '@comapeo/schema'
import mapObject from 'map-obj'
import { kCreateWithDocId, kDataStore } from './datatype/index.js'
import { assert, setHas } from './utils.js'
import { nullIfNotFound } from './errors.js'
import { TypedEmitter } from 'tiny-typed-emitter'
/** @import { Namespace } from './types.js' */

// Randomly generated 8-byte encoded as hex
export const CREATOR_ROLE_ID = 'a12a6702b93bd7ff'
export const COORDINATOR_ROLE_ID = 'f7c150f5a3a9a855'
export const MEMBER_ROLE_ID = '012fd2d431c0bf60'
export const BLOCKED_ROLE_ID = '9e6d29263cba36c9'
export const LEFT_ROLE_ID = '8ced989b1904606b'
export const FAILED_ROLE_ID = 'a24eaca65ab5d5d0'
export const NO_ROLE_ID = '08e4251e36f6e7ed'

/**
 * @typedef {T extends Iterable<infer U> ? U : never} ElementOf
 * @template T
 */

/** @typedef {ElementOf<typeof ROLE_IDS>} RoleId */
const ROLE_IDS = new Set(
  /** @type {const} */ ([
    CREATOR_ROLE_ID,
    COORDINATOR_ROLE_ID,
    MEMBER_ROLE_ID,
    BLOCKED_ROLE_ID,
    LEFT_ROLE_ID,
    FAILED_ROLE_ID,
    NO_ROLE_ID,
  ])
)
const isRoleId = setHas(ROLE_IDS)

/** @typedef {ElementOf<typeof ROLE_IDS_FOR_NEW_INVITE>} RoleIdForNewInvite */
const ROLE_IDS_FOR_NEW_INVITE = new Set(
  /** @type {const} */ ([COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID])
)
export const isRoleIdForNewInvite = setHas(ROLE_IDS_FOR_NEW_INVITE)

/** @typedef {ElementOf<typeof ROLE_IDS_ASSIGNABLE_TO_OTHERS>} RoleIdAssignableToOthers */
const ROLE_IDS_ASSIGNABLE_TO_OTHERS = new Set(
  /** @type {const} */ ([COORDINATOR_ROLE_ID, MEMBER_ROLE_ID, BLOCKED_ROLE_ID])
)
export const isRoleIdAssignableToOthers = setHas(ROLE_IDS_ASSIGNABLE_TO_OTHERS)

/** @typedef {ElementOf<typeof ROLE_IDS_ASSIGNABLE_TO_ANYONE>} RoleIdAssignableToAnyone */
const ROLE_IDS_ASSIGNABLE_TO_ANYONE = new Set(
  /** @type {const} */ ([
    COORDINATOR_ROLE_ID,
    MEMBER_ROLE_ID,
    BLOCKED_ROLE_ID,
    LEFT_ROLE_ID,
    FAILED_ROLE_ID,
  ])
)
const isRoleIdAssignableToAnyone = setHas(ROLE_IDS_ASSIGNABLE_TO_ANYONE)

/**
 * @typedef {object} DocCapability
 * @property {boolean} readOwn - can read own data
 * @property {boolean} writeOwn - can write own data
 * @property {boolean} readOthers - can read other's data
 * @property {boolean} writeOthers - can edit or delete other's data
 */

/**
 * @template {RoleId} [T=RoleId]
 * @typedef {object} Role
 * @property {T} roleId
 * @property {string} name
 * @property {Record<import('@comapeo/schema').MapeoDoc['schemaName'], DocCapability>} docs
 * @property {RoleIdAssignableToOthers[]} roleAssignment
 * @property {Record<Namespace, 'allowed' | 'blocked'>} sync
 */

/**
 * This is currently the same as 'Coordinator' role, but defined separately
 * because the creator should always have ALL powers, but we could edit the
 * 'Coordinator' powers in the future.
 *
 * @type {Role<typeof CREATOR_ROLE_ID>}
 */
export const CREATOR_ROLE = {
  roleId: CREATOR_ROLE_ID,
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
 * @type {Role<typeof BLOCKED_ROLE_ID>}
 */
const BLOCKED_ROLE = {
  roleId: BLOCKED_ROLE_ID,
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
}

/**
 * This role is used for devices that failed to sync after accepting an invite and being added
 * @type {Role<typeof FAILED_ROLE_ID>}
 */
const FAILED_ROLE = {
  roleId: FAILED_ROLE_ID,
  name: 'Failed',
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
}

/**
 * This is the role assumed for a device when no role record can be found. This
 * can happen when an invited device did not manage to sync with the device that
 * invited them, and they then try to sync with someone else. We want them to be
 * able to sync the auth and config store, because that way they may be able to
 * receive their role record, and they can get the project config so that they
 * can start collecting data.
 *
 * @type {Role<typeof NO_ROLE_ID>}
 */
export const NO_ROLE = {
  roleId: NO_ROLE_ID,
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

/** @type {{ [K in RoleId]: Role<K> }} */
export const ROLES = {
  [CREATOR_ROLE_ID]: CREATOR_ROLE,
  [MEMBER_ROLE_ID]: {
    roleId: MEMBER_ROLE_ID,
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
    roleId: COORDINATOR_ROLE_ID,
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
  [BLOCKED_ROLE_ID]: BLOCKED_ROLE,
  [LEFT_ROLE_ID]: {
    roleId: LEFT_ROLE_ID,
    name: 'Left',
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
      auth: 'allowed',
      config: 'blocked',
      data: 'blocked',
      blobIndex: 'blocked',
      blob: 'blocked',
    },
  },
  [NO_ROLE_ID]: NO_ROLE,
  [FAILED_ROLE_ID]: FAILED_ROLE,
}

/**
 * @typedef {object} RolesEvents
 * @property {(docIds: Set<string>) => void} update Emitted when new role records are indexed
 */

/**
 * @extends {TypedEmitter<RolesEvents>}
 */
export class Roles extends TypedEmitter {
  #dataType
  #coreOwnership
  #coreManager
  #projectCreatorAuthCoreId
  #ownDeviceId

  static NO_ROLE = NO_ROLE

  /**
   *
   * @param {object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'auth'>,
   *   typeof import('./schema/project.js').roleTable,
   *   'role',
   *   import('@comapeo/schema').Role,
   *   import('@comapeo/schema').RoleValue
   * >} opts.dataType
   * @param {import('./core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {import('./core-manager/index.js').CoreManager} opts.coreManager
   * @param {Buffer} opts.projectKey
   * @param {Buffer} opts.deviceKey public key of this device
   */
  constructor({ dataType, coreOwnership, coreManager, projectKey, deviceKey }) {
    super()
    this.#dataType = dataType
    this.#coreOwnership = coreOwnership
    this.#coreManager = coreManager
    this.#projectCreatorAuthCoreId = projectKey.toString('hex')
    this.#ownDeviceId = deviceKey.toString('hex')
    dataType[kDataStore].on('role', this.emit.bind(this, 'update'))
  }

  /**
   * Get the role for device `deviceId`.
   *
   * @param {string} deviceId
   * @returns {Promise<Role>}
   */
  async getRole(deviceId) {
    const roleRecord = await this.#dataType
      .getByDocId(deviceId)
      .catch(nullIfNotFound)
    if (!roleRecord) {
      // The project creator will have the creator role
      const authCoreId = await this.#coreOwnership.getCoreId(deviceId, 'auth')
      if (authCoreId === this.#projectCreatorAuthCoreId) {
        return CREATOR_ROLE
      } else {
        // When no role assignment exists, e.g. a newly added device which has
        // not yet synced role records.
        return NO_ROLE
      }
    }

    const { roleId } = roleRecord
    if (!isRoleId(roleId)) {
      return BLOCKED_ROLE
    }
    return ROLES[roleId]
  }

  /**
   * Get roles of all devices in the project. For your own device, if you have
   * not yet synced your own role record, the "no role" capabilties is
   * returned. The project creator will have the creator role unless a
   * different one has been assigned.
   *
   * @returns {Promise<Map<string, Role>>} Map of deviceId to Role
   */
  async getAll() {
    const roles = await this.#dataType.getMany()
    /** @type {Map<string, Role>} */
    const result = new Map()
    /** @type {undefined | string} */
    let projectCreatorDeviceId
    try {
      projectCreatorDeviceId = await this.#coreOwnership.getOwner(
        this.#projectCreatorAuthCoreId
      )
      // Default to creator role, but can be overwritten if a different role is
      // set below
      result.set(projectCreatorDeviceId, CREATOR_ROLE)
    } catch (e) {
      // Not found, we don't know who the project creator is so we can't include
      // them in the returned map
    }

    for (const role of roles) {
      if (!isRoleId(role.roleId)) {
        console.error("Found a value that wasn't a role ID")
        continue
      }
      if (role.roleId === CREATOR_ROLE_ID) {
        console.error('Unexpected creator role')
        continue
      }
      const deviceId = role.docId
      result.set(deviceId, ROLES[role.roleId])
    }
    const includesSelf = result.has(this.#ownDeviceId)
    if (!includesSelf) {
      const isProjectCreator = this.#ownDeviceId === projectCreatorDeviceId
      result.set(this.#ownDeviceId, isProjectCreator ? CREATOR_ROLE : NO_ROLE)
    }
    return result
  }

  /**
   * Assign a role to the specified `deviceId`. Devices without an assigned role
   * are unable to sync, except the project creator who can do anything. Only
   * the project creator can assign their own role. Will throw if the device's
   * role cannot assign the role by consulting `roleAssignment`.
   *
   * @param {string} deviceId
   * @param {RoleIdAssignableToAnyone} roleId
   */
  async assignRole(deviceId, roleId) {
    assert(
      isRoleIdAssignableToAnyone(roleId),
      `Role ID should be assignable to anyone but got ${roleId}`
    )

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

    if (roleId === LEFT_ROLE_ID) {
      if (deviceId !== this.#ownDeviceId) {
        throw new Error('Cannot assign LEFT role to another device')
      }
    } else if (roleId === FAILED_ROLE_ID) {
      const ownRole = await this.getRole(this.#ownDeviceId)
      if (!ownRole.roleAssignment.includes(COORDINATOR_ROLE_ID)) {
        throw new Error('Lacks permission to assign role ' + roleId)
      }
    } else {
      const ownRole = await this.getRole(this.#ownDeviceId)
      if (!ownRole.roleAssignment.includes(roleId)) {
        throw new Error('Lacks permission to assign role ' + roleId)
      }
    }

    const existingRoleDoc = await this.#dataType
      .getByDocId(deviceId)
      .catch(nullIfNotFound)

    if (existingRoleDoc) {
      await this.#dataType.update(
        [existingRoleDoc.versionId, ...existingRoleDoc.forks],
        {
          schemaName: 'role',
          roleId,
          fromIndex,
        }
      )
    } else {
      await this.#dataType[kCreateWithDocId](deviceId, {
        schemaName: 'role',
        roleId,
        fromIndex,
      })
    }
  }

  #isProjectCreator() {
    const ownAuthCoreId = this.#coreManager
      .getWriterCore('auth')
      .key.toString('hex')
    return ownAuthCoreId === this.#projectCreatorAuthCoreId
  }
}
