import Protomux from 'protomux'
import cenc from 'compact-encoding'
import pDefer from 'p-defer'
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
import { PeerNotFoundError } from '../errors.js'
import { pEvent } from 'p-event'

/** @import {AuthedNoiseStream} from '../lib/noise-secret-stream-helpers.js'*/
/** @typedef {ReturnType<typeof Protomux.prototype.createChannel>} Channel */
/** @import {PeerProtomux} from '../local-peers.js' */

export const INTERNET_INVITE_PROTOCOL = 'comapeo/internet-invite'
export const ACK_TIMEOUT = 1000

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
 * @property {(redeemed: RedeemInviteOverInternet) => void} redeemed
 * @property {(denied: DenyInviteOverInternet) => void} denied
 * @property {(accepted: AcceptInviteOverInternet) => void} accepted
 * @property {(ack: RedeemInviteOverInternetAck) => void} redeem-ack
 * @property {(ack: DenyInviteOverInternetAck) => void} deny-ack
 * @property {(ack: AcceptInviteOverInternetAck) => void} accept-ack
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
          this.emit('redeemed', parsed)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = DenyInviteOverInternet.decode(msg)
          this.emit('denied', parsed)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = AcceptInviteOverInternet.decode(msg)
          this.emit('accepted', parsed)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = RedeemInviteOverInternetAck.decode(msg)
          this.emit('redeem-ack', parsed)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = DenyInviteOverInternetAck.decode(msg)
          this.emit('deny-ack', parsed)
        },
      },
      {
        encoding: cenc.raw,
        onmessage: /** @param {Buffer} msg */ (msg) => {
          const parsed = AcceptInviteOverInternetAck.decode(msg)
          this.emit('accept-ack', parsed)
        },
      },
    ]

    const channel = protomux.createChannel({
      messages,
      protocol: INTERNET_INVITE_PROTOCOL,
      onopen: () => {
        onOpen.resolve()
      },
      ondrain: () => {
        this.#drainDefer?.resolve()
      },
    })

    this.#connections.set(deviceId, { channel, stream })

    channel.open()

    // Save to connections
    // clear from connections and redeemedInvites on close
    // wait for open before returning
    await onOpen.promise
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
    // Send redeem, wait for accept or deny or disconnect.
    await pEvent(this, 'redeem-ack', {
      filter: ({ inviteId: receivedInviteId }) =>
        receivedInviteId.equals(inviteId),
      timeout: ACK_TIMEOUT,
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
    // Wait for ack.
    await pEvent(this, 'accept-ack', {
      filter: ({ inviteId: receivedInviteId }) =>
        receivedInviteId.equals(inviteId),
      timeout: ACK_TIMEOUT,
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
    this.#connections.delete(deviceId)
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
