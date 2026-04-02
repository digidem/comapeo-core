import * as b4a from 'b4a'
import * as crypto from 'node:crypto'
import WebSocket from 'ws'
import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { InviteResponse_Decision } from './generated/rpc.js'
import {
  noop,
  projectKeyToProjectInviteId,
  projectKeyToPublicId,
} from './utils.js'
import { Logger } from './logger.js'
import { abortSignalAny } from './lib/ponyfills.js'
import timingSafeEqual from 'string-timing-safe-equal'
import { isHostnameIpAddress } from './lib/is-hostname-ip-address.js'
import {
  AlreadyBlockedError,
  DeviceIdNotForServerError,
  ensureKnownError,
  InvalidServerResponseError,
  InvalidUrlError,
  InviteAbortedError,
  IncompleteProjectDataError,
  MissingOwnDeviceInfoError,
  NetworkError,
  ProjectDetailsSendFailError,
  ProjectNotInAllowlistError,
  ServerTooManyProjectsError,
  ExhaustivenessError,
  InvalidRoleIDForNewInviteError,
  InvalidProjectNameError,
  UnexpectedError,
  AlreadyInvitingError,
  InvalidResponseBodyError,
  RPCDisconnectBeforeAckError,
} from './errors.js'
import { wsCoreReplicator } from './lib/ws-core-replicator.js'
import {
  BLOCKED_ROLE_ID,
  COORDINATOR_ROLE_ID,
  CREATOR_ROLE_ID,
  LEFT_ROLE_ID,
  MEMBER_ROLE_ID,
  ROLES,
  isRoleIdForNewInvite,
} from './roles.js'

export const INTERNET_INVITE_PAGE = 'https://i.comapeo.app/invite/'
const ACTIVE_ROLE_IDS = [CREATOR_ROLE_ID, MEMBER_ROLE_ID, COORDINATOR_ROLE_ID]

/**
 * @import {
 *   DeviceInfo,
 *   DeviceInfoValue,
 *   ProjectSettings,
 *   ProjectSettingsValue,
 * } from '@comapeo/schema'
 */
/** @import { Invite, InviteResponse, RedeemInviteOverInternet } from './generated/rpc.js' */
/** @import { DataType } from './datatype/index.js' */
/** @import { DataStore } from './datastore/index.js' */
/** @import { deviceInfoTable } from './schema/project.js' */
/** @import { projectSettingsTable } from './schema/client.js' */
/** @import { ReplicationStream, MapeoValueMap } from './types.js' */

/** @typedef {DataType<DataStore<'config'>, typeof deviceInfoTable, "deviceInfo", DeviceInfo, DeviceInfoValue>} DeviceInfoDataType */
/** @typedef {DataType<DataStore<'config'>, typeof projectSettingsTable, "projectSettings", ProjectSettings, ProjectSettingsValue>} ProjectDataType */
/** @typedef {import('./datatype/index.js').ExcludeSchema<MapeoValueMap['deviceInfo'], 'coreOwnership'>} NewDeviceInfo */

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

/**
 * @typedef {object} InvitePeerInfo
 * @prop {DeviceInfo['name']} name
 * @prop {DeviceInfo['deviceType']} deviceType
 */

/**
 * @typedef {object} InviteOptions
 * @prop {import('./roles.js').RoleIdForNewInvite} opts.roleId
 * @prop {string} [roleName]
 * @prop {string} [roleDescription]
 * @prop {Buffer} [__testOnlyInviteId] Hard-code the invite ID. Only for tests.
 * @prop {number} [initialSyncTimeoutMs=5000]
 * @prop {InvitePeerInfo} [peerInfo]
 */

/**
 * @typedef {(
 *   typeof InviteResponse_Decision.ACCEPT |
 *   typeof InviteResponse_Decision.REJECT |
 *   typeof InviteResponse_Decision.ALREADY
 * )} InviteDecision
 */

/**
 * @typedef {Omit<MemberInfo, 'role'> & {role: import('./roles.js').Role<typeof MEMBER_ROLE_ID | typeof COORDINATOR_ROLE_ID | typeof CREATOR_ROLE_ID>}} ActiveMemberInfo
 */

/**
 * @typedef {object} MemberEvents
 * @property {(deviceId: string, decision: InviteDecision, url: string) => void} internet-invite-redeemed Emitted when an invite over the internet has been redeemed
 * @property {(err: Error, deviceId: string, url: string) => void} internet-invite-redeem-error Emitted when an invite over the internet has failed to be redeemed
 */

/**
 * @extends {TypedEmitter<MemberEvents>}
 */
