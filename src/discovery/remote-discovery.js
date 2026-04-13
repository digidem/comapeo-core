import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger.js'
import Hyperswarm from 'hyperswarm'
import { pEvent } from 'p-event'
import sodium from 'sodium-universal'
import b4a from 'b4a'
import { SwarmHandshake } from '../generated/handshake.js'
import {
  ensureKnownError,
  InvalidIdentityProofError,
  UnableToReadHandshakeError,
} from '../errors.js'

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
   * Connect to another peer by their NOISE public key
   * @param {string} publicKey
   * @param {object} [opts]
   * @param {number} [opts.timeout]
   */
  async connectPeer(publicKey, { timeout = 60_000 } = {}) {
    const swarm = await this.#ensureSwarm()
    const noisePublicKey = Buffer.from(publicKey, 'hex')

    this.#shouldTrustKeys.add(publicKey)

    const onConnected = pEvent(this, 'connection', {
      filter: (connection) => connection.remotePublicKey.equals(noisePublicKey),
      timeout,
    })
    // Start trying to connect
    swarm.joinPeer(noisePublicKey)
    this.#l.log('Connecting to %S', publicKey)

    const socket = await onConnected

    this.#shouldTrustKeys.delete(publicKey)

    return socket
  }

  /**
   * @param {OpenedNoiseStream} socket
   */
  async #handleHyperswarmConnection(socket) {
    try {
      const remotePublicKeyString = socket.remotePublicKey.toString('hex')
      // @ts-ignore
      socket.isTrusted = this.#shouldTrustKeys.has(remotePublicKeyString)

      const firstData = readChunk(socket)
      const keyPair = this.#identityKeypair
      // Sign the Noise handshake hash with our stable key
      const sig = b4a.allocUnsafe(64)
      sodium.crypto_sign_detached(sig, socket.handshakeHash, keyPair.secretKey)

      // Send stable public key + proof in a single message
      const handshakeBuffer = SwarmHandshake.encode({
        publicKey: keyPair.publicKey,
        signature: Buffer.from(sig),
      }).finish()

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
      console.log({ err })
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
