import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger.js'
import Hyperswarm from 'hyperswarm'
import StartStopStateMachine from 'start-stop-state-machine'
import { pEvent, TimeoutError as EventTimeoutError } from 'p-event'
import sodium from 'sodium-universal'
import { SwarmHandshake } from '../generated/handshake.js'
import {
  ensureKnownError,
  HandshakeTooLargeError,
  InvalidIdentityProofError,
  TimeoutError,
  UnableToReadHandshakeError,
} from '../errors.js'

import { openedNoiseSecretStream } from '../lib/noise-secret-stream-helpers.js'
import pDefer from 'p-defer'

/** @import {OpenedNoiseStream, AuthedNoiseStream} from '../lib/noise-secret-stream-helpers.js' */
/** @import {Keypair} from './local-discovery.js' */
/** @import {Duplex, Readable} from "streamx" */

// Re-export for consumers that import from this module
/** @typedef {AuthedNoiseStream} RemoteAuthedNoiseStream */

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: RemoteAuthedNoiseStream) => void} connection
 * @property {(error: Error) => void} error
 */

// Symbol for test-only access to internal methods
export const kTestOnlyHandleHyperswarmConnection = Symbol(
  'testOnlyHandleHyperswarmConnection'
)

// 2 bytes 16bit unsigned int
export const LENGTH_BYTES_LENGTH = 2

