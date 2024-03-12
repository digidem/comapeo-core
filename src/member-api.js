import * as crypto from 'node:crypto'
import { TypedEmitter } from 'tiny-typed-emitter'
import { InviteResponse_Decision } from './generated/rpc.js'
import {
  assert,
  noop,
  ExhaustivenessError,
  onceSatisfied,
  projectKeyToId,
  projectKeyToPublicId,
} from './utils.js'
import timingSafeEqual from './lib/timing-safe-equal.js'
import { ROLES, isRoleIdForNewInvite } from './roles.js'

const DEFAULT_INVITE_TIMEOUT = 5 * (1000 * 60)

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

  /** @type {Set<string>} */
  #deviceIdsWithPendingInvites = new Set()

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
   * @returns {Promise<(
   *   typeof InviteResponse_Decision.ACCEPT |
   *   typeof InviteResponse_Decision.REJECT |
   *   typeof InviteResponse_Decision.ALREADY
   * )>}
   */
  async invite(
    deviceId,
    {
      roleId,
      roleName = ROLES[roleId]?.name,
      roleDescription,
      timeout = DEFAULT_INVITE_TIMEOUT,
    }
  ) {
    assert(isRoleIdForNewInvite(roleId), 'Invalid role ID for new invite')
    assert(
      !this.#deviceIdsWithPendingInvites.has(deviceId),
      'Already inviting this device ID'
    )
    assert(timeout > 0, 'Timeout should be a positive number')
    assert(timeout < 2 ** 32, 'Timeout is too large')

    /**
     * These cleanup functions should be synchronous so we don't have to
     * `await` calls to `handleAborted`.
     * @type {Array<() => void>}
     */
    const cleanupFns = []
    const cleanup = () => {
      for (const fn of cleanupFns) {
        try {
          fn()
        } catch (_err) {
          console.error('Cleanup function failed')
        }
      }
    }

    try {
      let handleAborted = noop
      const timeoutId = setTimeout(() => {
        handleAborted = () => {
          throw new Error('Invite timed out')
        }
      }, timeout)
      cleanupFns.push(() => {
        clearTimeout(timeoutId)
      })

      this.#deviceIdsWithPendingInvites.add(deviceId)
      cleanupFns.push(() => {
        this.#deviceIdsWithPendingInvites.delete(deviceId)
      })

      const { name: invitorName } = await this.getById(this.#ownDeviceId)
      // since we are always getting #ownDeviceId,
      // this should never throw (see comment on getById), but it pleases ts
      if (!invitorName)
        throw new Error(
          'Internal error trying to read own device name for this invite'
        )
      handleAborted()

      const projectId = projectKeyToId(this.#projectKey)
      const projectPublicId = projectKeyToPublicId(this.#projectKey)
      const project = await this.#dataTypes.project.getByDocId(projectId)
      const projectName = project.name
      if (!projectName)
        throw new Error('Project must have a name to invite people')
      handleAborted()

      const inviteId = crypto.randomBytes(32)

      const receiveInviteAbortController = new AbortController()
      cleanupFns.push(() => {
        receiveInviteAbortController.abort()
      })
      const receiveInviteResponsePromise =
        /** @type {typeof onceSatisfied<TypedEmitter<import('./local-peers.js').LocalPeersEvents>, 'invite-response'>} */ (
          onceSatisfied
        )(
          this.#rpc,
          'invite-response',
          (peerId, inviteResponse) =>
            timingSafeEqual(peerId, deviceId) &&
            timingSafeEqual(inviteId, inviteResponse.inviteId),
          { signal: receiveInviteAbortController.signal }
        ).then((args) => args?.[1])

      await this.#rpc.sendInvite(deviceId, {
        inviteId,
        projectPublicId,
        projectName,
        roleName,
        roleDescription,
        invitorName,
      })

      handleAborted()

      const inviteResponse = await receiveInviteResponsePromise
      assert(inviteResponse, 'Expected an invite response to be received')

      handleAborted()

      switch (inviteResponse.decision) {
        case InviteResponse_Decision.ALREADY:
        case InviteResponse_Decision.REJECT:
          return inviteResponse.decision
        case InviteResponse_Decision.UNRECOGNIZED:
          return InviteResponse_Decision.REJECT
        case InviteResponse_Decision.ACCEPT:
          handleAborted()

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
      cleanup()
    }
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
