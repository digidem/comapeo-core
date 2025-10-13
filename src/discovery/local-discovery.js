import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import { randomBytes } from 'node:crypto'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import { noop } from '../utils.js'
import { isPrivate } from 'bogon'
import StartStopStateMachine from 'start-stop-state-machine'
import pTimeout from 'p-timeout'
import { keyToPublicId } from '@mapeo/crypto'
import { Logger } from '../logger.js'
import { getErrorCode } from '../lib/error.js'
/** @import { OpenedNoiseStream } from '../lib/noise-secret-stream-helpers.js' */

/** @typedef {{ publicKey: Buffer, secretKey: Buffer }} Keypair */
/** @typedef {OpenedNoiseStream<net.Socket>} OpenedNetNoiseStream */

/** @satisfies {import('node:net').ServerOpts | import('node:net').TcpNetConnectOpts} */
const TCP_KEEP_ALIVE_OPTIONS = {
  keepAlive: true,
  keepAliveInitialDelay: 30_000,
  // Turn off Nagle's algorythm, to reduce latency
  // https://github.com/digidem/comapeo-core/issues/1070
  noDelay: true,
}
export const ERR_DUPLICATE = 'Duplicate connection'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: OpenedNetNoiseStream) => void} connection
 */

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class LocalDiscovery extends TypedEmitter {
  #identityKeypair
  #name = randomBytes(8).toString('hex')
  #server
  /** @type {Map<string, OpenedNetNoiseStream>} */
  #noiseConnections = new Map()
  #sm
  #log
  /** @type {(e: Error) => void} */
  #handleSocketError
  #l
  #port = 0

  /**
   * @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   * @param {Logger} [opts.logger]
   */
  constructor({ identityKeypair, logger }) {
    super()
    this.#l = Logger.create('LocalDiscovery', logger)
    this.#log = this.#l.log.bind(this.#l)
    this.#sm = new StartStopStateMachine({
      start: this.#start.bind(this),
      stop: this.#stop.bind(this),
    })
    this.#handleSocketError = (e) => {
      this.#log('socket error', e.message)
    }
    this.#identityKeypair = identityKeypair
    this.#server = net.createServer(
      TCP_KEEP_ALIVE_OPTIONS,
      this.#handleTcpConnection.bind(this, false)
    )
    this.#server.on('error', (e) => {
      this.#log('Server error', e)
    })
  }

  /** @returns {Promise<{ name: string, port: number }>} */
  async start() {
    await this.#sm.start()
    const { port } = getAddress(this.#server)
    this.#port = port
    this.#log('server listening on port ' + port)
    return { name: this.#name, port }
  }

  /** @returns {Promise<void>} */
  async #start() {
    // Let OS choose port, listen on ip4, all interfaces
    const onListening = once(this.#server, 'listening')

    try {
      this.#server.listen(this.#port, '0.0.0.0')
      await onListening
    } catch (e) {
      if (this.#port === 0) throw e
      // Account for errors from re-binding the port failing
      this.#port = 0
      return this.#start()
    }
  }

  /**
   * @param {object} peer
   * @param {string} peer.address
   * @param {number} peer.port
   * @param {string} peer.name
   * @returns {void}
   */
  connectPeer({ address, port, name }) {
    if (this.#name === name) return
    this.#log('peer connected', name.slice(0, 7), address, port)
    if (this.#noiseConnections.has(name)) {
      this.#log(`Already connected to ${name.slice(0, 7)}`)
      return
    }
    const socket = net.connect({
      ...TCP_KEEP_ALIVE_OPTIONS,
      host: address,
      port,
    })
    socket.on('error', this.#handleSocketError)
    socket.once('connect', () => {
      this.#handleTcpConnection(true, socket)
    })
  }

  /**
   * @param {boolean} isInitiator
   * @param {net.Socket} socket
   * @returns {void}
   */
  #handleTcpConnection(isInitiator, socket) {
    socket.off('error', this.#handleSocketError)
    socket.on('error', onSocketError)

    /** @param {Error} e */
    function onSocketError(e) {
      if (getErrorCode(e) === 'EPIPE') {
        socket.destroy()
        if (secretStream) {
          secretStream.destroy()
        }
      }
    }

    const { remoteAddress } = socket
    if (!remoteAddress || !isPrivate(remoteAddress)) {
      socket.destroy(new Error('Invalid remoteAddress ' + remoteAddress))
      return
    }
    this.#log(
      `${isInitiator ? 'outgoing' : 'incoming'} tcp connection ${
        isInitiator ? 'to' : 'from'
      } ${remoteAddress}`
    )

    const secretStream = new NoiseSecretStream(isInitiator, socket, {
      keyPair: this.#identityKeypair,
    })

    secretStream.on('error', this.#handleSocketError)

    secretStream.on('connect', () => {
      // Further errors will be handled in #handleNoiseStreamConnection()
      socket.off('error', onSocketError)
      secretStream.off('error', this.#handleSocketError)
      this.#handleNoiseStreamConnection(
        // We know the NoiseStream is open at this point, so we can coerce the type
        /** @type {OpenedNetNoiseStream} */
        (secretStream)
      )
    })
  }

  /**
   * @param {OpenedNetNoiseStream} existing
   * @param {OpenedNetNoiseStream} keeping
   * @returns {void}
   */
  #handleConnectionSwap(existing, keeping) {
    let closed = false

    existing.on('close', () => {
      // The connection we are keeping could have closed before we get here
      if (closed) return

      keeping.removeListener('error', noop)
      keeping.removeListener('close', onclose)

      this.#handleNoiseStreamConnection(keeping)
    })

    keeping.on('error', noop)
    keeping.on('close', onclose)

    function onclose() {
      closed = true
    }
  }

  /**
   * @param {OpenedNetNoiseStream} conn
   * @returns {void}
   */
  #handleNoiseStreamConnection(conn) {
    const { remotePublicKey, isInitiator } = conn
    if (!remotePublicKey) {
      // Shouldn't get here
      this.#log('Error: incoming connection with no publicKey')
      conn.destroy()
      return
    }
    const remoteId = keyToPublicId(remotePublicKey)

    this.#log(
      `${isInitiator ? 'outgoing' : 'incoming'} secret stream connection ${
        isInitiator ? 'to' : 'from'
      } %h`,
      remotePublicKey
    )

    const existing = this.#noiseConnections.get(remoteId)

    if (existing) {
      const keyCompare = Buffer.compare(
        this.#identityKeypair.publicKey,
        remotePublicKey
      )
      const keepExisting =
        // These first two checks check if a peer tried to connect twice. In
        // this case we keep the existing connection.
        (isInitiator && existing.isInitiator) ||
        (!isInitiator && !existing.isInitiator) ||
        // If each peer tried to connect to the other at the same time, then we
        // tie-break based on public key comparison (the initiator need to check
        // the opposite of the non-initiator, because the keys are the other way
        // around for them)
        (isInitiator ? keyCompare > 0 : keyCompare <= 0)
      if (keepExisting) {
        this.#log(`keeping existing, destroying new`)
        conn.on('error', noop)
        conn.destroy(new Error(ERR_DUPLICATE))
        return
      } else {
        this.#log(`destroying existing, keeping new`)
        existing.on('error', noop)
        existing.destroy(new Error(ERR_DUPLICATE))
        this.#handleConnectionSwap(existing, conn)
        return
      }
    }

    // Bail if the server has already stopped by this point. This should be
    // rare but can happen during connection swaps if the new connection is
    // "promoted" after the server's doors have already been closed.
    if (!this.#server.listening) {
      this.#log('server stopped, destroying connection %h', remotePublicKey)
      conn.destroy()
      return
    }

    this.#noiseConnections.set(remoteId, conn)

    conn.on('close', () => {
      this.#log('closed connection with %h', remotePublicKey)
      this.#noiseConnections.delete(remoteId)
    })

    // No 'error' listeners attached to `conn` at this point, it's up to the
    // consumer to attach an 'error' listener to avoid uncaught errors.
    this.emit('connection', conn)
  }

  /**
   * Close all servers and stop multicast advertising and browsing. Will wait
   * for open sockets to close unless opts.force=true in which case open sockets
   * are force-closed after opts.timeout milliseconds
   *
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] Force-close open sockets after timeout milliseconds
   * @param {number} [opts.timeout=0] Optional timeout when calling stop() with force=true
   * @returns {Promise<void>}
   */
  async stop(opts) {
    return this.#sm.stop(opts)
  }

  /**
   * @type {LocalDiscovery['stop']}
   */
  async #stop({ force = false, timeout = 0 } = {}) {
    this.#log('stopping')
    const port = this.#port
    this.#server.close()
    const closePromise = once(this.#server, 'close')

    const forceClose = () => {
      for (const socket of this.#noiseConnections.values()) {
        socket.destroy()
      }
      return pTimeout(closePromise, { milliseconds: 500 })
    }

    if (!force) {
      await closePromise
    } else if (timeout === 0) {
      // If timeout is 0, we force-close immediately
      await forceClose()
    } else {
      await pTimeout(closePromise, {
        milliseconds: timeout,
        fallback: forceClose,
      })
    }
    this.#log(`stopped for ${port}`)
  }
}

/**
 * Get the address of a server, will throw if the server is not yet listening or
 * if it is listening on a socket
 * @param {import('node:net').Server} server
 * @returns {import('node:net').AddressInfo}
 */
function getAddress(server) {
  const addr = server.address()
  if (addr === null || typeof addr === 'string') {
    throw new Error('Server is not listening on a port')
  }
  return addr
}
