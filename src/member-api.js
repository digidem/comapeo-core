import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'

/** @typedef {import('./datatype/index.js').DataType<import('./datastore/index.js').DataStore<'config'>, typeof import('./schema/project.js').deviceInfoTable, "deviceInfo", import('@mapeo/schema').DeviceInfo, import('@mapeo/schema').DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {{ deviceId: string, name: import('@mapeo/schema').DeviceInfo['name'] }} MemberInfo */

export class MemberApi extends TypedEmitter {
  #capabilities
  #encryptionKeys
  #projectKey
  #rpc
  #dataTypes
  #queries

  /**
   * @param {Object} opts
   * @param {import('./capabilities.js').Capabilities} opts.capabilities
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {Buffer} opts.projectKey
   * @param {import('./rpc/index.js').MapeoRPC} opts.rpc
   * @param {Object} opts.queries
   * @param {() => Promise<import('./generated/rpc.js').Invite_ProjectInfo>} opts.queries.getProjectInfo
   * @param {Object} opts.dataTypes
   * @param {Pick<DeviceInfoDataType, 'getByDocId'>} opts.dataTypes.deviceInfo
   */
  constructor({
    capabilities,
    encryptionKeys,
    projectKey,
    rpc,
    queries,
    dataTypes,
  }) {
    super()
    this.#capabilities = capabilities
    this.#encryptionKeys = encryptionKeys
    this.#queries = queries
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
    const projectInfo = await this.#queries.getProjectInfo()

    const response = await this.#rpc.invite(deviceId, {
      projectKey: this.#projectKey,
      encryptionKeys: this.#encryptionKeys,
      projectInfo,
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
}
