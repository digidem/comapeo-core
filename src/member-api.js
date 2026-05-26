import * as b4a from 'b4a'
import * as crypto from 'node:crypto'
import WebSocket from 'ws'
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
import { TypedEmitter } from 'tiny-typed-emitter'
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
  InvalidInternetInviteURLError,
  InviteAlreadyRedeemedError,
  UnknownInviteIDRedeemAttemptError,
  InviteNotYetRedeemedError,
  PeerDisconnectedSinceRedeemingInviteError,
  UnknownInviteIDError,
  MissingInviteAndDeviceParamsError,
  CannotBlockSelfError,
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
/** @import { PeerInfoDisconnected } from './local-peers.js' */
/** @import { InviteLinkRecord } from './invite/invite-links-api.js' */
/** @import { InviteLinksApiForProject } from './invite/invite-links-api.js' */

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
 * @typedef {object} InviteLinkParams
 * @property {string} inviteIdString
 * @property {string} swarmPublicKey
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
 * @property {(deviceId: string, inviteId: string) => void} internet-invite-redeemed Emitted when an invite over the internet has been redeemed, accept the deviceId to add them
 * @property {(inviteId: string) => void} internet-invite-cancelled Emitted when an invite over the internet has been redeemed, accept the deviceId to add them
 * @property {(err: Error, deviceId: string, url: string) => void} internet-invite-redeem-error Emitted when an invite over the internet has failed to be redeemed
 */

/**
 * @extends {TypedEmitter<MemberEvents>}
 */
export class MemberApi extends TypedEmitter {
  #ownDeviceId
  #roles
  #encryptionKeys
  #projectKey
  #rpc
  #makeWebsocket
  #getReplicationStream
  #waitForInitialSyncWithPeer
  #markInternetPeerAsTrusted
  #disconnectFromPeer
  #getProjectSettings
  #getDeviceInfo
  #setDeviceInfo
  #getSwarmPublicKey
  #inviteLinks
  #l

  /** @type {Map<string, { abortController: AbortController }>} */
  #outboundInvitesByDevice = new Map()

  /** Track which device IDs have redeemed each invite (by inviteId) */
  /** @type {Map<string, Set<string>>} */
  #redeemedInvites = new Map()

