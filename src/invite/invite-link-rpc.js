import Protomux from 'protomux'
import cenc from 'compact-encoding'
import pDefer from 'p-defer'
import { pEvent, TimeoutError } from 'p-event'
import { TypedEmitter } from 'tiny-typed-emitter'

import {
  RedeemInviteOverInternet,
  DenyInviteOverInternet,
  AcceptInviteOverInternet,
  DenyInviteOverInternet_DenyReason,
  RedeemInviteOverInternetAck,
  DenyInviteOverInternetAck,
  AcceptInviteOverInternetAck,
} from '../generated/invite.js'
import { peerIdFromNoise } from '../lib/noise-secret-stream-helpers.js'
import {
  PeerDisconnectedError,
  PeerNotFoundError,
  RPCDisconnectBeforeAckError,
  UnexpectedError,
} from '../errors.js'

/** @import {AuthedNoiseStream} from '../lib/noise-secret-stream-helpers.js'*/
/** @typedef {ReturnType<typeof Protomux.prototype.createChannel>} Channel */
/** @import {PeerProtomux} from '../local-peers.js' */

export const INTERNET_INVITE_PROTOCOL = 'comapeo/invite'
export const ACK_TIMEOUT = 10000
export const PEER_WAIT_TIMEOUT = 1000

const MESSAGE_TYPES = {
  RedeemInviteOverInternet: 0,
  DenyInviteOverInternet: 1,
  AcceptInviteOverInternet: 2,
  RedeemInviteOverInternetAck: 3,
  DenyInviteOverInternetAck: 4,
  AcceptInviteOverInternetAck: 5,
}

/**
 * @typedef {object} InviteLinkEvents
 * @property {(redeemed: RedeemInviteOverInternet, deviceId: string) => void} redeemed
 * @property {(denied: DenyInviteOverInternet, deviceId: string) => void} denied
 * @property {(accepted: AcceptInviteOverInternet, deviceId: string) => void} accepted
 * @property {(ack: RedeemInviteOverInternetAck, deviceId: string) => void} redeem-ack
 * @property {(ack: DenyInviteOverInternetAck, deviceId: string) => void} deny-ack
 * @property {(ack: AcceptInviteOverInternetAck, deviceId: string) => void} accept-ack
 * @property {(connection: AuthedNoiseStream) => void} connection-ready
 * @property {(connection: AuthedNoiseStream, deviceId: string) => void} connection
 * @property {(deviceId: string) => void} disconnected Emitted when a peer's invite-link connection is closed or disconnected
 */

/** @extends {TypedEmitter<InviteLinkEvents>}*/
export class InviteLinkRPC extends TypedEmitter {
  // Map device ID to connection and protomux channel
  /** @type {Map<string, {channel:Channel, stream: AuthedNoiseStream}>}*/
  #connections = new Map()

  /** @type {ReturnType<pDefer>|null} */
  #drainDefer = null

  constructor() {
    super()
  }

