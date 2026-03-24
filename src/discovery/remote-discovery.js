import { TypedEmitter } from 'tiny-typed-emitter'
import { Logger } from '../logger.js'
import Hyperswarm from 'hyperswarm'
import { pEvent } from 'p-event'

/** @import {OpenedNoiseStream} from '../lib/noise-secret-stream-helpers.js' */

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: OpenedNoiseStream) => void} connection
 */

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

  /**
   * @param {Object} opts
   * @param {import('./local-discovery.js').Keypair} opts.identityKeypair
   * @param {Logger} [opts.logger]
   */
  constructor({ identityKeypair, logger }) {
    super()
    this.#l = Logger.create('RemoteDiscovery', logger)
    this.#identityKeypair = identityKeypair
  }

  async #initSwarm() {
    this.#l.log('Initializing swarm')

    const swarm = new Hyperswarm({
      keyPair: this.#identityKeypair,
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

    const onConnected = pEvent(this, 'connection', {
      filter: (connection) => connection.publicKey.equals(noisePublicKey),
      timeout,
    })
    // Start trying to connect
    swarm.joinPeer(noisePublicKey)
    this.#l.log('Connecting to %S', publicKey)

    // Wait for discovery to finish
    await swarm.flush()
    this.#l.log('Discovery finished for %S', publicKey)
    const socket = await onConnected

    return socket
  }

  /**
   * @param {OpenedNoiseStream} socket
   * @param {import('hyperswarm').PeerInfo} _peerInfo
   */
  #handleHyperswarmConnection(socket, _peerInfo) {
    this.emit('connection', socket)
  }
}
