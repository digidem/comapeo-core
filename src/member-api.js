import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { projectKeyToId } from './utils.js'
import { DEFAULT_CAPABILITIES } from './capabilities.js'

/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/project.js').deviceInfoTable, "deviceInfo", import('@mapeo/schema').DeviceInfo, import('@mapeo/schema').DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/client.js').projectSettingsTable, "projectSettings", import('@mapeo/schema').ProjectSettings, import('@mapeo/schema').ProjectSettingsValue>} ProjectDataType */
/** @typedef {{ deviceId: string, name?: import('@mapeo/schema').DeviceInfo['name'], capabilities: import('./capabilities.js').Capability }} MemberInfo */

export class MemberApi extends TypedEmitter {
  #ownDeviceId
  #capabilities
  #coreOwnership
  #encryptionKeys
  #projectKey
  #rpc
  #dataTypes

  /**
   * @param {Object} opts
   * @param {string} opts.deviceId public key of this device as hex string
   * @param {import('./capabilities.js').Capabilities} opts.capabilities
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
    capabilities,
    coreOwnership,
    encryptionKeys,
    projectKey,
    rpc,
    dataTypes,
  }) {
    super()
    this.#ownDeviceId = deviceId
    this.#capabilities = capabilities
    this.#coreOwnership = coreOwnership
    this.#encryptionKeys = encryptionKeys
    this.#projectKey = projectKey
    this.#rpc = rpc
    this.#dataTypes = dataTypes
  }

  /**
   * @param {string} deviceId
   *
   * @param {Object} opts
   * @param {import('./capabilities.js').RoleId} opts.roleId
   * @param {string} [opts.roleDescription]
   * @param {number} [opts.timeout]
   *
   * @returns {Promise<import('./generated/rpc.js').InviteResponse_Decision>}
   */
  async invite(deviceId, { roleId, roleDescription, timeout }) {
    const roleName = DEFAULT_CAPABILITIES[roleId].name
    const { name: deviceName } = await this.getById(this.#ownDeviceId)

    // since we are always getting #ownDeviceId,
    // this should never throw (see comment on getById), but it pleases ts
    if (!deviceName) throw new Error('Invalid deviceName')

    if (!roleName) throw new Error('Invalid roleId')

    const projectId = projectKeyToId(this.#projectKey)
    const project = await this.#dataTypes.project.getByDocId(projectId)

    if (!project.name)
      throw new Error('Project must have a name to invite people')

    const response = await this.#rpc.invite(deviceId, {
      projectKey: this.#projectKey,
      encryptionKeys: this.#encryptionKeys,
      projectInfo: { name: project.name },
      roleName,
      roleDescription,
      invitorName: deviceName,
      timeout,
    })

    if (response === InviteResponse_Decision.ACCEPT) {
      await this.#capabilities.assignRole(deviceId, roleId)
    }

    return response
  }

  /**
   * @param {string} deviceId
   * @returns {Promise<MemberInfo>}
   */
  async getById(deviceId) {
    const capabilities = await this.#capabilities.getCapabilities(deviceId)

    /** @type {MemberInfo} */
    const result = { deviceId, capabilities }

    try {
      const configCoreId = await this.#coreOwnership.getCoreId(
        deviceId,
        'config'
      )

      const deviceInfo = await this.#dataTypes.deviceInfo.getByDocId(
        configCoreId
      )

      result.name = deviceInfo.name
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
    const [allCapabilities, allDeviceInfo] = await Promise.all([
      this.#capabilities.getAll(),
      this.#dataTypes.deviceInfo.getMany(),
    ])

    return Promise.all(
      Object.entries(allCapabilities).map(async ([deviceId, capabilities]) => {
        /** @type {MemberInfo} */
        const memberInfo = { deviceId, capabilities }

        try {
          const configCoreId = await this.#coreOwnership.getCoreId(
            deviceId,
            'config'
          )

          const deviceInfo = allDeviceInfo.find(
            ({ docId }) => docId === configCoreId
          )

          memberInfo.name = deviceInfo?.name
        } catch (err) {
          // Attempting to get someone else may throw because sync hasn't occurred or completed
          // Only throw if attempting to get themself since the relevant information should be available
          if (deviceId === this.#ownDeviceId) throw err
        }

        return memberInfo
      })
    )
  }
}
