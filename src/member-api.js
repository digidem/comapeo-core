import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import { projectKeyToId } from './utils.js'

/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/project.js').deviceInfoTable, "deviceInfo", import('@mapeo/schema').DeviceInfo, import('@mapeo/schema').DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/client.js').projectSettingsTable, "projectSettings", import('@mapeo/schema').ProjectSettings, import('@mapeo/schema').ProjectSettingsValue>} ProjectDataType */
/** @typedef {{ deviceId: string, name: import('@mapeo/schema').DeviceInfo['name'] }} MemberInfo */

export class MemberApi extends TypedEmitter {
  #capabilities
  #encryptionKeys
  #projectKey
  #rpc
  #dataTypes

  /**
   * @param {Object} opts
   * @param {import('./capabilities.js').Capabilities} opts.capabilities
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {Buffer} opts.projectKey
   * @param {import('./rpc/index.js').MapeoRPC} opts.rpc
   * @param {Object} opts.dataTypes
   * @param {Pick<DeviceInfoDataType, 'getByDocId' | 'getMany'>} opts.dataTypes.deviceInfo
   * @param {Pick<ProjectDataType, 'getByDocId'>} opts.dataTypes.project
   */
  constructor({ capabilities, encryptionKeys, projectKey, rpc, dataTypes }) {
    super()
    this.#capabilities = capabilities
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
   * @param {number} [opts.timeout]
   *
   * @returns {Promise<import('./generated/rpc.js').InviteResponse_Decision>}
   */
  async invite(deviceId, { roleId, timeout }) {
    const projectId = projectKeyToId(this.#projectKey)

    const project = await this.#dataTypes.project.getByDocId(projectId)

    const response = await this.#rpc.invite(deviceId, {
      projectKey: this.#projectKey,
      encryptionKeys: this.#encryptionKeys,
      projectInfo: { name: project.name },
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
    const { name } = await this.#dataTypes.deviceInfo.getByDocId(deviceId)
    return { deviceId, name }
  }

  /**
   * @returns {Promise<Array<MemberInfo>>}
   */
  async getMany() {
    const devices = await this.#dataTypes.deviceInfo.getMany()
    return devices.map(({ docId, name }) => ({ deviceId: docId, name }))
  }
}
