import * as b4a from 'b4a'
import * as crypto from 'node:crypto'
import WebSocket from 'ws'
import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from './generated/rpc.js'
import {
  assert,
  noop,
  ExhaustivenessError,
  projectKeyToId,
  projectKeyToProjectInviteId,
  projectKeyToPublicId,
} from './utils.js'
import { keyBy } from './lib/key-by.js'
import { abortSignalAny } from './lib/ponyfills.js'
import timingSafeEqual from 'string-timing-safe-equal'
import { isHostnameIpAddress } from './lib/is-hostname-ip-address.js'
import { ErrorWithCode } from './lib/error.js'
import { wsCoreReplicator } from './lib/ws-core-replicator.js'
import { MEMBER_ROLE_ID, ROLES, isRoleIdForNewInvite } from './roles.js'
/**
 * @import {
 *   DeviceInfo,
 *   DeviceInfoValue,
 *   ProjectSettings,
 *   ProjectSettingsValue
 * } from '@comapeo/schema'
 */
/** @import { Promisable } from 'type-fest' */
/** @import { Invite, InviteResponse } from './generated/rpc.js' */
/** @import { DataType } from './datatype/index.js' */
/** @import { DataStore } from './datastore/index.js' */
/** @import { deviceInfoTable } from './schema/project.js' */
/** @import { projectSettingsTable } from './schema/client.js' */
/** @import { ReplicationStream } from './types.js' */

/** @typedef {DataType<DataStore<'config'>, typeof deviceInfoTable, "deviceInfo", DeviceInfo, DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {DataType<DataStore<'config'>, typeof projectSettingsTable, "projectSettings", ProjectSettings, ProjectSettingsValue>} ProjectDataType */
/**
 * @typedef {object} MemberInfo
 * @prop {string} deviceId
 * @prop {import('./roles.js').Role} role
 * @prop {DeviceInfo['name']} [name]
 * @prop {DeviceInfo['deviceType']} [deviceType]
 * @prop {DeviceInfo['createdAt']} [joinedAt]
 * @prop {object} [selfHostedServerDetails]
 * @prop {string} selfHostedServerDetails.baseUrl
 */

export class MemberApi extends TypedEmitter {
  #ownDeviceId
  #roles
  #coreOwnership
  #encryptionKeys
  #getProjectName
  #projectKey
  #rpc
  #getReplicationStream
  #waitForInitialSyncWithPeer
  #dataTypes

  /** @type {Map<string, { abortController: AbortController }>} */
  #outboundInvitesByDevice = new Map()

  /**
   * @param {Object} opts
   * @param {string} opts.deviceId public key of this device as hex string
   * @param {import('./roles.js').Roles} opts.roles
   * @param {import('./core-ownership.js').CoreOwnership} opts.coreOwnership
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {() => Promisable<undefined | string>} opts.getProjectName
   * @param {Buffer} opts.projectKey
   * @param {import('./local-peers.js').LocalPeers} opts.rpc
   * @param {() => ReplicationStream} opts.getReplicationStream
   * @param {(deviceId: string, abortSignal: AbortSignal) => Promise<void>} opts.waitForInitialSyncWithPeer
   * @param {Object} opts.dataTypes
   * @param {Pick<DeviceInfoDataType, 'getByDocId' | 'getMany'>} opts.dataTypes.deviceInfo
   * @param {Pick<ProjectDataType, 'getByDocId'>} opts.dataTypes.project
   */
  constructor({
    deviceId,
    roles,
    coreOwnership,
    encryptionKeys,
    getProjectName,
    projectKey,
    rpc,
    getReplicationStream,
    waitForInitialSyncWithPeer,
    dataTypes,
  }) {
    super()
    this.#ownDeviceId = deviceId
    this.#roles = roles
    this.#coreOwnership = coreOwnership
    this.#encryptionKeys = encryptionKeys
    this.#getProjectName = getProjectName
    this.#projectKey = projectKey
    this.#rpc = rpc
    this.#getReplicationStream = getReplicationStream
    this.#waitForInitialSyncWithPeer = waitForInitialSyncWithPeer
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
   * @param {Buffer} [opts.__testOnlyInviteId] Hard-code the invite ID. Only for tests.
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
      __testOnlyInviteId,
    }
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