  // handle connections from unknown peers in case they expect to join the project by invite link
  /**
   * @param {AuthedNoiseStream} stream
   */
  async handleConnection(stream) {
    // Open protomux channel
    const noiseStream = stream.noiseStream

    // Wait for the noise handshake to complete so the remote public key
    // (and thus the device ID) is available.
    const opened = await noiseStream.opened
    if (!opened) return

    /** @type {PeerProtomux} */
    const protomux =
      noiseStream.userData && Protomux.isProtomux(noiseStream.userData)
        ? noiseStream.userData
        : Protomux.from(noiseStream)
    noiseStream.userData = protomux

    const deviceId = peerIdFromNoise(noiseStream)

    // Error if existing connection for this ID is opened already
    const onOpen = pDefer()

    const messages = [
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = RedeemInviteOverInternet.decode(msg)
          this.emit('redeemed', parsed, deviceId)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = DenyInviteOverInternet.decode(msg)
          this.emit('denied', parsed, deviceId)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = AcceptInviteOverInternet.decode(msg)
          this.emit('accepted', parsed, deviceId)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = RedeemInviteOverInternetAck.decode(msg)
          this.emit('redeem-ack', parsed, deviceId)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = DenyInviteOverInternetAck.decode(msg)
          this.emit('deny-ack', parsed, deviceId)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = AcceptInviteOverInternetAck.decode(msg)
          this.emit('accept-ack', parsed, deviceId)
        },
      },
    ]

    let channel = null
    const makeChannel = async () => {
      // If the peer opened the channel first, protomux has already matched it
      // - do not create a duplicate.
      if (protomux.opened({ protocol: INTERNET_INVITE_PROTOCOL })) return

      channel = protomux.createChannel({
        messages,
        protocol: INTERNET_INVITE_PROTOCOL,
        onopen: () => {
          onOpen.resolve()
        },
        onclose: () => {
          this.#removeConnection(deviceId, stream)
        },
        ondrain: () => {
          this.#drainDefer?.resolve()
          this.#drainDefer = null
        },
      })
      if (!channel) return

      channel.open()
    }

    // Answer the peer if it opens the channel before we do, and also open
    // proactively. The pair handler makes the open order-independent.
    protomux.pair({ protocol: INTERNET_INVITE_PROTOCOL }, makeChannel)
    makeChannel()

    // Wait for the channel to open before handing the connection on. We only
    // register the connection once it's open so callers (e.g. waitForPeer)
    // never try to send on a channel that hasn't finished its handshake.
    await onOpen.promise

    if (!channel) throw new UnexpectedError('Channel should be set after open')

    this.#connections.set(deviceId, { channel, stream })

    this.emit('connection', stream, deviceId)
  }

  /**
   * @param {string} deviceId
   * @param {object} [options]
   * @param {number} [options.timeoutMs]
   */
  async waitForPeer(deviceId, { timeoutMs = PEER_WAIT_TIMEOUT } = {}) {
    if (this.#connections.has(deviceId)) return
    await pEvent(this, 'connection', {
      filter: ([_connection, peerId]) => peerId === deviceId,
      multiArgs: true,
      timeout: timeoutMs,
    }).catch((e) => {
      throw e instanceof TimeoutError ? new PeerDisconnectedError() : e
    })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async redeem(inviteId, deviceId) {
    const msg = Buffer.from(
      RedeemInviteOverInternet.encode({ inviteId }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.RedeemInviteOverInternet,
      msg
    )
    // Send redeem, wait for ack
    await pEvent(this, 'redeem-ack', {
      filter: ({ inviteId: receivedInviteId }) =>
        receivedInviteId.equals(inviteId),
      timeout: ACK_TIMEOUT,
    }).catch((e) => {
      throw e instanceof TimeoutError
        ? new RPCDisconnectBeforeAckError({ type: 'redeem' })
        : e
    })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async redeemAck(inviteId, deviceId) {
    const msg = Buffer.from(
      RedeemInviteOverInternetAck.encode({ inviteId }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.RedeemInviteOverInternetAck,
      msg
    )
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async accept(inviteId, deviceId) {
    const msg = Buffer.from(
      AcceptInviteOverInternet.encode({ inviteId }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.AcceptInviteOverInternet,
      msg
    )
    await pEvent(this, 'accept-ack', {
      filter: ({ inviteId: receivedInviteId }) =>
        receivedInviteId.equals(inviteId),
      timeout: ACK_TIMEOUT,
    }).catch((e) => {
      throw e instanceof TimeoutError
        ? new RPCDisconnectBeforeAckError({ type: 'accept' })
        : e
    })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async acceptAck(inviteId, deviceId) {
    const msg = Buffer.from(
      AcceptInviteOverInternetAck.encode({ inviteId }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.AcceptInviteOverInternetAck,
      msg
    )
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   * @param {DenyInviteOverInternet_DenyReason} [reason]
   */
  async deny(
    inviteId,
    deviceId,
    reason = DenyInviteOverInternet_DenyReason.invitor_denied
  ) {
    const msg = Buffer.from(
      DenyInviteOverInternet.encode({
        inviteId,
        reason,
      }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.DenyInviteOverInternet,
      msg
    )
    // Close connection on ack or timeout.
    try {
      await pEvent(this, 'deny-ack', {
        filter: ({ inviteId: receivedInviteId }) =>
          receivedInviteId.equals(inviteId),
        timeout: ACK_TIMEOUT,
      })
    } catch {
      // ack timed out, still disconnect
    }
    await this.disconnect(deviceId)
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async denyAck(inviteId, deviceId) {
    const msg = Buffer.from(
      DenyInviteOverInternetAck.encode({ inviteId }).finish()
    )
    await this.#sendAndDrain(
      deviceId,
      MESSAGE_TYPES.DenyInviteOverInternetAck,
      msg
    )
  }

  /**
   * @param {string} deviceId
   */
  async disconnect(deviceId) {
    const connection = this.#connections.get(deviceId)
    if (!connection) return
    connection.stream.destroy()
    this.#removeConnection(deviceId, connection.stream)
  }

  /**
   * Remove a connection and emit `disconnected` once. Guarded so a peer is
   * only reported as disconnected once, even when both an explicit
   * `disconnect()` and the resulting channel `onclose` fire.
   * @param {string} deviceId
   * @param {AuthedNoiseStream} stream
   */
  #removeConnection(deviceId, stream) {
    const existing = this.#connections.get(deviceId)
    if (!existing) return
    if (existing.stream !== stream) return
    this.#connections.delete(deviceId)
    this.emit('disconnected', deviceId)
  }

  /**
   * Mark a connection as ready to be passed to local peer replication
   * @param {string} deviceId
   */
  markReady(deviceId) {
    const connection = this.#connections.get(deviceId)
    if (!connection) throw new PeerNotFoundError()
    this.emit('connection-ready', connection.stream)
  }

  /**
   * @param {string} deviceId
   * @param {number} messageId
   * @param {Buffer} msg
   */
  async #sendAndDrain(deviceId, messageId, msg) {
    const channel = this.#channelFor(deviceId)
    const didWrite = channel.messages[messageId].send(msg)
    if (!didWrite) {
      if (!this.#drainDefer) this.#drainDefer = pDefer()
      await this.#drainDefer.promise
    }
  }

  /**
   * @param {string} deviceId
   */
  #channelFor(deviceId) {
    const connection = this.#connections.get(deviceId)
    if (!connection) throw new PeerNotFoundError()
    return connection.channel
  }
}
