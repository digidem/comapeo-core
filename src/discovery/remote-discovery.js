import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger.js'
import Hyperswarm from 'hyperswarm'
import { pEvent, TimeoutError as EventTimeoutError } from 'p-event'
import sodium from 'sodium-universal'
import b4a from 'b4a'
import { SwarmHandshake } from '../generated/handshake.js'
import {
  ensureKnownError,
  InvalidIdentityProofError,
  TimeoutError,
  UnableToReadHandshakeError,
} from '../errors.js'

import { openedNoiseSecretStream } from '../lib/noise-secret-stream-helpers.js'

/** @import {OpenedNoiseStream} from '../lib/noise-secret-stream-helpers.js' */
/** @import {Duplex, Readable} from "streamx" */

/** @typedef {OpenedNoiseStream & {handshakePublicKey:Buffer, isTrusted: boolean}} RemoteAuthedNoiseStream */

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: RemoteAuthedNoiseStream) => void} connection
 * @property {(error: Error) => void} error
 */

// Symbol for test-only access to internal methods
export const kTestOnlyHandleHyperswarmConnection = Symbol(
  'testOnlyHandleHyperswarmConnection'
)

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class RemoteDiscovery extends TypedEmitter {
  #l
  /** @type {Hyperswarm?} */
  #swarm = null
  /** @type {Promise<Hyperswarm>?} */
  #loading = null
  #identityKeypair
  #swarmIdentityKeypair
  /** @type {Set<string>} */
  #shouldTrustKeys = new Set()
  /** @type {Set<OpenedNoiseStream|RemoteAuthedNoiseStream>} */
  #connections = new Set()

  /**
   * @param {Object} opts
   * @param {import('./local-discovery.js').Keypair} opts.identityKeypair
   * @param {import('./local-discovery.js').Keypair} opts.swarmIdentityKeypair
   * @param {Logger} [opts.logger]
   */
  constructor({ identityKeypair, swarmIdentityKeypair, logger }) {
    super()
    this.#l = Logger.create('RemoteDiscovery', logger)
    this.#identityKeypair = identityKeypair
    this.#swarmIdentityKeypair = swarmIdentityKeypair
  }

  async #initSwarm() {
    this.#l.log('Initializing swarm')

    const swarm = new Hyperswarm({
      keyPair: this.#swarmIdentityKeypair,
      maxPeers: 4,
    })
    // @ts-expect-error Hyperswarm lacks the expected utility class to mark the stream as opened
    swarm.on('connection', this.#handleHyperswarmConnection.bind(this))
    this.#l.log('Starting listen')
    await swarm.listen()
    this.#l.log('Listening')
    return swarm
  }

  /**
   * @returns {Promise<Hyperswarm>}
   */
  async #ensureSwarm() {
    await this.#loading
    if (!this.#swarm) {
      this.#loading = this.#initSwarm()
      this.#swarm = await this.#loading
    }
    return this.#swarm
  }

  /**
   * Start listening for incoming connections
   */
  async start() {
    // TODO: Use start stop state machine
    const swarm = await this.#ensureSwarm()
    await swarm.resume()
  }
  /**
   * Close all connections and stop listening
   */
  async stop() {
    await this.#loading
    await this.#swarm?.suspend()
  }

  async close() {
    await this.#loading
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
        ('handshakePublicKey' in connection &&
          connection.handshakePublicKey.equals(noisePublicKey))
      ) {
        this.#l.log('Disconnecting from peer %S', publicKey)
        connection.end()
        break
      }
    }
    // TODO: Error on unknown peer?
  }

  /**
   * Connect to another peer by their NOISE public key
   * @param {string} publicKey
   * @param {object} [opts]
   * @param {number} [opts.timeout]
   * @returns {Promise<RemoteAuthedNoiseStream>}
   */
  async connectPeer(publicKey, { timeout = 60_000 } = {}) {
    const swarm = await this.#ensureSwarm()
    const noisePublicKey = Buffer.from(publicKey, 'hex')

    for (const existingConnection of this.#connections) {
      if (existingConnection.remotePublicKey?.equals(noisePublicKey)) {
        const opened = await openedNoiseSecretStream(existingConnection)
        if (opened.destroyed) break
        // @ts-ignore Some connections might not be handshaked, wait for them to be
        if (!existingConnection.handshakePublicKey) break
        // @ts-ignore
        return opened
      }
    }

    this.#shouldTrustKeys.add(publicKey)

    const onConnected = pEvent(this, 'connection', {
      filter: (connection) => connection.remotePublicKey.equals(noisePublicKey),
      timeout,
    })
    // Start trying to connect
    swarm.joinPeer(noisePublicKey)
    this.#l.log('Connecting to %S', publicKey)
    try {
      const socket = await onConnected

      return socket
    } catch (e) {
      if (e instanceof EventTimeoutError) {
        throw new TimeoutError('Timed out waiting for peer')
      }
      throw e
    } finally {
      this.#shouldTrustKeys.delete(publicKey)
    }
  }

  /**
   * @param {OpenedNoiseStream} socket
   */
  async #handleHyperswarmConnection(socket) {
    this.#connections.add(socket)
    socket.once('close', () => this.#connections.delete(socket))
    try {
      const remotePublicKeyString = socket.remotePublicKey.toString('hex')
      // @ts-ignore
      socket.isTrusted = this.#shouldTrustKeys.has(remotePublicKeyString)

      const firstData = readChunk(socket)
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

      // @ts-ignore
      socket.handshakePublicKey = msg.publicKey
      // @ts-ignore
      this.emit('connection', socket)
    } catch (err) {
      this.emit('error', ensureKnownError(err))
    }
  }
}

/**
 *
 * @param {Readable|Duplex} stream
 * @returns {Promise<Buffer>}
 */
export async function readChunk(stream) {
  let data = stream.read()

  if (data) return data

  try {
    await pEvent(stream, 'readable', {
      timeout: 10_00,
      rejectionEvents: ['error', 'close'],
    })
  } catch {
    throw new UnableToReadHandshakeError()
  }

  stream.pause()

  data = stream.read()

  if (data) return data

  throw new UnableToReadHandshakeError()
}

/**
 *
 * @param {Buffer|null} handshakeHash
 * @param {import('../types.js').KeyPair} keyPair
 * @returns
 */
export function makeSwarmHandshake(handshakeHash, keyPair) {
  const sig = b4a.allocUnsafe(64)
  sodium.crypto_sign_detached(sig, handshakeHash, keyPair.secretKey)

  // Send stable public key + proof in a single message
  const handshakeBuffer = SwarmHandshake.encode({
    publicKey: keyPair.publicKey,
    signature: Buffer.from(sig),
  }).finish()
  return handshakeBuffer
}
