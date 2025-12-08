import { TypedEmitter } from 'tiny-typed-emitter'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'

/** @import { MapShareRequest, MapShareResponse, MapShareURL } from './generated/rpc.js' */
/** @import { LocalPeers } from './local-peers.js' */

// TODO: Add "state" tracking and emitting to incoming/outgoing shares

/**
 * @typedef {object} IncomingShare
 * @property {Buffer} shareId Unique share ID for the invite
 * @property {string} deviceId Who sent the invite
 * @property {MapShareBase} info Original request parameters
 */

/**
 * @typedef {object} OutgoingShare
 * @property {Buffer} shareId Unique share ID for the invite
 * @property {string} deviceId Who we sent the invite to
 */

/**
 * @typedef {Object} MapShareBase
 * @property {string} senderDeviceId - The ID of the device that sent the map share.
 * @property {string} senderDeviceName - The name of the device that sent the map share.
 * @property {string} mapName - The name of the map being shared.
 * @property {string} mapId - The ID of the map being shared.
 * @property {number} receivedAt - The timestamp when the map share invite was received.
 * @property {[number, number, number, number]} bounds - The bounding box of the map data being shared.
 * @property {number} minzoom - The minimum zoom level of the map data being shared.
 * @property {number} maxzoom - The maximum zoom level of the map data being shared.
 * @property {number} estimatedSizeBytes - Estimated size of the map data being shared in bytes.
 */

/**
 * @typedef {object} MapShareEvents
 * @property {(shareId: string) => void} share-accept Emitted when recipient accepts our share request
 * @property {(shareId: string, reason: "USER_REJECTED"|"DISK_SPACE"|"ALREADY"|"UNRECOGNIZED") => void} share-reject Emitted when recipient denies our share request
 * @property {(shareId: string, shareInfo: MapShareBase) => void} share-request Emitted when a new share request is recieved
 */

