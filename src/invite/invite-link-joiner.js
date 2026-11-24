import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { parseInviteURL } from './invite-urls.js'
import {
  ExistingJoinRequestError,
  InviteRedeemConnectionClosedError,
  InviteConnectionError,
  JoinRequestNotFoundError,
  JoinProjectCancelledError,
  TimeoutError,
  PeerDisconnectedError,
  RPCDisconnectBeforeSendingError,
  RPCDisconnectBeforeAckError,
  UnknownPeerError,
  InitialSyncFailedError,
  ensureKnownError,
  InviteDeniedByInviterError,
  InviteExpiredError,
} from '../errors.js'

/**
 * Error codes that indicate a network/transport failure
 * @type {Set<string>}
 */
const NETWORK_ERROR_CODES = new Set([
  TimeoutError.code,
  InviteRedeemConnectionClosedError.code,
  PeerDisconnectedError.code,
  RPCDisconnectBeforeSendingError.code,
  RPCDisconnectBeforeAckError.code,
  UnknownPeerError.code,
  InitialSyncFailedError.code,
])

/** @import {
  AcceptInviteOverInternet,
  DenyInviteOverInternet,
} from '../generated/invite.js' */
/** @import { InviteApi } from '../invite/invite-api.js' */
/** @import { InviteLinkRPC } from '../invite/invite-link-rpc.js' */

/**
 * @typedef {'connecting' | 'connected' | 'accepted' | 'completed' | 'failed'} JoinRequestStatus
 */

/**
 * A join request initiated via an invite URL. Listen to `join-request-update`
 * events for progress.
 *
 * @typedef {object} JoinRequest
 * @property {string} inviteId Hex invite ID
 * @property {string} swarmPublicKey Invitor's swarm public key
 * @property {string} url Original invite URL
 * @property {JoinRequestStatus} status Current status
 * @property {Error|null} error Error if status is 'failed'
 * @property {string|undefined} projectId Resolved project ID on completion
 */

/**
 * @typedef {object} JoinRequestUpdate
 * @property {JoinRequestStatus} status
 * @property {string} inviteId
 * @property {Error|null} [error]
 * @property {string|undefined} [projectId]
 */

/**
 * @typedef {object} ConnectPeerOptions
 * @property {number} [timeout]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {object} RedeemInvite
 * @property {Buffer} inviteId
 */

/**
 * @typedef {object} InviteLinkJoinerOptions
 * @property {(swarmPublicKey: string, opts?: ConnectPeerOptions) => Promise<import('../lib/noise-secret-stream-helpers.js').AuthedNoiseStream>} options.connectPeer Connect to a remote peer
 * @property {Pick<InviteApi, 'on' | 'accept'>} options.inviteApi Invite API (on + accept only)
 * @property {Pick<InviteLinkRPC, 'once' | 'on'| 'acceptAck'|'denyAck'|'redeem'|'disconnect'|'waitForPeer'|'markReady'>} options.inviteLinkRPC
 * @property {() => Promise<{name?: string}>} options.getDeviceInfo Get the current user's device info (for the invitee name sent with the redeem)
 * @property {number} [options.defaultTimeout] Default timeout in ms for peer connection (default: 60_000)
 */

/**
 * @typedef {object} InviteLinkJoinerEvents
 * @property {(update: JoinRequestUpdate) => void} join-request-update
 */

/**
 * @typedef {object} PendingJoinRequest
 * @property {AbortController} abortController
 * @property {JoinRequest} joinRequest
 */

/**
 * @extends {TypedEmitter<InviteLinkJoinerEvents>}
 */
export class InviteLinkJoiner extends TypedEmitter {
  /** @type {InviteLinkJoinerOptions['connectPeer']} */
  #connectPeer
  /** @type {InviteLinkJoinerOptions['inviteApi']} */
  #inviteApi
  /** @type {InviteLinkJoinerOptions['inviteLinkRPC']} */
  #inviteLinkRPC
  /** @type {InviteLinkJoinerOptions['getDeviceInfo']} */
  #getDeviceInfo
  /** @type {number} */
  #defaultTimeout
  /** @type {Map<string, PendingJoinRequest>} */
  #pending = new Map()

