// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import Protomux from 'protomux'
import { openedNoiseSecretStream, keyToId } from '../utils.js'
import cenc from 'compact-encoding'
import {
  DeviceInfo,
  Invite,
  InviteResponse,
  InviteResponse_Decision,
} from '../generated/rpc.js'
import pDefer from 'p-defer'

const PROTOCOL_NAME = 'mapeo/rpc'

// Protomux message types depend on the order that messages are added to a
// channel (this needs to remain consistent). To avoid breaking changes, the
// types here should not change.
/** @satisfies {{ [k in keyof typeof import('../generated/rpc.js')]?: number }} */
const MESSAGE_TYPES = {
  Invite: 0,
  InviteResponse: 1,
  DeviceInfo: 2,
}
const MESSAGES_MAX_ID = Math.max.apply(null, [...Object.values(MESSAGE_TYPES)])

/** @typedef {Peer['info']} PeerInfoInternal */
/** @typedef {Omit<PeerInfoInternal, 'status'> & { status: Exclude<PeerInfoInternal['status'], 'connecting'> }} PeerInfo */
/** @typedef {'connecting' | 'connected' | 'disconnected'} PeerState */
/** @typedef {import('type-fest').SetNonNullable<import('../generated/rpc.js').Invite, 'encryptionKeys'>} InviteWithKeys */

/**
 * @template ValueType
 * @typedef {object} DeferredPromise
 * @property {(value?: ValueType | PromiseLike<ValueType>) => void} resolve
 * @property {(reason?: unknown) => void} reject
 */

class Peer {
  /** @type {PeerState} */
  #state = 'connecting'
  #publicKey
  #channel
  #connected
  /** @type {Map<string, Array<DeferredPromise<InviteResponse['decision']>>>} */
  pendingInvites = new Map()