      const inviteId = __testOnlyInviteId || crypto.randomBytes(32)
      const projectId = projectKeyToId(this.#projectKey)
      const projectInviteId = projectKeyToProjectInviteId(this.#projectKey)
      const project = await this.#dataTypes.project.getByDocId(projectId)
      const projectName = project.name
      assert(projectName, 'Project must have a name to invite people')

      abortSignal.throwIfAborted()

      const invite = {
        inviteId,
        projectInviteId,
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
        case InviteResponse_Decision.DECISION_UNSPECIFIED:
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
   * Add a server peer.
   *
   * Can reject with any of the following error codes (accessed via `err.code`):
   *
   * - `INVALID_URL`: the base URL is invalid, likely due to user error.
   * - `MISSING_DATA`: some required data is missing in order to add the server
   *   peer. For example, the project must have a name.
   * - `NETWORK_ERROR`: there was an issue connecting to the server. Is the
   *   device online? Is the server online?
   * - `INVALID_SERVER_RESPONSE`: we connected to the server but it returned
   *   an unexpected response. Is the server running a compatible version of
   *   CoMapeo Cloud?
   *
   * If `err.code` is not specified, that indicates a bug in this module.
   *
   * @param {string} baseUrl
   * @param {object} [options]
   * @param {boolean} [options.dangerouslyAllowInsecureConnections]
   * @returns {Promise<void>}
   */
  async addServerPeer(
    baseUrl,
    { dangerouslyAllowInsecureConnections = false } = {}
  ) {
    if (
      !isValidServerBaseUrl(baseUrl, { dangerouslyAllowInsecureConnections })
    ) {
      throw new ErrorWithCode('INVALID_URL', 'Server base URL is invalid')
    }

    const { serverDeviceId } = await this.#addServerToProject(baseUrl)

    const roleId = MEMBER_ROLE_ID
    await this.#roles.assignRole(serverDeviceId, roleId)

    await this.#waitForInitialSyncWithServer({
      baseUrl,
      serverDeviceId,
      dangerouslyAllowInsecureConnections,
    })
  }

  /**
   * @param {string} baseUrl Server base URL. Should already be validated.
   * @returns {Promise<{ serverDeviceId: string }>}
   */
  async #addServerToProject(baseUrl) {
    const projectName = await this.#getProjectName()
    if (!projectName) {
      throw new ErrorWithCode(
        'MISSING_DATA',
        'Project must have name to add server peer'
      )
    }

    const requestUrl = new URL('projects', baseUrl)
    const requestBody = {
      projectName,
      projectKey: encodeBufferForServer(this.#projectKey),
      encryptionKeys: {
        auth: encodeBufferForServer(this.#encryptionKeys.auth),
        data: encodeBufferForServer(this.#encryptionKeys.data),
        config: encodeBufferForServer(this.#encryptionKeys.config),
        blobIndex: encodeBufferForServer(this.#encryptionKeys.blobIndex),
        blob: encodeBufferForServer(this.#encryptionKeys.blob),
      },
    }

    /** @type {Response} */ let response
    try {
      response = await fetch(requestUrl, {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? err.message
          : String(err)
      throw new ErrorWithCode(
        'NETWORK_ERROR',
        `Failed to add server peer due to network error: ${message}`
      )
    }

    if (response.status !== 200 && response.status !== 201) {
      throw new ErrorWithCode(
        'INVALID_SERVER_RESPONSE',
        `Failed to add server peer due to HTTP status code ${response.status}`
      )
    }

    try {
      const responseBody = await response.json()
      assert(
        responseBody &&
          typeof responseBody === 'object' &&
          'data' in responseBody &&
          responseBody.data &&
          typeof responseBody.data === 'object' &&
          'deviceId' in responseBody.data &&
          typeof responseBody.data.deviceId === 'string',
        'Response body is valid'
      )
      return { serverDeviceId: responseBody.data.deviceId }
    } catch (err) {
      throw new ErrorWithCode(
        'INVALID_SERVER_RESPONSE',
        "Failed to add server peer because we couldn't parse the response"
      )
    }
  }

  /**
   * @param {object} options
   * @param {string} options.baseUrl
   * @param {string} options.serverDeviceId
   * @param {boolean} options.dangerouslyAllowInsecureConnections
   * @returns {Promise<void>}
   */
  async #waitForInitialSyncWithServer({
    baseUrl,
    serverDeviceId,
    dangerouslyAllowInsecureConnections,
  }) {
    const projectPublicId = projectKeyToPublicId(this.#projectKey)
    const websocketUrl = new URL('sync/' + projectPublicId, baseUrl)
    websocketUrl.protocol =
      dangerouslyAllowInsecureConnections && websocketUrl.protocol === 'http:'
        ? 'ws:'
        : 'wss:'

    const websocket = new WebSocket(websocketUrl)

    try {
      await pEvent(websocket, 'open', { rejectionEvents: ['error'] })
    } catch (rejectionEvent) {
      throw new ErrorWithCode(
        // It's difficult for us to reliably disambiguate between "network error"
        // and "invalid response from server" here, so we just say it was an
        // invalid server response.
        'INVALID_SERVER_RESPONSE',
        'Failed to open the socket',
        rejectionEvent &&
        typeof rejectionEvent === 'object' &&
        'error' in rejectionEvent
          ? { cause: rejectionEvent.error }
          : { cause: rejectionEvent }
      )
    }

    const onErrorPromise = pEvent(websocket, 'error')

    const replicationStream = this.#getReplicationStream()
    wsCoreReplicator(websocket, replicationStream)

    const syncAbortController = new AbortController()
    const syncPromise = this.#waitForInitialSyncWithPeer(
      serverDeviceId,
      syncAbortController.signal
    )

    const errorEvent = await Promise.race([onErrorPromise, syncPromise])

    if (errorEvent) {
      syncAbortController.abort()
      websocket.close()
      throw errorEvent.error
    } else {
      const onClosePromise = pEvent(websocket, 'close')
      onErrorPromise.cancel()
      websocket.close()
      await onClosePromise
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
      result.joinedAt = deviceInfo.createdAt
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

    const deviceInfoByConfigCoreId = keyBy(allDeviceInfo, ({ docId }) => docId)

    return Promise.all(
      [...allRoles.entries()].map(async ([deviceId, role]) => {
        /** @type {MemberInfo} */
        const memberInfo = { deviceId, role }

        try {
          const configCoreId = await this.#coreOwnership.getCoreId(
            deviceId,
            'config'
          )

          const deviceInfo = deviceInfoByConfigCoreId.get(configCoreId)

          memberInfo.name = deviceInfo?.name
          memberInfo.deviceType = deviceInfo?.deviceType
          memberInfo.joinedAt = deviceInfo?.createdAt
          memberInfo.selfHostedServerDetails =
            deviceInfo?.selfHostedServerDetails
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

/**
 * @param {string} baseUrl
 * @param {object} options
 * @param {boolean} options.dangerouslyAllowInsecureConnections
 * @returns {boolean}
 */
function isValidServerBaseUrl(
  baseUrl,
  { dangerouslyAllowInsecureConnections }
) {
  if (baseUrl.length > 2000) return false

  /** @type {URL} */ let url
  try {
    url = new URL(baseUrl)
  } catch (_err) {
    return false
  }

  const isProtocolValid =
    url.protocol === 'https:' ||
    (dangerouslyAllowInsecureConnections && url.protocol === 'http:')
  if (!isProtocolValid) return false

  if (url.username) return false
  if (url.password) return false
  if (url.search) return false
  if (url.hash) return false

  // We may want to support this someday. See <https://github.com/digidem/comapeo-core/issues/908>.
  if (url.pathname !== '/') return false

  if (
    !isHostnameIpAddress(url.hostname) &&
    !dangerouslyAllowInsecureConnections
  ) {
    const parts = url.hostname.split('.')
    const isDomainValid = parts.length >= 2 && parts.every(Boolean)
    if (!isDomainValid) return false
  }

  return true
}

/**
 * @param {undefined | Uint8Array} buffer
 * @returns {undefined | string}
 */
function encodeBufferForServer(buffer) {
  return buffer ? b4a.toString(buffer, 'hex') : undefined
}