  /**
   * @param {Object} opts
   * @param {string} opts.deviceId public key of this device as hex string
   * @param {() => Buffer} opts.getSwarmPublicKey
   * @param {Pick<import('./roles.js').Roles, 'getAll' | 'assignRole' | 'getRole'>} opts.roles
   * @param {import('./generated/keys.js').EncryptionKeys} opts.encryptionKeys
   * @param {Buffer} opts.projectKey
   * @param {import('./local-peers.js').LocalPeers} opts.rpc
   * @param {Pick<InviteLinksApiForProject,'create'|'delete'|'deleteAll'|'getAll'|'getById'>} opts.inviteLinks
   * @param {(url: string) => WebSocket} [opts.makeWebsocket]
   * @param {() => ReplicationStream} opts.getReplicationStream
   * @param {(deviceId: string, abortSignal: AbortSignal) => Promise<void>} opts.waitForInitialSyncWithPeer
   * @param {(deviceId: string) => Promise<boolean>} opts.markInternetPeerAsTrusted
   * @param {(deviceId: string) => Promise<void>} opts.disconnectFromPeer
   * @param {() => Promise<import('./mapeo-project.js').EditableProjectSettings>} opts.getProjectSettings
   * @param {(deviceId: string) => Promise<DeviceInfo>} opts.getDeviceInfo
   * @param {(deviceId: string, deviceInfo: NewDeviceInfo) => Promise<void>} opts.setDeviceInfo
   * @param {Logger} [opts.logger]
   */
  constructor({
    deviceId,
    roles,
    encryptionKeys,
    projectKey,
    rpc,
    inviteLinks,
    makeWebsocket = (url) => new WebSocket(url),
    getReplicationStream,
    waitForInitialSyncWithPeer,
    markInternetPeerAsTrusted,
    disconnectFromPeer,
    getProjectSettings,
    getDeviceInfo,
    setDeviceInfo,
    getSwarmPublicKey,
    logger,
  }) {
    super()
    this.#l = Logger.create('member-api', logger)
    this.#ownDeviceId = deviceId
    this.#roles = roles
    this.#encryptionKeys = encryptionKeys
    this.#projectKey = projectKey
    this.#rpc = rpc
    this.#inviteLinks = inviteLinks
    this.#makeWebsocket = makeWebsocket
    this.#getReplicationStream = getReplicationStream
    this.#waitForInitialSyncWithPeer = waitForInitialSyncWithPeer
    this.#markInternetPeerAsTrusted = markInternetPeerAsTrusted
    this.#disconnectFromPeer = disconnectFromPeer
    this.#getProjectSettings = getProjectSettings
    this.#getDeviceInfo = getDeviceInfo
    this.#setDeviceInfo = setDeviceInfo
    this.#getSwarmPublicKey = getSwarmPublicKey

    // Setup event listeners
    this.#rpc.on('invite-over-internet-redeemed', (peerId, redeem) =>
      this.#handleRedeemInviteOverInternet(peerId, redeem)
    )
    this.#rpc.on('peer-remove', this.#handlePeerRemove)
  }

  async close() {
    this.#rpc.removeListener('peer-remove', this.#handlePeerRemove)
  }

  /**
   * Start inviting somone over the internet. Returns a URL for the recipient to load.
   * @param {InviteOptions} opts
   */
  async createInviteLink(opts) {
    const inviteId = opts.__testOnlyInviteId || crypto.randomBytes(32)
    const inviteIdString = inviteId.toString('hex')
    const swarmPublicKey = this.#getSwarmPublicKey().toString('hex')

    const url = makeInviteURL({ inviteIdString, swarmPublicKey })

    await this.#inviteLinks.create({
      inviteId: inviteIdString,
      inviteIdBuffer: inviteId,
      url,
      opts,
    })

    return url
  }

  /**
   * Cancel an invite over internet attempt. Omit the specific URL to cancel all instances
   * @param {string} [url]
   */
  async cancelInviteLink(url) {
    if (!url) {
      const invites = await this.#inviteLinks.getAll()
      for (const invite of invites) {
        this.emit('internet-invite-cancelled', invite.inviteId)
      }
      await this.#inviteLinks.deleteAll()
      return
    }
    const { inviteIdString } = parseInviteURL(url)
    await this.#cancelInviteLinkById(inviteIdString)
  }

  /**
   * Cancel an invite over internet attempt.
   * @param {string} inviteIdString
   */
  async #cancelInviteLinkById(inviteIdString) {
    if (!(await this.#inviteLinks.getById(inviteIdString))) {
      throw new InvalidInternetInviteURLError()
    }
    this.#redeemedInvites.delete(inviteIdString)
    this.emit('internet-invite-cancelled', inviteIdString)
    await this.#inviteLinks.delete(inviteIdString)
  }

  /**
   * Get the list of pending invites over the internet
   * @returns {Promise<Pick<InviteLinkRecord, 'url' | 'inviteId' | 'createdAt' | 'expiresAt'>[]>}
   */
  async listInviteLinks() {
    const invites = await this.#inviteLinks.getAll()
    return invites.map(({ url, inviteId, createdAt, expiresAt }) => ({
      url,
      inviteId,
      createdAt,
      expiresAt,
    }))
  }

  /**
   * When a peer disconnects, remove them from the redeemed invites set.
   * @param {PeerInfoDisconnected} peer
   */
  #handlePeerRemove = async (peer) => {
    if (!peer) return
    for (const deviceIds of this.#redeemedInvites.values()) {
      if (deviceIds.has(peer.deviceId)) {
        deviceIds.delete(peer.deviceId)
        break
      }
    }
  }

  /**
   * Handle an incoming redeem attempt from the RPC layer.
   * @param {string} peerId
   * @param {RedeemInviteOverInternet} redeem
   */
  async #handleRedeemInviteOverInternet(peerId, { inviteId }) {
    const inviteIdString = inviteId.toString('hex')
    this.#l.log(
      'Got incoming invite redeem',
      inviteIdString.slice(0, 7),
      'from',
      peerId
    )

    const invite = await this.#inviteLinks.getById(inviteIdString)
    if (!invite) {
      this.#l.log(
        'Incoming invite was invalid, disconnecting',
        inviteIdString.slice(0, 7)
      )

      this.emit(
        'internet-invite-redeem-error',
        new UnknownInviteIDRedeemAttemptError(),
        peerId,
        inviteIdString
      )
      await this.#disconnectFromPeer(peerId)
      return
    }

    const redeemedSet = this.#redeemedInvites.get(inviteIdString)
    if (redeemedSet?.has(peerId)) {
      this.#l.log(
        'Incoming invite was already redeemed, disconnecting',
        inviteIdString.slice(0, 7)
      )
      this.emit(
        'internet-invite-redeem-error',
        new InviteAlreadyRedeemedError(),
        peerId,
        inviteIdString
      )
      await this.#disconnectFromPeer(peerId)
      return
    }

    try {
      if (!redeemedSet) {
        this.#redeemedInvites.set(inviteIdString, new Set([peerId]))
      } else {
        redeemedSet.add(peerId)
      }
      this.emit('internet-invite-redeemed', peerId, inviteIdString)
    } catch (e) {
      this.emit(
        'internet-invite-redeem-error',
        ensureKnownError(e),
        peerId,
        inviteIdString
      )
      await this.#disconnectFromPeer(peerId)
    }
  }

  /**
   * Accept a specific device's attempt at redeeming an invite.
   * @param {object} opts
   * @param {string} opts.inviteId
   * @param {string} opts.deviceId
   * @returns {Promise<InviteDecision>}
   */
  async acceptRedeemedInvite({ inviteId, deviceId }) {
    const redeemedSet = this.#redeemedInvites.get(inviteId)
    if (!redeemedSet || !redeemedSet.has(deviceId)) {
      throw new InviteNotYetRedeemedError()
    }

    const pendingInvite = await this.#inviteLinks.getById(inviteId)
    if (!pendingInvite) {
      throw new UnknownInviteIDError()
    }

    const stillConnected = await this.#markInternetPeerAsTrusted(deviceId)

    if (!stillConnected) {
      throw new PeerDisconnectedSinceRedeemingInviteError()
    }
    const { roleId, roleName, roleDescription } = pendingInvite
    const decision = await this.invite(deviceId, {
      roleId,
      roleName,
      roleDescription,
    })

    return decision
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
    if (deviceId === this.#ownDeviceId) {
      throw new CannotBlockSelfError()
    }

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
 * @returns {InviteLinkParams}
 */
export function parseInviteURL(url) {
  const { hash } = new URL(url)

  const params = new URLSearchParams(hash.slice(1))

  const inviteIdString = params.get('i')
  const swarmPublicKey = params.get('d')

  if (
    typeof inviteIdString !== 'string' ||
    typeof swarmPublicKey !== 'string'
  ) {
    throw new MissingInviteAndDeviceParamsError()
  }
  return { inviteIdString, swarmPublicKey }
}

/**
 * @param {InviteLinkParams} opts
 * @returns {string}
 */
export function makeInviteURL({ inviteIdString, swarmPublicKey }) {
  const url = INTERNET_INVITE_PAGE + `#i=${inviteIdString}&d=${swarmPublicKey}`

  return url
}