  /**
   * @param {object} options
   * @param {Buffer} options.publicKey
   * @param {ReturnType<typeof Protomux.prototype.createChannel>} options.channel
   */
  constructor({ publicKey, channel }) {
    this.#publicKey = publicKey
    this.#channel = channel
    this.#connected = pDefer()
  }
  get info() {
    return {
      status: this.#state,
      id: keyToId(this.#publicKey),
    }
  }
  /**
   * Poor-man's finite state machine. Rather than a `setState` method, only
   * allows specific transitions between states.
   *
   * @param {'connect' | 'disconnect'} type
   */
  action(type) {
    switch (type) {
      case 'connect':
        /* c8 ignore next 3 */
        if (this.#state !== 'connecting') {
          return // TODO: report error - this should not happen
        }
        this.#state = 'connected'
        this.#connected.resolve()
        break
      case 'disconnect':
        /* c8 ignore next */
        if (this.#state === 'disconnected') return
        this.#state = 'disconnected'
        for (const pending of this.pendingInvites.values()) {
          for (const { reject } of pending) {
            reject(new PeerDisconnectedError())
          }
        }
        this.pendingInvites.clear()
        break
    }
  }
  /** @param {InviteWithKeys} invite */
  async sendInvite(invite) {
    await this.#assertConnected()
    const buf = Buffer.from(Invite.encode(invite).finish())
    const messageType = MESSAGE_TYPES.Invite
    this.#channel.messages[messageType].send(buf)
  }
  /** @param {InviteResponse} response */
  async sendInviteResponse(response) {
    await this.#assertConnected()
    const buf = Buffer.from(InviteResponse.encode(response).finish())
    const messageType = MESSAGE_TYPES.InviteResponse
    this.#channel.messages[messageType].send(buf)
  }
  /** @param {DeviceInfo} deviceInfo */
  async sendDeviceInfo(deviceInfo) {
    await this.#assertConnected()
    const buf = Buffer.from(DeviceInfo.encode(deviceInfo).finish())
    const messageType = MESSAGE_TYPES.DeviceInfo
    this.#channel.messages[messageType].send(buf)
  }
  async #assertConnected() {
    await this.#connected.promise
    if (this.#state === 'connected' && !this.#channel.closed) return
    /* c8 ignore next */
    throw new PeerDisconnectedError() // TODO: report error - this should not happen
  }
}

/**
 * @typedef {object} MapeoRPCEvents
 * @property {(peers: PeerInfo[]) => void} peers Emitted whenever the connection status of peers changes. An array of peerInfo objects with a peer id and the peer connection status
 * @property {(peerId: string, invite: InviteWithKeys) => void} invite Emitted when an invite is received
 * @property {(deviceInfo: DeviceInfo & { deviceId: string }) => void} device-info Emitted when we receive device info for a device
 */

/** @extends {TypedEmitter<MapeoRPCEvents>} */
export class LocalPeers extends TypedEmitter {
  /** @type {Map<string, Peer>} */
  #peers = new Map()
  /** @type {Set<Promise<any>>} */
  #opening = new Set()

  constructor() {
    super()
  }

  static InviteResponse = InviteResponse_Decision

  /**
   * Invite a peer to a project. Resolves with the response from the invitee:
   * one of "ACCEPT", "REJECT", or "ALREADY" (already on project)
   *
   * @param {string} peerId
   * @param {object} options
   * @param {InviteWithKeys['projectKey']} options.projectKey project key
   * @param {InviteWithKeys['encryptionKeys']} options.encryptionKeys project encryption key
   * @param {InviteWithKeys['projectInfo']} [options.projectInfo] project info - currently name
   * @param {number} [options.timeout] timeout waiting for invite response before rejecting (default 1 minute)
   * @returns {Promise<InviteResponse['decision']>}
   */
  async invite(peerId, { timeout, ...invite }) {
    await Promise.all(this.#opening)
    const peer = this.#peers.get(peerId)
    if (!peer) console.log([...this.#peers.keys()])
    if (!peer) throw new UnknownPeerError('Unknown peer ' + peerId)
    /** @type {Promise<InviteResponse['decision']>} */
    return new Promise((origResolve, origReject) => {
      const projectId = keyToId(invite.projectKey)

      const pending = peer.pendingInvites.get(projectId) || []
      peer.pendingInvites.set(projectId, pending)

      const deferred = { resolve, reject }
      pending.push(deferred)

      const timeoutId =
        timeout &&
        setTimeout(() => {
          const index = pending.indexOf(deferred)
          if (index > -1) {
            pending.splice(index, 1)
          }
          origReject(new TimeoutError(`No response after ${timeout}ms`))
        }, timeout)

      peer.sendInvite(invite).catch(origReject)

      /** @type {typeof origResolve} */
      function resolve(value) {
        clearTimeout(timeoutId)
        origResolve(value)
      }
      /** @type {typeof origReject} */
      function reject(reason) {
        clearTimeout(timeoutId)
        origReject(reason)
      }
    })
  }

  /**
   * Respond to an invite from a peer
   *
   * @param {string} peerId id of the peer you want to respond to (publicKey of peer as hex string)
   * @param {object} options
   * @param {InviteResponse['projectKey']} options.projectKey project key of the invite you are responding to
   * @param {InviteResponse['decision']} options.decision response to invite, one of "ACCEPT", "REJECT", or "ALREADY" (already on project)
   */
  async inviteResponse(peerId, options) {
    await Promise.all(this.#opening)
    const peer = this.#peers.get(peerId)
    if (!peer) throw new UnknownPeerError('Unknown peer ' + peerId)
    await peer.sendInviteResponse(options)
  }

  /**
   *
   * @param {string} peerId id of the peer you want to send to (publicKey of peer as hex string)
   * @param {DeviceInfo} deviceInfo device info to send
   */
  async sendDeviceInfo(peerId, deviceInfo) {
    await Promise.all(this.#opening)
    const peer = this.#peers.get(peerId)
    if (!peer) throw new UnknownPeerError('Unknown peer ' + peerId)
    await peer.sendDeviceInfo(deviceInfo)
  }

  /**
   * Connect to a peer over an existing NoiseSecretStream
   *
   * @param {import('../types.js').NoiseStream<any> | import('../types.js').ProtocolStream} stream a NoiseSecretStream from @hyperswarm/secret-stream
   */
  connect(stream) {
    if (!stream.noiseStream) throw new Error('Invalid stream')
    const protomux =
      stream.userData && Protomux.isProtomux(stream.userData)
        ? stream.userData
        : Protomux.from(stream)
    this.#opening.add(stream.opened)

    // noiseSecretStream.remotePublicKey can be null before the stream has
    // opened, so this helped awaits the open
    openedNoiseSecretStream(stream).then((stream) => {
      this.#opening.delete(stream.opened)
      if (stream.destroyed) return
      const { remotePublicKey } = stream

      // This is written like this because the protomux uses the index within
      // the messages array to define the message id over the wire, so this must
      // stay consistent to avoid breaking protocol changes.
      /** @type {Parameters<typeof Protomux.prototype.createChannel>[0]['messages']} */
      const messages = new Array(MESSAGES_MAX_ID).fill(undefined)
      for (const [type, id] of Object.entries(MESSAGE_TYPES)) {
        messages[id] = {
          encoding: cenc.raw,
          onmessage: this.#handleMessage.bind(this, remotePublicKey, type),
        }
      }

      const channel = protomux.createChannel({
        userData: null,
        protocol: PROTOCOL_NAME,
        messages,
        onopen: this.#openPeer.bind(this, remotePublicKey),
        onclose: this.#closePeer.bind(this, remotePublicKey),
      })
      channel.open()

      const peerId = keyToId(remotePublicKey)
      const existingPeer = this.#peers.get(peerId)
      /* c8 ignore next 3 */
      if (existingPeer && existingPeer.info.status !== 'disconnected') {
        existingPeer.action('disconnect') // Should not happen, but in case
      }
      const peer = new Peer({ publicKey: remotePublicKey, channel })
      this.#peers.set(peerId, peer)
      // Do not emit peers now - will emit when connected
    })

    return stream
  }

  /** @param {Buffer} publicKey */
  #openPeer(publicKey) {
    const peerId = keyToId(publicKey)
    const peer = this.#peers.get(peerId)
    /* c8 ignore next */
    if (!peer) return // TODO: report error - this should not happen
    // No-op if no change in state
    /* c8 ignore next */
    if (peer.info.status === 'connected') return // TODO: report error - this should not happen
    peer.action('connect')
    this.#emitPeers()
  }

  /** @param {Buffer} publicKey */
  #closePeer(publicKey) {
    const peerId = publicKey.toString('hex')
    const peer = this.#peers.get(peerId)
    /* c8 ignore next */
    if (!peer) return // TODO: report error - this should not happen
    // No-op if no change in state
    /* c8 ignore next */
    if (peer.info.status === 'disconnected') return
    // TODO: Track reasons for closing
    peer.action('disconnect')
    this.#emitPeers()
  }

  get peers() {
    return /** @type {PeerInfo[]} */ (
      [...this.#peers.values()]
        .map((peer) => peer.info)
        // A peer is only 'connecting' for a single tick, so to avoid complex
        // async code around sending messages we don't expose 'connecting' peers
        .filter((peerInfo) => peerInfo.status !== 'connecting')
    )
  }

  #emitPeers() {
    this.emit('peers', this.peers)
  }

  /**
   *
   * @param {Buffer} peerPublicKey
   * @param {keyof typeof MESSAGE_TYPES} type
   * @param {Buffer} value
   */
  #handleMessage(peerPublicKey, type, value) {
    const peerId = keyToId(peerPublicKey)
    const peer = this.#peers.get(peerId)
    /* c8 ignore next */
    if (!peer) return // TODO: report error - this should not happen
    switch (type) {
      case 'Invite': {
        const invite = Invite.decode(value)
        assertInviteHasKeys(invite)
        this.emit('invite', peerId, invite)
        break
      }
      case 'InviteResponse': {
        const response = InviteResponse.decode(value)
        const projectId = keyToId(response.projectKey)
        const pending = peer.pendingInvites.get(projectId)
        /* c8 ignore next 3 */
        if (!pending) {
          return // TODO: report error - this should not happen
        }
        for (const deferredPromise of pending) {
          deferredPromise.resolve(response.decision)
        }
        peer.pendingInvites.set(projectId, [])
        break
      }
      case 'DeviceInfo': {
        const deviceInfo = DeviceInfo.decode(value)
        this.emit('device-info', { ...deviceInfo, deviceId: peerId })
        break
      }
      /* c8 ignore next 5 */
      default: {
        /** @type {never} */
        const _exhaustiveCheck = type
        return _exhaustiveCheck
        // TODO: report unhandled message error
      }
    }
  }
}

export class TimeoutError extends Error {
  /** @param {string} [message] */
  constructor(message) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class UnknownPeerError extends Error {
  /** @param {string} [message] */
  constructor(message) {
    super(message)
    this.name = 'UnknownPeerError'
  }
}

export class PeerDisconnectedError extends Error {
  /** @param {string} [message] */
  constructor(message) {
    super(message)
    this.name = 'PeerDisconnectedError'
  }
}

/**
 *
 * @param {Invite} invite
 * @returns {asserts invite is InviteWithKeys}
 */
function assertInviteHasKeys(invite) {
  if (!invite.encryptionKeys || !invite.encryptionKeys.auth) {
    throw new Error('Invite is missing auth core encryption key')
  }
}