/** @extends {TypedEmitter<MapShareEvents>} */
export class MapShareAPI extends TypedEmitter {
  #localPeers
  /** @type {Map<string, IncomingShare>} */
  #incomingInvites = new Map()
  #outgoingInvites = new Map()
  /**
   *
   * @param {object} options
   * @param {LocalPeers} options.localPeers
   */
  constructor({ localPeers }) {
    super()
    this.#localPeers = localPeers

    // TODO: Catch errors and log them
    this.#localPeers.on('map-share-request', (deviceId, request) =>
      this.#handleRequest(deviceId, request)
    )
    this.#localPeers.on('map-share-cancel', (deviceId, { shareId }) =>
      this.#handleCancel(deviceId, shareId)
    )
    this.#localPeers.on('map-share-response', (deviceId, response) =>
      this.#handleResponse(deviceId, response)
    )
    this.#localPeers.on('map-share-url', (deviceId, urlInfo) =>
      this.#handleURL(deviceId, urlInfo)
    )
  }

  /**
   *
   * @param {string} incomingDeviceId
   * @param {MapShareURL} urlInfo
   */
  async #handleURL(incomingDeviceId, { shareId, url }) {
    const shareIdString = shareId.toString('hex')
    const { deviceId } = this.#incomingShareFromString(shareIdString)
    assert.equal(incomingDeviceId, deviceId)
    console.log('Start downloading from URL', url)
  }
  /**
   *
   * @param {string} incomingDeviceId
   * @param {MapShareResponse} response
   */
  async #handleResponse(incomingDeviceId, { shareId, reason }) {
    const shareIdString = shareId.toString('hex')
    const { deviceId } = this.#outgoingShareFromString(shareIdString)
    assert.equal(incomingDeviceId, deviceId)
    if (reason === 'ACCEPT') {
      this.emit('share-accept', shareIdString)
      // TODO: Start server and send share URL
    } else {
      this.emit('share-reject', shareIdString, reason)
      this.#outgoingInvites.delete(shareIdString)
    }
  }

  /**
   *
   * @param {string} incomingDeviceId
   * @param {Buffer} shareId
   */
  async #handleCancel(incomingDeviceId, shareId) {
    const shareIdString = shareId.toString('hex')
    try {
      const { deviceId } = this.#outgoingShareFromString(shareIdString)
      assert.equal(incomingDeviceId, deviceId)
      await this.#closeOutgoingShareResources(shareId)
      this.#outgoingInvites.delete(shareIdString)
    } catch {
      // TODO: Handle just the not found error
      const { deviceId } = this.#incomingShareFromString(shareIdString)
      assert.equal(incomingDeviceId, deviceId)
      await this.#closeIncomingShareResources(shareId)
      this.#outgoingInvites.delete(shareId)
    }
  }

  /**
   * @param {string} deviceId
   * @param {MapShareRequest} request
   */
  async #handleRequest(deviceId, request) {
    const { shareId, ...requestMapInfo } = request

    const receivedAt = Date.now()
    const shareIdString = shareId.toString()

    // TODO: Check other values for making sense
    // TODO: Standardize error and respond
    if (requestMapInfo.bounds.length !== 4) {
      throw new Error('Bounds must have 4 values')
    }

    /**
     * @type {MapShareBase}
     */
    // @ts-ignore Bounds check is being performed above
    const info = {
      ...requestMapInfo,
      senderDeviceId: deviceId,
      senderDeviceName: 'TODO',
      receivedAt,
    }

    const incomingShare = {
      deviceId,
      shareId,
      info,
    }

    // TODO: Check existing
    // TODO: Check available disk space
    this.#incomingInvites.set(shareIdString, incomingShare)
    this.emit('share-request', shareIdString, info)
  }

  /**
   *
   * @param {string} deviceId
   * @param {object} [opts]
   * @param {Buffer} [opts.__testOnlyShareId] Hard-code the share ID. Only for tests.
   * @returns {Promise<string>}
   */
  async requestShareWith(deviceId, { __testOnlyShareId } = {}) {
    const shareId = __testOnlyShareId || crypto.randomBytes(32)

    const request = {
      shareId,
      ...this.#getMapShareBase(),
    }

    const shareIdString = shareId.toString('hex')

    this.#outgoingInvites.set(shareIdString, {
      shareId,
      deviceId,
    })

    await this.#localPeers.sendMapShareRequest(deviceId, request)

    return shareIdString
  }

  /**
   * Accept an incoming map share
   * @param {string} shareIdString
   */
  async accept(shareIdString) {
    // TODO: Check invite state
    const { shareId, deviceId } = this.#incomingShareFromString(shareIdString)
    await this.#localPeers.sendMapShareResponse(deviceId, {
      shareId,
      reason: 'ACCEPT',
    })

    // TODO: Initialize share and emit progress events
  }

  /**
   *
   * @param {string} shareIdString
   * @param {"USER_REJECTED"|"DISK_SPACE"} [reason="USER_REJECTED"]
   */
  async reject(shareIdString, reason = 'USER_REJECTED') {
    // TODO: Check invite state
    const { shareId, deviceId } = this.#incomingShareFromString(shareIdString)
    await this.#localPeers.sendMapShareResponse(deviceId, {
      shareId,
      reason,
    })
  }

  /**
   * @param {string} shareIdString
   */
  async cancel(shareIdString) {
    try {
      const { shareId, deviceId } = this.#outgoingShareFromString(shareIdString)
      await this.#localPeers.sendMapShareCancel(deviceId, {
        shareId,
      })
      await this.#closeOutgoingShareResources(shareId)
    } catch {
      // TODO: Handle just the not found error
      const { shareId, deviceId } = this.#incomingShareFromString(shareIdString)
      await this.#localPeers.sendMapShareCancel(deviceId, {
        shareId,
      })
      await this.#closeIncomingShareResources(shareId)
    }
  }

  /**
   * @param {Buffer} shareId
   */
  async #closeOutgoingShareResources(shareId) {
    // TODO: Close server connections
    console.log('Closing!', shareId)
  }

  /**
   * @param {Buffer} shareId
   */
  async #closeIncomingShareResources(shareId) {
    // TODO: Close client connections
    console.log('Closing!', shareId)
  }

  /**
   *
   * @param {string} shareIdString
   * @returns {IncomingShare}
   */
  #incomingShareFromString(shareIdString) {
    const share = this.#incomingInvites.get(shareIdString)

    // TODO: Standardize error
    if (!share) throw new Error('Share not found')
    return share
  }

  /**
   * @param {string} shareIdString
   * @returns {OutgoingShare}
   */
  #outgoingShareFromString(shareIdString) {
    const share = this.#outgoingInvites.get(shareIdString)

    // TODO: Standardize error
    if (!share) throw new Error('Share not found')
    return share
  }

  /**
   * @returns {MapShareBase}
   */
  #getMapShareBase() {
    //TODO: Get real values
    return {
      senderDeviceId: 'device-12345',
      senderDeviceName: "User's Phone",
      mapName: 'Home Town',
      mapId: 'town-map-abcde',
      receivedAt: Date.now(),
      bounds: [40.7128, -74.006, 40.7515, -73.9828],
      minzoom: 10,
      maxzoom: 20,
      estimatedSizeBytes: 5 * 1024 * 1024, // 5MB
    }
  }
}
