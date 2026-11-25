import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { parseInviteURL } from './invite-urls.js'
import {
  AlreadyJoinedError,
  ExistingJoinRequestError,
  ConnectionLostError,
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
  UnknownInviteIDError,
  InviteExpiredError,
} from '../errors.js'
import { DenyInviteOverInternet_DenyReason } from '../generated/invite.js'

/**
 * Error codes that indicate a network/transport failure
 * @type {Set<string>}
 */
const NETWORK_ERROR_CODES = new Set([
  TimeoutError.code,
  PeerDisconnectedError.code,
  RPCDisconnectBeforeSendingError.code,
  RPCDisconnectBeforeAckError.code,
  UnknownPeerError.code,
  InitialSyncFailedError.code,
])

/**
 * Join request statuses that are final — a request in one of these is no
 * longer in flight and its entry may be replaced by a new attempt.
 * @type {Set<JoinRequestStatus>}
 */
const TERMINAL_STATUSES = new Set(['completed', 'failed'])

/** @import {
  AcceptInviteOverInternet,
  DenyInviteOverInternet,
} from '../generated/invite.js' */
/** @import { InviteApi } from '../invite/invite-api.js' */
/** @import { InviteLinkRPC } from '../invite/invite-link-rpc.js' */
/** @import { KnownError } from '../errors.js' */

/**
 * @typedef {'connecting' | 'connected' | 'accepted' | 'completed' | 'failed'} JoinRequestStatus
 */

/**
 * @typedef {object} JoinRequestBase
 * @property {string} inviteId Hex invite ID
 * @property {string} swarmPublicKey Invitor's swarm public key
 * @property {string} url Original invite URL
 * @property {JoinRequestStatus} status Current status
 */

/** @typedef {JoinRequestBase & { status: 'connecting' }} JoinRequestConnecting */

/** @typedef {JoinRequestBase & { status: 'connected' }} JoinRequestConnected */

/** @typedef {JoinRequestBase & { status: 'accepted' }} JoinRequestAccepted */

/** @typedef {JoinRequestBase & { status: 'completed', projectId: string }} JoinRequestCompleted */

/** @typedef {JoinRequestBase & { status: 'failed', error: string }} JoinRequestFailed */