// Max payload size: total packet (prefix + body) capped at UInt16 max, minus the 2-byte prefix itself
const MAX_HANDSHAKE_SIZE = 0xffff - 2

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class RemoteDiscovery extends TypedEmitter {
  #l
  /** @type {Hyperswarm?} */
  #swarm = null
  #sm
  #identityKeypair
  #deriveSwarmIdentityKeypair
  /** @type {Keypair?} */
  #lastKeyPair = null
  #swarmOpts
  /** @type {Set<string>} */
  #shouldTrustKeys = new Set()
  /** @type {Set<OpenedNoiseStream|AuthedNoiseStream>} */
  #connections = new Set()
  /** @type {Map<OpenedNoiseStream, Promise<boolean>>} */
  #pendingHandshakes = new Map()

  /**
   * @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   * @param {() => Keypair} opts.deriveSwarmIdentityKeypair
   * @param {Logger} [opts.logger]
   * @param {object} [opts.swarm] - Optional Hyperswarm constructor overrides (e.g. { dht })
   */
  constructor({
    identityKeypair,
    deriveSwarmIdentityKeypair,
    logger,
    swarm: swarmOpts,
  }) {
    super()
    this.#l = Logger.create('RemoteDiscovery', logger)
    this.#identityKeypair = identityKeypair
    this.#deriveSwarmIdentityKeypair = deriveSwarmIdentityKeypair
    this.#swarmOpts = swarmOpts
    this.#sm = new StartStopStateMachine({
      start: this.#start.bind(this),
      stop: this.#stop.bind(this),
    })
  }

  async #start() {
    const keyPair = this.#deriveSwarmIdentityKeypair()
    if (this.#swarm) {
      if (
        !this.#lastKeyPair ||
        this.#lastKeyPair.publicKey.equals(keyPair.publicKey)
      ) {
        this.#l.log('Resuming swarm')
        await this.#swarm.resume()
        return
      } else {
        this.#l.log('Swarm key changed, destroying old swarm')
        await this.#swarm.destroy()
      }
    }
    this.#l.log('Initializing swarm')
    this.#lastKeyPair = keyPair
    const swarm = new Hyperswarm({
      keyPair,
      maxPeers: 16,
      ...this.#swarmOpts,
    })
    // @ts-expect-error Hyperswarm lacks the expected utility class to mark the stream as opened
    swarm.on('connection', this.#handleHyperswarmConnection.bind(this))
    this.#l.log('Starting listen')
    await swarm.listen()
    this.#l.log('Listening')
    await swarm.resume()
    this.#swarm = swarm
  }

  /**
   * Start listening for incoming connections
   */
  async start() {
    return this.#sm.start()
  }

  /**
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] Force-close open connections
   * @returns {Promise<void>}
   */
  async stop(opts) {
    return this.#sm.stop(opts)
  }

  /**
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] Force-close open connections
   */
  async #stop(opts) {
    this.#l.log('Suspending swarm')
    await this.#swarm?.suspend()
    if (opts?.force && this.#connections.size) {
      this.#l.log('Force closing existing connections')
      for (const connection of this.#connections) {
        connection.end()
      }
    }
  }

  async close() {
    await this.#swarm?.destroy()
    this.#l.log('Closed swarm')
  }

  /**
   * @param {OpenedNoiseStream} socket
   */
  async [kTestOnlyHandleHyperswarmConnection](socket) {
    return this.#handleHyperswarmConnection(socket)
  }

  /**
   * Disconnect from a peer by their NOISE public key
   * @param {string} publicKey
   */
  async disconnectPeer(publicKey) {
    const noisePublicKey = Buffer.from(publicKey, 'hex')

    for (const connection of this.#connections) {
      if (
        connection.remotePublicKey?.equals(noisePublicKey) ||
        ('authenticatedPublicKey' in connection &&
          connection.authenticatedPublicKey.equals(noisePublicKey))
      ) {
        this.#l.log('Disconnecting from peer %S', publicKey)
        connection.end()
        await pEvent(connection, 'close')
        return
      }
    }
    // TODO: Error on unknown peer?
    this.#l.log(
      'Error: Cannot disconnect from peer %S, not connected',
      publicKey
    )
  }

  /**
   * @param {Buffer} noisePublicKey
   * @returns {Promise<RemoteAuthedNoiseStream | null >}
   */
  async #findExistingPeer(noisePublicKey) {
    for (const existingConnection of this.#connections) {
      if (!existingConnection.remotePublicKey?.equals(noisePublicKey)) continue
      const opened = await openedNoiseSecretStream(existingConnection)
      // If the connection closed, try again
      if (opened.destroyed) return this.#findExistingPeer(noisePublicKey)
      // @ts-ignore Some connections might not be handshaked, wait for them to be
      if (!existingConnection.authenticatedPublicKey) {
        const success = await this.#pendingHandshakes.get(existingConnection)
        if (!success) return this.#findExistingPeer(noisePublicKey)
      }
      // @ts-ignore
      return opened
    }

    return null
  }

  /**
   * Connect to another peer by their NOISE public key
   * @param {string} publicKey
   * @param {object} [opts]
   * @param {number} [opts.timeout]
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<RemoteAuthedNoiseStream>}
   */
  async connectPeer(publicKey, { timeout = 60_000, signal } = {}) {
    await this.#sm.start()
    const swarm = this.#swarm
    if (!swarm) throw new Error('Swarm not initialized')
    const noisePublicKey = Buffer.from(publicKey, 'hex')

    const existing = await this.#findExistingPeer(noisePublicKey)
    if (existing) return existing

    const onAbort = () => {
      this.#l.log('Leave peer for %s', publicKey)
      swarm.leavePeer(noisePublicKey)
    }

    this.#shouldTrustKeys.add(publicKey)

    const onConnected = pEvent(this, 'connection', {
      filter: (connection) => connection.remotePublicKey.equals(noisePublicKey),
      timeout,
      signal,
    })

    // Start trying to connect
    swarm.joinPeer(noisePublicKey)
    this.#l.log('Connecting to %S', publicKey)
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const socket = await onConnected

      return socket
    } catch (e) {
      // We should stop trying to connect if we time out
      swarm.leavePeer(noisePublicKey)
      if (e instanceof EventTimeoutError) {
        throw new TimeoutError('Timed out waiting for peer')
      }
      throw e
    } finally {
      signal?.removeEventListener('abort', onAbort)
      this.#shouldTrustKeys.delete(publicKey)
    }
  }

  /**
   * @param {OpenedNoiseStream} socket
   */
  async #handleHyperswarmConnection(socket) {
    this.#connections.add(socket)
    const pendingDefer = pDefer()
    this.#pendingHandshakes.set(socket, pendingDefer.promise)
    socket.once('close', () => this.#connections.delete(socket))
    try {
      const remotePublicKeyString = socket.remotePublicKey.toString('hex')
      // @ts-ignore
      socket.isTrusted = this.#shouldTrustKeys.has(remotePublicKeyString)

      const firstData = readHandshakeBuffer(socket)
      const keyPair = this.#identityKeypair
      // Sign the Noise handshake hash with our stable key
      const handshakeBuffer = makeSwarmHandshake(socket.handshakeHash, keyPair)

      const hasDrained = socket.write(Buffer.from(handshakeBuffer))

      if (!hasDrained) await pEvent(socket, 'drain', { timeout: 10000 })

      const data = await firstData

      const msg = SwarmHandshake.decode(data)

      try {
        const valid = sodium.crypto_sign_verify_detached(
          msg.signature,
          socket.handshakeHash, // same hash on both sides
          msg.publicKey
        )

        if (!valid) {
          throw new InvalidIdentityProofError()
        }
      } catch (e) {
        if (e instanceof InvalidIdentityProofError) throw e
        throw new InvalidIdentityProofError({ cause: e })
      }

      // @ts-expect-error adding AuthedNoiseStream properties
      socket.authenticatedPublicKey = msg.publicKey
      this.emit('connection', /** @type {AuthedNoiseStream} */ (socket))
      this.#pendingHandshakes.delete(socket)
      pendingDefer.resolve(true)
    } catch (err) {
      socket.end()
      this.emit('error', ensureKnownError(err))
      pendingDefer.resolve(false)
    }
  }
}

