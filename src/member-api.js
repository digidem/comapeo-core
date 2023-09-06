import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'

export class MemberApi extends TypedEmitter {
  #capabilities
  #encryptionKeys
  #getProjectInfo
  #projectKey
  #rpc

  /**
   * @param {Object} opts
   * @param {import('./capabilities.js').Capabilities} opts.capabilities
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {() => Promise<import('./generated/rpc.js').Invite_ProjectInfo>} opts.getProjectInfo
   * @param {Buffer} opts.projectKey
   * @param {import('./rpc/index.js').MapeoRPC} opts.rpc
   */
  constructor({
    capabilities,
    encryptionKeys,
    getProjectInfo,
    projectKey,
    rpc,
  }) {
    super()
    this.#capabilities = capabilities
    this.#encryptionKeys = encryptionKeys
    this.#getProjectInfo = getProjectInfo
    this.#projectKey = projectKey
    this.#rpc = rpc
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
    const projectInfo = await this.#getProjectInfo()

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
}