export class MemberApi extends TypedEmitter {
  #ownDeviceId
  #swarmPublicKey
  #roles
  #encryptionKeys
  #projectKey
  #rpc
  #makeWebsocket
  #getReplicationStream
  #waitForInitialSyncWithPeer
  #setShouldListenOverInternet
  #getProjectSettings
  #getDeviceInfo
  #setDeviceInfo
  #l

  /** @type {Map<string, { abortController: AbortController }>} */
  #outboundInvitesByDevice = new Map()

  /** @type {Map<string, {inviteId: Buffer, url: string, opts: InviteOptions}>} */
  #pendingInvitesOverInternet = new Map()

  /**
   * @param {Object} opts
   * @param {string} opts.deviceId public key of this device as hex string
   * @param {Buffer} opts.swarmPublicKey public key of this device on the hyperswarm network
   * @param {Pick<import('./roles.js').Roles, 'getAll' | 'assignRole' | 'getRole'>} opts.roles
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {Buffer} opts.projectKey
   * @param {import('./local-peers.js').LocalPeers} opts.rpc
   * @param {(url: string) => WebSocket} [opts.makeWebsocket]
   * @param {() => ReplicationStream} opts.getReplicationStream
   * @param {(deviceId: string, abortSignal: AbortSignal) => Promise<void>} opts.waitForInitialSyncWithPeer
   * @param {(shouldListen: boolean) => Promise<void>} opts.setShouldListenOverInternet
   * @param {() => Promise<import('./mapeo-project.js').EditableProjectSettings>} opts.getProjectSettings
   * @param {(deviceId: string) => Promise<DeviceInfo>} opts.getDeviceInfo
   * @param {(deviceId: string, deviceInfo: NewDeviceInfo) => Promise<void>} opts.setDeviceInfo
   * @param {Logger} [opts.logger]
   */
  constructor({
    deviceId,
    swarmPublicKey,
    roles,
    encryptionKeys,
    projectKey,
    rpc,
    makeWebsocket = (url) => new WebSocket(url),
    getReplicationStream,
    waitForInitialSyncWithPeer,
    setShouldListenOverInternet,
    getProjectSettings,
    getDeviceInfo,
    setDeviceInfo,
    logger,
  }) {
    super()
    this.#l = Logger.create('member-api', logger)
    this.#ownDeviceId = deviceId
    this.#swarmPublicKey = swarmPublicKey
    this.#roles = roles
    this.#encryptionKeys = encryptionKeys
    this.#projectKey = projectKey
    this.#rpc = rpc
    this.#makeWebsocket = makeWebsocket
    this.#getReplicationStream = getReplicationStream
    this.#waitForInitialSyncWithPeer = waitForInitialSyncWithPeer
    this.#setShouldListenOverInternet = setShouldListenOverInternet
    this.#getProjectSettings = getProjectSettings
    this.#getDeviceInfo = getDeviceInfo
    this.#setDeviceInfo = setDeviceInfo

    rpc.on('invite-over-internet-redeemed', (peerId, redeem) =>
      this.#handleRedeemInviteOverInternet(peerId, redeem)
    )
  }

