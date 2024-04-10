import * as crypto from 'node:crypto'
import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from './generated/rpc.js'
import {
  assert,
  noop,
  ExhaustivenessError,
  projectKeyToId,
  projectKeyToPublicId,
} from './utils.js'
import { abortSignalAny } from './lib/ponyfills.js'
import timingSafeEqual from './lib/timing-safe-equal.js'
import { ROLES, isRoleIdForNewInvite } from './roles.js'

/**
 * @internal
 * @typedef {import('./generated/rpc.js').Invite} Invite
 */
/**
 * @internal
 * @typedef {import('./generated/rpc.js').InviteResponse} InviteResponse
 */

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

  /** @type {Map<string, { abortController: AbortController }>} */
  #outboundInvitesByDevice = new Map()

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
   * Send an invite. Resolves when receiving a response. Rejects if the invite
   * is canceled, or if something else goes wrong.
   *
   * @param {string} deviceId
   * @param {Object} opts
   * @param {import('./roles.js').RoleIdForNewInvite} opts.roleId
   * @param {string} [opts.roleName]
   * @param {string} [opts.roleDescription]
   * @returns {Promise<(
   *   typeof InviteResponse_Decision.ACCEPT |
   *   typeof InviteResponse_Decision.REJECT |
   *   typeof InviteResponse_Decision.ALREADY
   * )>}
   */
  async invite(
    deviceId,
    { roleId, roleName = ROLES[roleId]?.name, roleDescription }
  ) {
    assert(isRoleIdForNewInvite(roleId), 'Invalid role ID for new invite')
    assert(
      !this.#outboundInvitesByDevice.has(deviceId),
      'Already inviting this device ID'
    )

    const abortController = new AbortController()
    const abortSignal = abortController.signal
    this.#outboundInvitesByDevice.set(deviceId, { abortController })

    try {
      const { name: invitorName } = await this.getById(this.#ownDeviceId)
      // since we are always getting #ownDeviceId,
      // this should never throw (see comment on getById), but it pleases ts
      assert(
        invitorName,
        'Internal error trying to read own device name for this invite'
      )

      abortSignal.throwIfAborted()

      const inviteId = crypto.randomBytes(32)
      const projectId = projectKeyToId(this.#projectKey)
      const projectPublicId = projectKeyToPublicId(this.#projectKey)
      const project = await this.#dataTypes.project.getByDocId(projectId)
      const projectName = project.name
      assert(projectName, 'Project must have a name to invite people')

      abortSignal.throwIfAborted()

      const invite = {
        inviteId,
        projectPublicId,
        projectName,
        roleName,
        roleDescription,
        invitorName,
      }

      const inviteResponse = await this.#sendInviteAndGetResponse(
        deviceId,
        invite,
        abortSignal
      )

      // Though the invite is still arguably outgoing here, it can no longer
      // be canceled.
      this.#outboundInvitesByDevice.delete(deviceId)

      switch (inviteResponse.decision) {
        case InviteResponse_Decision.ALREADY:
        case InviteResponse_Decision.REJECT:
          return inviteResponse.decision
        case InviteResponse_Decision.UNRECOGNIZED:
          return InviteResponse_Decision.REJECT
        case InviteResponse_Decision.ACCEPT:
          // We should assign the role locally *before* sharing the project details
          // so that they're part of the project even if they don't receive the
          // project details message.

          await this.#roles.assignRole(deviceId, roleId)

          await this.#rpc.sendProjectJoinDetails(deviceId, {
            inviteId,
            projectKey: this.#projectKey,
            encryptionKeys: this.#encryptionKeys,
          })

          return inviteResponse.decision
        default:
          throw new ExhaustivenessError(inviteResponse.decision)
      }
    } finally {
      this.#outboundInvitesByDevice.delete(deviceId)
    }
  }

  /**
   * @param {string} deviceId
   * @param {Invite} invite
   * @param {AbortSignal} signal
   */
  async #sendInviteAndGetResponse(deviceId, invite, signal) {
    const inviteAbortedError = new Error('Invite aborted')

    if (signal.aborted) throw inviteAbortedError

    const abortController = new AbortController()

    const responsePromise =
      /** @type {typeof pEvent<'invite-response', [string, InviteResponse]>} */ (
        pEvent
      )(this.#rpc, 'invite-response', {
        multiArgs: true,
        filter: ([peerId, inviteResponse]) =>
          timingSafeEqual(peerId, deviceId) &&
          timingSafeEqual(invite.inviteId, inviteResponse.inviteId),
        signal: abortSignalAny([abortController.signal, signal]),
      }).then((args) => args?.[1])

    responsePromise.catch(noop)

    signal.addEventListener(
      'abort',
      () => {
        this.#rpc
          .sendInviteCancel(deviceId, { inviteId: invite.inviteId })
          .catch(noop)
      },
      { once: true }
    )

    try {
      await this.#rpc.sendInvite(deviceId, invite)
      return await responsePromise
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw inviteAbortedError
      } else {
        throw err
      }
    } finally {
      abortController.abort()
    }
  }

  /**
   * Attempt to cancel an outbound invite, if it exists.
   *
   * No-op if we weren't inviting this device.
   *
   * @param {string} deviceId
   * @returns {void}
   */
  requestCancelInvite(deviceId) {
    this.#outboundInvitesByDevice.get(deviceId)?.abortController.abort()
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
      [...allRoles.entries()].map(async ([deviceId, role]) => {
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