  /**
   * @param {InviteLinkJoinerOptions} options
   */
  constructor({
    connectPeer,
    inviteApi,
    inviteLinkRPC,
    getDeviceInfo,
    defaultTimeout = 60_000,
  }) {
    super()
    this.#connectPeer = connectPeer
    this.#inviteApi = inviteApi
    this.#inviteLinkRPC = inviteLinkRPC
    this.#getDeviceInfo = getDeviceInfo
    this.#defaultTimeout = defaultTimeout
  }

  /**
   * Create and start a join request from an invite URL.
   *
   * @param {string} url Invite URL
   * @param {object} [opts]
   * @param {number} [opts.timeout] Connection timeout in ms
   * @returns {JoinRequest}
   * @throws {ExistingJoinRequestError}
   * @throws {InviteExpiredError}
   */
  createJoinRequest(url, { timeout = this.#defaultTimeout } = {}) {
    const parsed = parseInviteURL(url)
    if (Date.now() >= parsed.expiresAt) {
      throw new InviteExpiredError()
    }
    const inviteId = parsed.inviteIdString

    if (this.#pending.has(inviteId)) {
      throw new ExistingJoinRequestError({ inviteId })
    }

    const redeemAbortController = new AbortController()
    /** @type {JoinRequest} */
    const joinRequest = {
      inviteId,
      swarmPublicKey: parsed.swarmPublicKey,
      url,
      status: 'connecting',
      error: null,
      projectId: undefined,
    }
    this.#pending.set(inviteId, {
      abortController: redeemAbortController,
      joinRequest,
    })

    this.#emitUpdate(joinRequest)

    // Start the async flow (fire-and-forget)
    this.#runJoinFlow(joinRequest, parsed, timeout, redeemAbortController)