  /**
   * Start inviting somone over the internet. Returns a URL for the recipient to load.
   * @param {InviteOptions} opts
   */
  async inviteOverInternet(opts) {
    const inviteId = opts.__testOnlyInviteId || crypto.randomBytes(32)
    const inviteIdString = inviteId.toString('hex')
    const deviceId = this.#swarmPublicKey.toString('hex')

    const url = makeInviteURL(inviteIdString, deviceId)

    this.#pendingInvitesOverInternet.set(inviteIdString, {
      inviteId,
      url,
      opts,
    })

    if (this.#pendingInvitesOverInternet.size === 1) {
      await this.#setShouldListenOverInternet(true)
    }

    return url
  }

  /**
   * Cancel an invite over internet attempt. Omit the specific URL to cancel all instances
   * @param {string} [url]
   */
  async cancelInviteOverInternet(url) {
    if (!url) {
      this.#pendingInvitesOverInternet.clear()
      await this.#setShouldListenOverInternet(false)
      return
    }
    const { inviteIdString } = parseInviteURL(url)

    if (!this.#pendingInvitesOverInternet.has(inviteIdString)) {
      throw new Error('Invalid internet invite URL')
    }
    this.#pendingInvitesOverInternet.delete(inviteIdString)
    if (this.#pendingInvitesOverInternet.size === 0) {
      await this.#setShouldListenOverInternet(false)
    }
  }

  /**
   * Get the list of pending invites over the internet
   * @returns {string[]}
   */
  pendingInternetInvites() {
    return [...this.#pendingInvitesOverInternet.values()].map(({ url }) => url)
  }

  /**
   *
   * @param {string} peerId
   * @param {RedeemInviteOverInternet} redeem
   */
  async #handleRedeemInviteOverInternet(peerId, { inviteId }) {
    const inviteIdString = inviteId.toString('hex')
    this.#l.log('Got incoming invite redeem', inviteIdString.slice(0, 7))

    try {
      for (const [
        pendingInviteId,
        { opts, url },
      ] of this.#pendingInvitesOverInternet.entries()) {
        if (pendingInviteId !== inviteIdString) continue
        const decision = await this.invite(peerId, opts)
        this.emit('internet-invite-redeemed', peerId, decision, url)
      }
    } catch (e) {
      this.emit(
        'internet-invite-redeem-error',
        ensureKnownError(e),
        peerId,
        inviteIdString
      )
    }
  }

  /**
   * Send an invite. Resolves when receiving a response. Rejects if the invite
   * is canceled, or if something else goes wrong.
   *
   * @param {string} deviceId
   * @param {InviteOptions} opts
   * @returns {Promise<InviteDecision>}
   */
  async invite(
    deviceId,
    {
      roleId,
      roleName = ROLES[roleId]?.name,
      roleDescription,
      __testOnlyInviteId,
      initialSyncTimeoutMs = 5000,
      peerInfo,
    }
  ) {
    if (!isRoleIdForNewInvite(roleId)) {
      throw new InvalidRoleIDForNewInviteError({ roleId })
    }
    if (this.#outboundInvitesByDevice.has(deviceId)) {
      throw new AlreadyInvitingError()
    }

    const abortController = new AbortController()
    const abortSignal = abortController.signal
    this.#outboundInvitesByDevice.set(deviceId, { abortController })

    try {
      const { name: invitorName } = await this.getById(this.#ownDeviceId)
      // since we are always getting #ownDeviceId,
      // this should never throw (see comment on getById), but it pleases ts
      if (!invitorName) {
        throw new UnexpectedError(
          'Internal error trying to read own device name for this invite'
        )
      }

      abortSignal.throwIfAborted()

      const inviteId = __testOnlyInviteId || crypto.randomBytes(32)
      const projectInviteId = projectKeyToProjectInviteId(this.#projectKey)
      const project = await this.#getProjectSettings()
      const projectName = project.name
      if (!projectName) {
        throw new InvalidProjectNameError()
      }

      const projectColor = project.projectColor
      const projectDescription = project.projectDescription
      const sendStats = project.sendStats
      const invitorWroteDeviceInfo = !!peerInfo

      abortSignal.throwIfAborted()

      const invite = {
        inviteId,
        projectInviteId,
        projectName,
        projectColor,
        projectDescription,
        roleName,
        roleDescription,
        invitorName,
        sendStats,
        invitorWroteDeviceInfo,
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
          try {
            await this.#rpc.sendProjectJoinDetails(deviceId, {
              inviteId,
              projectKey: this.#projectKey,
              encryptionKeys: this.#encryptionKeys,
            })
          } catch {
            throw new ProjectDetailsSendFailError()
          }
          await this.#roles.assignRole(deviceId, roleId)

          if (invitorWroteDeviceInfo) {
            const { name, deviceType } = peerInfo
            const doc = {
              name: name,
              deviceType: deviceType,
              selfHostedServerDetails: undefined,
              schemaName: /** @type {const} */ ('deviceInfo'),
            }
            await this.#setDeviceInfo(deviceId, doc)
          }

          try {
            let abortSync = new AbortController().signal
            if (initialSyncTimeoutMs) {
              abortSync = AbortSignal.timeout(initialSyncTimeoutMs)
            }

            await this.#waitForInitialSyncWithPeer(deviceId, abortSync)
          } catch (e) {
            this.#l.log('ERROR: Could not initial sync with peer', e)
          }

          return inviteResponse.decision
        default:
          throw new ExhaustivenessError({ value: inviteResponse.decision })
      }
    } catch (e) {
      if (e instanceof RPCDisconnectBeforeAckError) {
        this.#l.log('ERROR: Disconnect before ack', e)
        throw new InviteAbortedError()
      }
      throw ensureKnownError(e)
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
    if (signal.aborted) {
      throw new InviteAbortedError()
    }

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
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        this.#l.log('ERROR: Timed out sending invite', e)
        throw new InviteAbortedError()
      } else {
        this.#l.log('ERROR: Unexpected error during invite send', e)
        throw ensureKnownError(e)
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
   * - `SERVER_HAS_TOO_MANY_PROJECTS`: the server limits the number of projects
   *   it can have, and it's at the limit.
   * - `PROJECT_NOT_IN_SERVER_ALLOWLIST`: the server only allows specific
   *   projects to be added and ours wasn't one of them.
   * - `INVALID_SERVER_RESPONSE`: we connected to the server but it returned
   *   an unexpected response. Is the server running a compatible version of
   *   CoMapeo Cloud?
   *
   * If `err.code` is not specified, that indicates a bug in this module.
   *
   * @param {string} baseUrl
   * @param {object} [options]
   * @param {boolean} [options.dangerouslyAllowInsecureConnections] Allow insecure network connections. Should only be used in tests.
   * @returns {Promise<void>}
   */
  async addServerPeer(
    baseUrl,
    { dangerouslyAllowInsecureConnections = false } = {}
  ) {
    if (
      !isValidServerBaseUrl(baseUrl, { dangerouslyAllowInsecureConnections })
    ) {
      throw new InvalidUrlError()
    }

    const { serverDeviceId } = await this.#addServerToProject(baseUrl)

    await this.#roles.assignRole(serverDeviceId, MEMBER_ROLE_ID)

    await this.#waitForInitialSyncWithServer({
      baseUrl,
      serverDeviceId,
      dangerouslyAllowInsecureConnections,
    })
  }

  /**
   * Remove a member from the project
   * @param {string} deviceId Device id of member to remove
   * @param {object} [opts]
   * @param {string} opts.reason
   */
  async remove(deviceId, opts) {
    const member = await this.getById(deviceId)
    const { roleId } = member.role

    if (roleId === BLOCKED_ROLE_ID || roleId === LEFT_ROLE_ID) {
      throw new AlreadyBlockedError()
    }

    // Add blocked role to project
    // Should error if you don't have permission to do so
    await this.#roles.assignRole(deviceId, BLOCKED_ROLE_ID, opts)
  }

  /**
   * Remove a server peer. Only works when the peer is reachable
   *
   * @param {string} serverDeviceId
   * @param {object} [options]
   * @param {boolean} [options.dangerouslyAllowInsecureConnections] Allow insecure network connections. Should only be used in tests.
   * @returns {Promise<void>}
   */
  async removeServerPeer(
    serverDeviceId,
    { dangerouslyAllowInsecureConnections = false } = {}
  ) {
    // Get device ID for URL
    // Parse through URL to ensure end pathname if missing
    const member = await this.getById(serverDeviceId)

    if (!member.selfHostedServerDetails) {
      throw new DeviceIdNotForServerError({
        deviceId: serverDeviceId.slice(0, 7),
      })
    }
    if (member.role.roleId === BLOCKED_ROLE_ID) {
      throw new AlreadyBlockedError()
    }

    const { baseUrl } = member.selfHostedServerDetails

    // Add blocked role to project
    await this.#roles.assignRole(serverDeviceId, BLOCKED_ROLE_ID)

    // TODO: Catch fail and sync with server after
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
    const { name: projectName } = await this.#getProjectSettings()
    if (!projectName) {
      throw new IncompleteProjectDataError()
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
    } catch (e) {
      throw new NetworkError('Failed to add server peer due to network error', {
        cause: e,
      })
    }

    return await parseAddServerResponse(response)
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

    const websocket = this.#makeWebsocket(websocketUrl.href)

    try {
      await pEvent(websocket, 'open', { rejectionEvents: ['error'] })
    } catch (e) {
      throw new InvalidServerResponseError(
        'Failed to open websocket for initial sync',
        e && typeof e === 'object' && 'error' in e
          ? { cause: e.error }
          : { cause: e }
      )
    }

    const onClosePromise = pEvent(websocket, 'close')
    const onErrorPromise = pEvent(websocket, 'error')

    const replicationStream = this.#getReplicationStream()
    const streamPromise = wsCoreReplicator(websocket, replicationStream)

    const syncAbortController = new AbortController()
    const syncPromise = this.#waitForInitialSyncWithPeer(
      serverDeviceId,
      syncAbortController.signal
    )

    const errorEvent = await Promise.race([
      onErrorPromise,
      syncPromise,
      streamPromise,
    ])

    if (errorEvent) {
      syncAbortController.abort()
      websocket.close()
      throw errorEvent.error
    } else {
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
      const deviceInfo = await this.#getDeviceInfo(deviceId)

      result.name = deviceInfo.name
      result.deviceType = deviceInfo.deviceType
      result.joinedAt = deviceInfo.createdAt
      result.selfHostedServerDetails = deviceInfo.selfHostedServerDetails
    } catch (e) {
      // Attempting to get someone else may throw because sync hasn't occurred or completed
      // Only throw if attempting to get themself since the relevant information should be available
      if (deviceId === this.#ownDeviceId) {
        throw new MissingOwnDeviceInfoError({ cause: e })
      }
    }

    return result
  }

  /**
   * @overload
   * @returns {Promise<Array<ActiveMemberInfo>>}
   */
  /**
   * @template {boolean} [T=false]
   *
   * @overload
   * @param {Object} opts
   * @param {T} [opts.includeLeft=false]
   *
   * @returns {Promise<T extends true ? Array<MemberInfo> : Array<ActiveMemberInfo>>}
   *
   */
  async getMany({ includeLeft = false } = {}) {
    const allRoles = await this.#roles.getAll()

    /**
     * @type {Array<Promise<MemberInfo>>}
     */
    const activeMemberInfoPromises = []

    for (const [deviceId, role] of allRoles.entries()) {
      if (!includeLeft && !isActiveMemberRole(role)) {
        continue
      }

      const getMemberInfo = async () => {
        /** @type {MemberInfo} */
        const memberInfo = { deviceId, role }

        try {
          const deviceInfo = await this.#getDeviceInfo(deviceId)

          memberInfo.name = deviceInfo?.name
          memberInfo.deviceType = deviceInfo?.deviceType
          memberInfo.joinedAt = deviceInfo?.createdAt
          memberInfo.selfHostedServerDetails =
            deviceInfo?.selfHostedServerDetails
        } catch (e) {
          // Attempting to get someone else may throw because sync hasn't occurred or completed
          // Only throw if attempting to get themself since the relevant information should be available
          if (deviceId === this.#ownDeviceId) {
            throw new MissingOwnDeviceInfoError({ cause: e })
          }
        }

        return memberInfo
      }
      activeMemberInfoPromises.push(getMemberInfo())
    }

    return Promise.all(activeMemberInfoPromises)
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
 * @param {import('./roles.js').Role} role
 *
 * @returns {role is ActiveMemberInfo['role']}
 */
function isActiveMemberRole(role) {
  return ACTIVE_ROLE_IDS.includes(role.roleId)
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
  } catch {
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

/**
 * @param {Response} response
 * @returns {Promise<{ serverDeviceId: string }>}
 */
async function parseAddServerResponse(response) {
  if (response.status === 200) {
    try {
      const responseBody = await response.json()
      if (
        !(
          responseBody &&
          typeof responseBody === 'object' &&
          'data' in responseBody &&
          responseBody.data &&
          typeof responseBody.data === 'object' &&
          'deviceId' in responseBody.data &&
          typeof responseBody.data.deviceId === 'string'
        )
      ) {
        throw new InvalidResponseBodyError()
      }
      return { serverDeviceId: responseBody.data.deviceId }
    } catch {
      throw new InvalidServerResponseError(
        "Failed to add server peer because we couldn't parse the response"
      )
    }
  }

  let responseBody
  try {
    responseBody = await response.json()
  } catch {
    responseBody = null
  }
  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'error' in responseBody &&
    responseBody.error &&
    typeof responseBody.error === 'object' &&
    'code' in responseBody.error
  ) {
    switch (responseBody.error.code) {
      case 'PROJECT_NOT_IN_ALLOWLIST':
        throw new ProjectNotInAllowlistError()
      case 'TOO_MANY_PROJECTS':
        throw new ServerTooManyProjectsError()
      default:
        break
    }
  }

  throw new InvalidServerResponseError(
    `Failed to add server peer due to HTTP status code ${response.status}`
  )
}

/**
 * @param {string} url
 * @returns {{inviteIdString: string, deviceId: string}}
 */
export function parseInviteURL(url) {
  const { hash } = new URL(url)

  const params = new URLSearchParams(hash.slice(1))

  const inviteIdString = params.get('i')
  const deviceId = params.get('d')

  if (typeof inviteIdString !== 'string' || typeof deviceId !== 'string') {
    throw new Error('Missing invite and device parameters from URL')
  }
  return { inviteIdString, deviceId }
}

/**
 *
 * @param {string} inviteIdString
 * @param {string} deviceId
 * @returns {string}
 */
export function makeInviteURL(inviteIdString, deviceId) {
  const url = INTERNET_INVITE_PAGE + `#i=${inviteIdString}&d=${deviceId}`

  return url
}
