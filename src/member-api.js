import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { assert, projectKeyToId } from './utils.js'
import { ROLES, isRoleIdForNewInvite } from './roles.js'

/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/project.js').deviceInfoTable, "deviceInfo", import('@mapeo/schema').DeviceInfo, import('@mapeo/schema').DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/client.js').projectSettingsTable, "projectSettings", import('@mapeo/schema').ProjectSettings, import('@mapeo/schema').ProjectSettingsValue>} ProjectDataType */
/**
 * @typedef {object} MemberInfo
 * @prop {string} deviceId
 * @prop {import('./roles.js').Role} role
 * @prop {import('@mapeo/schema').DeviceInfo['name']} [name]
 * @prop {import('@mapeo/schema').DeviceInfo['deviceType']} [deviceType]
 */

export class MemberApi extends TypedEmitter {
  #ownDeviceId
  #roles
  #coreOwnership
  #encryptionKeys
  #projectKey
  #rpc
  #dataTypes

  /**
   * @param {Object} opts
   * @param {string} opts.deviceId public key of this device as hex string
   * @param {import('./roles.js').Roles} opts.roles
   * @param {import('./core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {Buffer} opts.projectKey
   * @param {import('./local-peers.js').LocalPeers} opts.rpc
   * @param {Object} opts.dataTypes
   * @param {Pick<DeviceInfoDataType, 'getByDocId' | 'getMany'>} opts.dataTypes.deviceInfo
   * @param {Pick<ProjectDataType, 'getByDocId'>} opts.dataTypes.project
   */
  constructor({
    deviceId,
    roles,
    coreOwnership,
    encryptionKeys,
    projectKey,
    rpc,
    dataTypes,
  }) {
    super()
    this.#ownDeviceId = deviceId
    this.#roles = roles
    this.#coreOwnership = coreOwnership
    this.#encryptionKeys = encryptionKeys
    this.#projectKey = projectKey
    this.#rpc = rpc
    this.#dataTypes = dataTypes
  }

  /**
   * @param {string} deviceId
   * @param {Object} opts
   * @param {import('./roles.js').RoleIdForNewInvite} opts.roleId
   * @param {string} [opts.roleName]
   * @param {string} [opts.roleDescription]
   * @param {number} [opts.timeout]
   *
   * @returns {Promise<import('./generated/rpc.js').InviteResponse_Decision>}
   */
  async invite(deviceId, { roleId, roleName, roleDescription, timeout }) {
    assert(isRoleIdForNewInvite(roleId), 'Invalid role ID for new invite')

    const { name: deviceName } = await this.getById(this.#ownDeviceId)

    // since we are always getting #ownDeviceId,
    // this should never throw (see comment on getById), but it pleases ts
    if (!deviceName)
      throw new Error(
        'Internal error trying to read own device name for this invite'
      )

    const projectId = projectKeyToId(this.#projectKey)
    const project = await this.#dataTypes.project.getByDocId(projectId)

    if (!project.name)
      throw new Error('Project must have a name to invite people')

    const response = await this.#rpc.invite(deviceId, {
      projectKey: this.#projectKey,
      encryptionKeys: this.#encryptionKeys,
      projectInfo: { name: project.name },
      roleName: roleName || ROLES[roleId].name,
      roleDescription,
      invitorName: deviceName,
      timeout,
    })

    if (response === InviteResponse_Decision.ACCEPT) {
      await this.#roles.assignRole(deviceId, roleId)
    }

    return response
  }

  /**
   * @param {string} deviceId
   * @returns {Promise<MemberInfo>}
   */
  async getById(deviceId) {
    const role = await this.#roles.getRole(deviceId)

    /** @type {MemberInfo} */
    const result = { deviceId, role }

    try {
      const configCoreId = await this.#coreOwnership.getCoreId(
        deviceId,
        'config'
      )

      const deviceInfo = await this.#dataTypes.deviceInfo.getByDocId(
        configCoreId
      )

      result.name = deviceInfo.name
      result.deviceType = deviceInfo.deviceType
    } catch (err) {
      // Attempting to get someone else may throw because sync hasn't occurred or completed
      // Only throw if attempting to get themself since the relevant information should be available
      if (deviceId === this.#ownDeviceId) throw err
    }

    return result
  }

  /**
   * @returns {Promise<Array<MemberInfo>>}
   */
  async getMany() {
    const [allRoles, allDeviceInfo] = await Promise.all([
      this.#roles.getAll(),
      this.#dataTypes.deviceInfo.getMany(),
    ])

    return Promise.all(
      Object.entries(allRoles).map(async ([deviceId, role]) => {
        /** @type {MemberInfo} */
        const memberInfo = { deviceId, role }

        try {
          const configCoreId = await this.#coreOwnership.getCoreId(
            deviceId,
            'config'
          )

          const deviceInfo = allDeviceInfo.find(
            ({ docId }) => docId === configCoreId
          )

          memberInfo.name = deviceInfo?.name
          memberInfo.deviceType = deviceInfo?.deviceType
        } catch (err) {
          // Attempting to get someone else may throw because sync hasn't occurred or completed
          // Only throw if attempting to get themself since the relevant information should be available
          if (deviceId === this.#ownDeviceId) throw err
        }

        return memberInfo
      })
    )
  }

  /**
   * @param {string} deviceId
   * @param {import('./roles.js').RoleIdAssignableToOthers} roleId
   * @returns {Promise<void>}
   */
  async assignRole(deviceId, roleId) {
    return this.#roles.assignRole(deviceId, roleId)
  }
}