    return joinRequest
  }

  /**
   * @param {JoinRequest} joinRequest
   * @param {ReturnType<typeof parseInviteURL>} parsed
   * @param {number} timeout
   * @param {AbortController} redeemAbortController
   */
  async #runJoinFlow(joinRequest, parsed, timeout, redeemAbortController) {
    const { inviteIdString, swarmPublicKey } = parsed
    const inviteIdBuffer = Buffer.from(inviteIdString, 'hex')
    const signal = redeemAbortController.signal

    let connection = null

    try {
      connection = await this.#connectPeer(swarmPublicKey, {
        timeout,
        signal,
      })

      signal.addEventListener(
        'abort',
        () => this.#inviteLinkRPC.disconnect(swarmPublicKey),
        { once: true }
      )

      const onClose = pEvent(connection, 'close').then(
        () => {
          throw new InviteRedeemConnectionClosedError()
        },
        // Handle `error` event on connection if there's sudden closes
        (e) => {
          throw new InviteRedeemConnectionClosedError({ cause: e })
        }
      )
      // It's okay if this rejection never gets handled
      onClose.catch(noop)

      // Use the identity key from the handshake, not the swarm key from the URL
      const identityPublicKeyHex =
        connection.authenticatedPublicKey.toString('hex')

      await this.#inviteLinkRPC.waitForPeer(identityPublicKeyHex)

      // Connected
      joinRequest.status = 'connected'
      this.#emitUpdate(joinRequest)

      const onInvited = pEvent(this.#inviteApi, 'invite-received', {
        filter: (invite) => invite.invitorDeviceId === identityPublicKeyHex,
        signal,
      })
      // It's okay if this rejection never gets handled (e.g. we went down the
      // deny/close path before consuming it)
      onInvited.catch(noop)

      const onAccept = pEvent(this.#inviteLinkRPC, 'accepted', {
        filter: /** @param {AcceptInviteOverInternet} accept */ (accept) =>
          accept.inviteId.equals(inviteIdBuffer),
        signal,
      })
      onAccept.catch(noop)
      const onDeny = pEvent(this.#inviteLinkRPC, 'denied', {
        filter: /** @param {DenyInviteOverInternet} deny */ (deny) =>
          deny.inviteId.equals(inviteIdBuffer),
        signal,
      }).then(async ({ reason }) => {
        await this.#inviteLinkRPC.denyAck(inviteIdBuffer, identityPublicKeyHex)
        throw new InviteDeniedByInviterError({ reason })
      })
      onDeny.catch(noop)

      // Send redeem and wait for ack
      const { name = '' } = await this.#getDeviceInfo()
      await this.#inviteLinkRPC.redeem(
        name,
        inviteIdBuffer,
        identityPublicKeyHex
      )

      // Make available to local-peers and regular invite RPC
      this.#inviteLinkRPC.markReady(identityPublicKeyHex)

      // Wait for the accept or deny to happen
      // This will throw on deny or close
      await Promise.race([onAccept, onDeny, onClose])

      // Tell the invitor we've marked the connection as ready
      await this.#inviteLinkRPC.acceptAck(inviteIdBuffer, identityPublicKeyHex)

      // Accepted
      joinRequest.status = 'accepted'
      this.#emitUpdate(joinRequest)

      // Race: wait for invite vs connection close
      const invite = await Promise.race([onInvited, onClose])

      const projectId = await this.#inviteApi.accept(
        /** @type {{ inviteId: string }} */ (invite)
      )

      // Completed
      joinRequest.status = 'completed'
      joinRequest.projectId = projectId
      this.#emitUpdate(joinRequest)

      connection.end()
    } catch (e) {
      // Failed
      joinRequest.status = 'failed'
      joinRequest.error = wrapNetworkError(e)
      this.#emitUpdate(joinRequest)

      if (connection) {
        // Use the identity key from the handshake, not the swarm key from the URL
        const identityPublicKeyHex =
          connection.authenticatedPublicKey.toString('hex')

        try {
          await this.#inviteLinkRPC.disconnect(identityPublicKeyHex)
        } catch {
          // ignore disconnect errors
        }
      }
    } finally {
      this.#pending.delete(inviteIdString)
    }
  }

  /**
   * @param {JoinRequest} joinRequest
   */
  #emitUpdate(joinRequest) {
    /** @type {JoinRequestUpdate} */
    const update = {
      status: joinRequest.status,
      inviteId: joinRequest.inviteId,
      error: joinRequest.error,
      projectId: joinRequest.projectId,
    }
    this.emit('join-request-update', update)
  }

  /**
   * Get a join request by invite ID.
   *
   * @param {string} inviteId Hex invite ID
   * @returns {JoinRequest}
   * @throws {JoinRequestNotFoundError}
   */
  getJoinRequestById(inviteId) {
    const pending = this.#pending.get(inviteId)
    if (!pending) {
      throw new JoinRequestNotFoundError({ inviteId })
    }
    return pending.joinRequest
  }

  /**
   * Get all active (in-flight) join requests.
   *
   * @returns {JoinRequest[]}
   */
  getJoinRequests() {
    return [...this.#pending.values()].map((p) => p.joinRequest)
  }

  /**
   * Cancel an in-flight join request.
   *
   * @param {string} inviteId Hex invite ID
   * @param {Error} [reason] Reason for cancellation. Defaults to a generic cancellation error.
   * @returns {void}
   */
  cancelJoinRequest(inviteId, reason) {
    const pending = this.#pending.get(inviteId)
    if (!pending) {
      throw new JoinRequestNotFoundError({ inviteId })
    }
    pending.abortController.abort(reason ?? new JoinProjectCancelledError())
    this.#pending.delete(inviteId)
  }
}

/** @param {unknown} _x */
function noop(_x) {}

/**
 * Wrap network/transport errors in an InviteConnectionError, pass others through.
 * @param {unknown} e
 * @returns {Error}
 */
function wrapNetworkError(e) {
  const err = ensureKnownError(e)
  if (NETWORK_ERROR_CODES.has(err.code)) {
    return new InviteConnectionError({ cause: err })
  }
  return err
}
