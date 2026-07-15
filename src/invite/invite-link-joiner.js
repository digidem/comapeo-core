import { TypedEmitter } from 'tiny-typed-emitter'
import { pEvent } from 'p-event'
import { parseInviteURL } from './invite-urls.js'
import {
  ExistingJoinRequestError,
  InviteRedeemConnectionClosedError,
  JoinRequestNotFoundError,
  JoinProjectCancelledError,
} from '../errors.js'

/** @import { RemoteDiscovery } from '../discovery/remote-discovery.js' */
/** @import { LocalPeers } from '../local-peers.js' */
/** @import { InviteApi } from '../invite/invite-api.js' */

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
 * @property {(swarmPublicKey: string, opts?: ConnectPeerOptions) => Promise<import('../discovery/remote-discovery.js').RemoteAuthedNoiseStream>} options.connectPeer Connect to a remote peer
 * @property {(swarmPublicKey: string) => Promise<void>} options.disconnectPeer Disconnect from a remote peer
 * @property {(deviceId: string, redeem: RedeemInvite) => Promise<void>} options.sendRedeemInviteOverInternet Send redeem request to a peer
 * @property {Pick<InviteApi, 'on' | 'accept'>} options.inviteApi Invite API (on + accept only)
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
  /** @type {InviteLinkJoinerOptions['disconnectPeer']} */
  #disconnectPeer
  /** @type {InviteLinkJoinerOptions['sendRedeemInviteOverInternet']} */
  #sendRedeemInviteOverInternet
  /** @type {InviteLinkJoinerOptions['inviteApi']} */
  #inviteApi
  /** @type {number} */
  #defaultTimeout
  /** @type {Map<string, PendingJoinRequest>} */
  #pending = new Map()

  /**
   * @param {InviteLinkJoinerOptions} options
   */
  constructor({
    connectPeer,
    disconnectPeer,
    sendRedeemInviteOverInternet,
    inviteApi,
    defaultTimeout = 60_000,
  }) {
    super()
    this.#connectPeer = connectPeer
    this.#disconnectPeer = disconnectPeer
    this.#sendRedeemInviteOverInternet = sendRedeemInviteOverInternet
    this.#inviteApi = inviteApi
    this.#defaultTimeout = defaultTimeout
  }

  /**
   * Create and start a join request from an invite URL.
   *
   * @param {string} url Invite URL
   * @param {object} [opts]
   * @param {number} [opts.timeout] Connection timeout in ms
   * @returns {JoinRequest}
   */
  createJoinRequest(url, { timeout = this.#defaultTimeout } = {}) {
    const parsed = parseInviteURL(url)
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

    try {
      const connection = await this.#connectPeer(swarmPublicKey, {
        timeout,
        signal,
      })

      signal.addEventListener(
        'abort',
        () => this.#disconnectPeer(swarmPublicKey),
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

      // Connected
      joinRequest.status = 'connected'
      this.#emitUpdate(joinRequest)

      // Use the identity key from the handshake, not the swarm key from the URL
      const identityPublicKeyHex = connection.handshakePublicKey.toString('hex')

      const onInvited = pEvent(this.#inviteApi, 'invite-received', {
        filter: (invite) => invite.invitorDeviceId === identityPublicKeyHex,
        signal,
      })

      // Race: wait for invite vs connection close
      const [invite] = await Promise.race([
        Promise.all([
          onInvited,
          this.#sendRedeemInviteOverInternet(identityPublicKeyHex, {
            inviteId: inviteIdBuffer,
          }),
        ]),
        onClose,
      ])

      // Accepted
      joinRequest.status = 'accepted'
      this.#emitUpdate(joinRequest)

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
      joinRequest.error = /** @type {Error} */ (e)
      this.#emitUpdate(joinRequest)

      try {
        await this.#disconnectPeer(swarmPublicKey)
      } catch {
        // ignore disconnect errors
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
