import { TypedEmitter } from 'tiny-typed-emitter'

export class MemberApi extends TypedEmitter {
  #encryptionKeys
  #getProjectInfo
  #projectKey
  #rpc

  /**
   * @param {Object} opts
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {() => Promise<import('./generated/rpc.js').Invite_ProjectInfo>} opts.getProjectInfo
   * @param {Buffer} opts.projectKey
   * @param {import('./rpc/index.js').MapeoRPC} opts.rpc
   */
  constructor({ encryptionKeys, getProjectInfo, projectKey, rpc }) {
    super()
    this.#encryptionKeys = encryptionKeys
    this.#getProjectInfo = getProjectInfo
    this.#projectKey = projectKey
    this.#rpc = rpc
  }

  /**
   * @param {string} deviceId
   *
   * @param {Object} opts
   * @param {string} opts.roleId
   * @param {number} [opts.timeout]
   *
   * @returns {Promise<import('./generated/rpc.js').InviteResponse_Decision>}
   */
  async invite(deviceId, { timeout }) {
    const projectInfo = await this.#getProjectInfo()

    const response = await this.#rpc.invite(deviceId, {
      projectKey: this.#projectKey,
      encryptionKeys: this.#encryptionKeys,
      projectInfo,
      timeout,
    })

    // TODO: If response is ACCEPT, write to capabilities

    return response
  }
}
