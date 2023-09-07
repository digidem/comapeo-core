// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'
import Protomux from 'protomux'
import { openedNoiseSecretStream, keyToId } from '../utils.js'
import cenc from 'compact-encoding'
import {
  Invite,
  InviteResponse,
  InviteResponse_Decision,
} from '../transformers/rpc.js'

const PROTOCOL_NAME = 'mapeo/rpc'

// Protomux message types depend on the order that messages are added to a
// channel (this needs to remain consistent). To avoid breaking changes, the
// types here should not change.
//
// TODO: Add @satisfies to check this matches the imports from './messages.js'
// when we switch to Typescript v5
const MESSAGE_TYPES = /** @type {const} */ ({
  Invite: 0,
  InviteResponse: 1,
})
const MESSAGES_MAX_ID = Math.max.apply(null, [...Object.values(MESSAGE_TYPES)])

/** @typedef {Peer['info']} PeerInfoInternal */
/** @typedef {Omit<PeerInfoInternal, 'status'> & { status: Exclude<PeerInfoInternal['status'], 'connecting'> }} PeerInfo */
/** @typedef {'connecting' | 'connected' | 'disconnected'} PeerState */

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
  /** @type {Map<string, Array<DeferredPromise<import('../transformers/rpc.js').IInviteResponse['decision']>>>} */
  pendingInvites = new Map()

  /**
   * @param {object} options
   * @param {Buffer} options.publicKey
   * @param {ReturnType<typeof Protomux.prototype.createChannel>} options.channel
   */
  constructor({ publicKey, channel }) {
    this.#publicKey = publicKey
    this.#channel = channel
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
  /** @param {import('../transformers/rpc.js').IInvite} invite */
  sendInvite(invite) {
    this.#assertConnected()
    const buf = Buffer.from(Invite.encode(invite).finish())
    const messageType = MESSAGE_TYPES.Invite
    this.#channel.messages[messageType].send(buf)
  }
  /** @param {import('../transformers/rpc.js').IInviteResponse} response */
  sendInviteResponse(response) {
    this.#assertConnected()
    const buf = Buffer.from(InviteResponse.encode(response).finish())
    const messageType = MESSAGE_TYPES.InviteResponse
    this.#channel.messages[messageType].send(buf)
  }
  #assertConnected() {
    if (this.#state === 'connected' && !this.#channel.closed) return
    /* c8 ignore next */
    throw new PeerDisconnectedError() // TODO: report error - this should not happen
  }
}

/**
 * @typedef {object} MapeoRPCEvents
 * @property {(peers: PeerInfo[]) => void} peers Emitted whenever the connection status of peers changes. An array of peerInfo objects with a peer id and the peer connection status
 * @property {(peerId: string, invite: import('../transformers/rpc.js').IInvite) => void} invite Emitted when an invite is received
 */

/** @extends {TypedEmitter<MapeoRPCEvents>} */
export class MapeoRPC extends TypedEmitter {
  /** @type {Map<string, Peer>} */
  #peers = new Map()

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
   * @param {import('../transformers/rpc.js').IInvite['projectKey']} options.projectKey project key
   * @param {import('../transformers/rpc.js').IInvite['encryptionKeys']} options.encryptionKeys project encryption keys
   * @param {import('../transformers/rpc.js').IInvite['projectInfo']} [options.projectInfo] project info - currently name
   * @param {number} [options.timeout] timeout waiting for invite response before rejecting (default 1 minute)
   * @returns {Promise<import('../transformers/rpc.js').InviteResponse['decision']>}
   */
  async invite(peerId, { timeout, ...invite }) {
    const peer = this.#peers.get(peerId)
    if (!peer) throw new UnknownPeerError('Unknown peer ' + peerId)
    /** @type {Promise<import('../transformers/rpc.js').InviteResponse['decision']>} */
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

      peer.sendInvite(invite)

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
   * @param {import('../transformers/rpc.js').IInviteResponse['projectKey']} options.projectKey project key of the invite you are responding to
   * @param {import('../transformers/rpc.js').IInviteResponse['decision']} options.decision response to invite, one of "ACCEPT", "REJECT", or "ALREADY" (already on project)
   */
  inviteResponse(peerId, options) {
    const peer = this.#peers.get(peerId)
    if (!peer) throw new UnknownPeerError('Unknown peer ' + peerId)
    peer.sendInviteResponse(options)
  }

  /**
   * Connect to a peer over an existing NoiseSecretStream
   *
   * @param {import('../types.js').NoiseStream | import('../types.js').ProtocolStream} stream a NoiseSecretStream from @hyperswarm/secret-stream
   */
  connect(stream) {
    if (!stream.noiseStream) throw new Error('Invalid stream')
    const protomux =
      stream.userData && Protomux.isProtomux(stream.userData)
        ? stream.userData
        : Protomux.from(stream)

    // noiseSecretStream.remotePublicKey can be null before the stream has
    // opened, so this helped awaits the open
    openedNoiseSecretStream(stream).then((stream) => {
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
      /* c8 ignore next 2 */
      default:
      // TODO: report unhandled message error
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
