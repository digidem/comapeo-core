import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger.js'
import Hyperswarm from 'hyperswarm'
import StartStopStateMachine from 'start-stop-state-machine'
import { pEvent, TimeoutError as EventTimeoutError } from 'p-event'
import sodium from 'sodium-universal'
import Protomux from 'protomux'
import cenc from 'compact-encoding'
import pDefer from 'p-defer'
import { timeoutPromise } from '../utils.js'
import { openedNoiseSecretStream } from '../lib/noise-secret-stream-helpers.js'
import { Hello, IdentityProof } from '../generated/auth.js'
import {
  AuthProtocolVersionMismatchError,
  ensureKnownError,
  InvalidIdentityProofError,
  TimeoutError,
} from '../errors.js'

/** @import {OpenedNoiseStream, AuthedNoiseStream} from '../lib/noise-secret-stream-helpers.js' */
/** @import {Keypair} from './local-discovery.js' */

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

export const AUTH_PROTOCOL = 'comapeo/auth'
const AUTH_PROTOCOL_VERSION = 1
const AUTH_HANDSHAKE_TIMEOUT = 10_000

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
    let shouldRetry = false
    for (const existingConnection of this.#connections) {
      if (!existingConnection.remotePublicKey?.equals(noisePublicKey)) continue
      const opened = await openedNoiseSecretStream(existingConnection)
      // If the connection closed, skip it and continue the loop
      if (opened.destroyed) {
        shouldRetry = true
        continue
      }
      // @ts-ignore Some connections might not be handshaked, wait for them to be
      if (!existingConnection.authenticatedPublicKey) {
        const success = await this.#pendingHandshakes.get(existingConnection)
        if (!success) {
          shouldRetry = true
          continue
        }
      }
      // @ts-ignore
      return opened
    }

    // If we encountered a closed connection, recurse once to retry
    // after the 'close' event may have removed it from #connections
    if (shouldRetry) return this.#findExistingPeer(noisePublicKey)

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
    socket.once('finish', () => this.#connections.delete(socket))
    try {
      const remotePublicKeyString = socket.remotePublicKey.toString('hex')
      // @ts-ignore
      socket.isTrusted = this.#shouldTrustKeys.has(remotePublicKeyString)

      // Wait for the NOISE handshake to complete
      const opened = await socket.opened
      if (!opened || socket.destroyed) return

      // Create protomux and store on the stream so LocalPeers can reuse it
      const protomux = Protomux.from(socket)
      socket.userData = protomux

      // Set up the auth channel
      const helloDefer = pDefer()
      const identityDefer = pDefer()
      const onAuthOpen = pDefer()
      /** @type {ReturnType<typeof pDefer>} */
      let drainDefer

      const messages = [
        {
          encoding: cenc.raw,
          onmessage: /** @param {Buffer} msg */ (msg) => {
            const hello = Hello.decode(msg)
            if (hello.protocolVersion !== AUTH_PROTOCOL_VERSION) {
              this.#l.log(
                'Peer %s has incompatible protocol version %d',
                remotePublicKeyString,
                hello.protocolVersion
              )
              helloDefer.reject(new AuthProtocolVersionMismatchError())
              return
            }
            helloDefer.resolve(hello)
          },
        },
        {
          encoding: cenc.raw,
          onmessage: /** @param {Buffer} msg */ (msg) => {
            identityDefer.resolve(IdentityProof.decode(msg))
          },
        },
      ]

      const authChannel = protomux.createChannel({
        protocol: AUTH_PROTOCOL,
        messages,
        onopen: () => onAuthOpen.resolve(),
        ondrain: () => drainDefer?.resolve(),
      })
      authChannel.open()
      await onAuthOpen.promise

      /**
       * @param {Buffer} buf
       * @param {number} messageId
       */
      const sendAndDrain = async (buf, messageId) => {
        drainDefer = pDefer()
        const didWrite = authChannel.messages[messageId].send(buf)
        if (!didWrite) await drainDefer.promise
      }

      // Send our hello
      const myHello = Hello.encode({
        protocolVersion: AUTH_PROTOCOL_VERSION,
      }).finish()
      await sendAndDrain(Buffer.from(myHello), 0)

      // Receive peer's hello
      await timeoutPromise(helloDefer.promise, {
        milliseconds: AUTH_HANDSHAKE_TIMEOUT,
      })

      // Send our identity proof
      const sig = new Uint8Array(64)
      sodium.crypto_sign_detached(
        sig,
        socket.handshakeHash,
        this.#identityKeypair.secretKey
      )
      const myProof = IdentityProof.encode({
        publicKey: this.#identityKeypair.publicKey,
        signature: Buffer.from(sig),
      }).finish()
      await sendAndDrain(Buffer.from(myProof), 1)

      // Receive and verify peer's identity proof
      const peerProof = await timeoutPromise(identityDefer.promise, {
        milliseconds: AUTH_HANDSHAKE_TIMEOUT,
      })

      let valid
      try {
        valid = sodium.crypto_sign_verify_detached(
          peerProof.signature,
          socket.handshakeHash,
          peerProof.publicKey
        )
      } catch {
        valid = false
      }
      if (!valid) throw new InvalidIdentityProofError()

      // @ts-expect-error adding AuthedNoiseStream properties
      socket.authenticatedPublicKey = peerProof.publicKey
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