/**
 * A join request initiated via an invite URL. Listen to `join-request-update`
 * events for progress.
 *
 * `status` is a discriminant: `projectId` is only present when status is
 * `completed`, and `error` (an error code) is only present when status is
 * `failed`.
 *
 * @typedef {JoinRequestConnecting | JoinRequestConnected | JoinRequestAccepted | JoinRequestCompleted | JoinRequestFailed} JoinRequest
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
 * @property {(update: JoinRequest) => void} join-request-update
 * @property {(error: KnownError & { inviteId: string }) => void} join-request-error
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
  #requests = new Map()

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
   * An in-flight request for the same invite ID throws
   * `ExistingJoinRequestError`. A finished (`failed`/`completed`) request for
   * the same invite ID is replaced with a fresh attempt, and finished
   * requests for other invite IDs are left in place.
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

    // An in-flight request for this invite ID cannot be started again; a
    // finished (terminal) one is replaced so the link can be re-clicked.
    const existing = this.#requests.get(inviteId)
    if (existing && !TERMINAL_STATUSES.has(existing.joinRequest.status)) {
      throw new ExistingJoinRequestError({ inviteId })
    }

    const redeemAbortController = new AbortController()
    /** @type {PendingJoinRequest} */
    const pending = {
      abortController: redeemAbortController,
      joinRequest: {
        inviteId,
        swarmPublicKey: parsed.swarmPublicKey,
        url,
        status: 'connecting',
      },
    }
    this.#requests.set(inviteId, pending)

    this.emit('join-request-update', pending.joinRequest)

    // Start the async flow (fire-and-forget)
    this.#runJoinFlow(pending, parsed, timeout, redeemAbortController)

    return pending.joinRequest
  }

  /**
   * @param {PendingJoinRequest} pending
   * @param {ReturnType<typeof parseInviteURL>} parsed
   * @param {number} timeout
   * @param {AbortController} redeemAbortController
   */
  async #runJoinFlow(pending, parsed, timeout, redeemAbortController) {
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

      // Once the redeem has been sent and ack'd, a closed connection means the
      // join can no longer complete.
      const onClose = pEvent(connection, 'close').then(
        () => {
          throw new ConnectionLostError()
        },
        // Handle `error` event on connection if there's sudden closes
        (e) => {
          throw new ConnectionLostError({ cause: e })
        }
      )
      // It's okay if this rejection never gets handled
      onClose.catch(noop)

      // Use the identity key from the handshake, not the swarm key from the URL
      const identityPublicKeyHex =
        connection.authenticatedPublicKey.toString('hex')

      await this.#inviteLinkRPC.waitForPeer(identityPublicKeyHex)

      // Connected
      pending.joinRequest = { ...pending.joinRequest, status: 'connected' }
      this.emit('join-request-update', pending.joinRequest)

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
        if (reason === DenyInviteOverInternet_DenyReason.unknown_invite_id) {
          throw new UnknownInviteIDError()
        }
        if (reason === DenyInviteOverInternet_DenyReason.already_joined) {
          throw new AlreadyJoinedError()
        }
        throw new InviteDeniedByInviterError()
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
      pending.joinRequest = { ...pending.joinRequest, status: 'accepted' }
      this.emit('join-request-update', pending.joinRequest)

      // Race: wait for invite vs connection close
      const invite = await Promise.race([onInvited, onClose])

      const joinProject = this.#inviteApi.accept(
        /** @type {{ inviteId: string }} */ (invite)
      )
      // A dropped connection during the join's initial sync is a connection
      // loss, not a sync failure.
      const projectId = await Promise.race([joinProject, onClose])
      joinProject.catch(noop)

      // Completed
      pending.joinRequest = {
        ...pending.joinRequest,
        status: 'completed',
        projectId,
      }
      this.emit('join-request-update', pending.joinRequest)

      connection.end()
    } catch (e) {
      // Failed
      const error = wrapNetworkError(e, pending.joinRequest.inviteId)
      pending.joinRequest = {
        ...pending.joinRequest,
        status: 'failed',
        error: error.code,
      }
      this.emit('join-request-update', pending.joinRequest)
      this.emit('join-request-error', error)

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
    }
  }

  /**
   * Get a join request by invite ID.
   *
   * @param {string} inviteId Hex invite ID
   * @returns {JoinRequest}
   * @throws {JoinRequestNotFoundError}
   */
  getJoinRequestById(inviteId) {
    const pending = this.#requests.get(inviteId)
    if (!pending) {
      throw new JoinRequestNotFoundError({ inviteId })
    }
    return pending.joinRequest
  }

  /**
   * Get all join requests, both in-flight and finished (`failed`/`completed`).
   * Finished requests persist until their entry is replaced by a new
   * {@link InviteLinkJoiner.createJoinRequest} for the same invite ID.
   *
   * @returns {JoinRequest[]}
   */
  getJoinRequests() {
    return [...this.#requests.values()].map((p) => p.joinRequest)
  }

  /**
   * Cancel an in-flight join request.
   *
   * The request transitions to `failed` (with `JoinProjectCancelledError`) and
   * remains in the list — it is not removed.
   *
   * @param {string} inviteId Hex invite ID
   * @param {Error} [reason] Reason for cancellation. Defaults to a generic cancellation error.
   * @returns {void}
   */
  cancelJoinRequest(inviteId, reason) {
    const pending = this.#requests.get(inviteId)
    if (!pending) {
      throw new JoinRequestNotFoundError({ inviteId })
    }
    pending.abortController.abort(reason ?? new JoinProjectCancelledError())
  }
}

/** @param {unknown} _x */
function noop(_x) {}

/**
 * Wrap network/transport errors in an InviteConnectionError, pass others through.
 * @param {unknown} e
 * @returns {KnownError}
 */
/**
 * Wrap a join-flow error as a KnownError carrying the inviteId, so concurrent
 * join requests can be told apart on the `join-request-error` event.
 *
 * @param {unknown} e
 * @param {string} inviteId
 * @returns {KnownError & { inviteId: string }}
 */
function wrapNetworkError(e, inviteId) {
  const err = ensureKnownError(e)
  const wrapped = NETWORK_ERROR_CODES.has(err.code)
    ? new InviteConnectionError({ cause: err })
    : err
  return Object.assign(wrapped, { inviteId })
}