/**
 *
 * @param {Readable|Duplex} stream
 * @param {number} length
 * @returns {Promise<Uint8Array>}
 */
async function readChunk(stream, length) {
  let data = stream.read()

  if (!data) {
    try {
      await pEvent(stream, 'readable', {
        timeout: 10_000,
        rejectionEvents: ['error', 'close'],
      })
      data = stream.read()
    } catch {
      throw new UnableToReadHandshakeError()
    }
  }

  stream.pause()

  if (!data) {
    // This should never happen
    throw new UnableToReadHandshakeError()
  }

  if (data.length === length) return data

  if (data.length > length) {
    const slice = data.subarray(0, length)
    const remainder = data.subarray(length)
    stream.unshift(remainder)
    return slice
  }

  const remainingBytes = length - data.length
  const remainingData = await readChunk(stream, remainingBytes)
  const result = new Uint8Array(length)
  result.set(data, 0)
  result.set(remainingData, data.length)
  return result
}

/**
 *
 * @param {Readable|Duplex} stream
 * @returns {Promise<Buffer>}
 */
export async function readHandshakeBuffer(stream) {
  const handshakeLengthBytes = await readChunk(stream, LENGTH_BYTES_LENGTH)

  const handshakeLength = new DataView(
    handshakeLengthBytes.buffer,
    handshakeLengthBytes.byteOffset
  ).getUint16(0, true)

  if (handshakeLength > MAX_HANDSHAKE_SIZE) {
    throw new HandshakeTooLargeError()
  }

  const data = await readChunk(stream, handshakeLength)

  return Buffer.from(data)
}

/**
 *
 * @param {Buffer|null} handshakeHash
 * @param {import('../types.js').KeyPair} keyPair
 * @returns
 */
export function makeSwarmHandshake(handshakeHash, keyPair) {
  const sig = new Uint8Array(64)
  sodium.crypto_sign_detached(sig, handshakeHash, keyPair.secretKey)

  // Send stable public key + proof in a single message
  const handshakeBuffer = SwarmHandshake.encode({
    publicKey: keyPair.publicKey,
    signature: Buffer.from(sig),
  }).finish()

  return lengthPrefix(handshakeBuffer)
}

/**
 * Convert a buffer to its length prefixed version using UInt16LE
 * @param {Uint8Array} buffer
 * @return
 */
export function lengthPrefix(buffer) {
  const fullBuffer = new Uint8Array(buffer.length + LENGTH_BYTES_LENGTH)

  new DataView(fullBuffer.buffer, fullBuffer.byteOffset).setUint16(
    0,
    buffer.length,
    true
  )

  fullBuffer.set(buffer, LENGTH_BYTES_LENGTH)

  return fullBuffer
}
