import { TypedEmitter } from 'tiny-typed-emitter'
import { PeerNotFoundError } from '../../src/errors.js'

/**
 * @typedef {object} MockInviteLinkRPCOptions
 * @property {TypedEmitter} [inviteApi] If set, redeem emits invite-received on this emitter
 * @property {string} [denyReason] If set, redeem triggers a deny instead of accept
 * @property {boolean} [noResponse] If true, redeem does not emit any response events
 * @property {boolean} [throwOnMarkReady] If true, markReady throws PeerNotFoundError
 */

/**
 * Shared mock of InviteLinkRPC for use in both joiner and member-api tests.
 * Records all method calls for assertions.
 *
 * @extends {TypedEmitter}
 */
export class MockInviteLinkRPC extends TypedEmitter {
  /** @type {TypedEmitter|undefined} */
  #inviteApi
  /** @type {string|undefined} */
  #denyReason
  /** @type {boolean} */
  #noResponse
  /** @type {boolean} */
  #throwOnMarkReady

  /** @type {string[]} */
  waitForPeerCalls = []
  /** @type {{inviteId: Buffer, deviceId: string}[]} */
  redeemCalls = []
  /** @type {{inviteId: Buffer, deviceId: string}[]} */
  redeemAckCalls = []
  /** @type {{inviteId: Buffer, deviceId: string}[]} */
  acceptCalls = []
  /** @type {{inviteId: Buffer, deviceId: string}[]} */
  acceptAckCalls = []
  /** @type {{inviteId: Buffer, deviceId: string, reason?: string}[]} */
  denyCalls = []
  /** @type {{inviteId: Buffer, deviceId: string}[]} */
  denyAckCalls = []
  /** @type {string[]} */
  disconnectCalls = []
  /** @type {string[]} */
  markReadyCalls = []

  /**
   * @param {MockInviteLinkRPCOptions} [opts]
   */
  constructor({
    inviteApi,
    denyReason,
    noResponse = false,
    throwOnMarkReady = false,
  } = {}) {
    super()
    this.#inviteApi = inviteApi
    this.#denyReason = denyReason
    this.#noResponse = noResponse
    this.#throwOnMarkReady = throwOnMarkReady
  }

  /** @param {string} deviceId */
  async waitForPeer(deviceId) {
    this.waitForPeerCalls.push(deviceId)
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async redeem(inviteId, deviceId) {
    this.redeemCalls.push({ inviteId, deviceId })
    if (this.#noResponse) return
    if (this.#inviteApi) {
      this.#inviteApi.emit('invite-received', {
        invitorDeviceId: deviceId,
        inviteId: inviteId.toString('hex'),
      })
    }
    if (!this.#denyReason) {
      this.emit('accepted', { inviteId }, deviceId)
    } else {
      this.emit('denied', { inviteId, reason: this.#denyReason }, deviceId)
    }
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async redeemAck(inviteId, deviceId) {
    this.redeemAckCalls.push({ inviteId, deviceId })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async accept(inviteId, deviceId) {
    this.acceptCalls.push({ inviteId, deviceId })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async acceptAck(inviteId, deviceId) {
    this.acceptAckCalls.push({ inviteId, deviceId })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   * @param {string} [reason]
   */
  async deny(inviteId, deviceId, reason) {
    this.denyCalls.push({ inviteId, deviceId, reason })
  }

  /**
   * @param {Buffer} inviteId
   * @param {string} deviceId
   */
  async denyAck(inviteId, deviceId) {
    this.denyAckCalls.push({ inviteId, deviceId })
  }

  /** @param {string} deviceId */
  async disconnect(deviceId) {
    this.disconnectCalls.push(deviceId)
  }

  /** @param {string} deviceId */
  markReady(deviceId) {
    if (this.#throwOnMarkReady) {
      throw new PeerNotFoundError()
    }
    this.markReadyCalls.push(deviceId)
  }
}
