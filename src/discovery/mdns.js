import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import { DnsSd } from './dns-sd.js'
import debug from 'debug'
import { isPrivate } from 'bogon'
import StartStopStateMachine from 'start-stop-state-machine'
import pTimeout from 'p-timeout'
import { keyToPublicId } from '@mapeo/crypto'

/** @typedef {{ publicKey: Buffer, secretKey: Buffer }} Keypair */

export const ERR_DUPLICATE = 'Duplicate connection'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: import('@hyperswarm/secret-stream')<net.Socket>) => void} connection
 */

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class MdnsDiscovery extends TypedEmitter {
  #identityKeypair
  #server
  /** @type {Map<string, NoiseSecretStream<net.Socket>>} */
  #noiseConnections = new Map()
  #dnssd
  #sm
  #log
  /** @type {(e: Error) => void} */
  #handleSocketError

  /**
   * @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   * @param {DnsSd} [opts.dnssd] Optional DnsSd instance, used for testing
   */
  constructor({ identityKeypair, dnssd }) {
    super()
    this.#dnssd =
      dnssd ||
      new DnsSd({
        name: keyToPublicId(identityKeypair.publicKey),
      })
    this.#dnssd.on('up', this.#handleServiceUp.bind(this))
    this.#log = debug('mapeo:mdns:' + keyShortname(identityKeypair.publicKey))
    this.#sm = new StartStopStateMachine({
      start: this.#start.bind(this),
      stop: this.#stop.bind(this),
    })
    this.#handleSocketError = (e) => {
      this.#log('socket error', e.message)
    }
    this.#identityKeypair = identityKeypair
    this.#server = net.createServer(this.#handleTcpConnection.bind(this, false))
    this.#server.on('error', (e) => {
      this.#log('Server error', e)
    })
  }

  get publicKey() {
    return this.#identityKeypair.publicKey
  }

  address() {
    return this.#server.address()
  }

  async start() {
    return this.#sm.start()
  }

  async #start() {
    // start browsing straight away
    this.#dnssd.browse()

    // Let OS choose port, listen on ip4, all interfaces
    this.#server.listen(0, '0.0.0.0')
    await once(this.#server, 'listening')
    const addr = getAddress(this.#server)
    this.#log('server listening on port ' + addr.port)
    await this.#dnssd.advertise(addr.port)
    this.#log('advertising service on port ' + addr.port)
  }

  /**
   *
   * @param {import('./dns-sd.js').MapeoService} service
   * @returns
   */
  #handleServiceUp({ address, port, name }) {
    this.#log('serviceUp', name.slice(0, 7), address, port)
    if (this.#noiseConnections.has(name)) {
      this.#log(`Already connected to ${name.slice(0, 7)}`)
      return
    }
    const socket = net.connect(port, address)
    socket.on('error', this.#handleSocketError)
    socket.once('connect', () => {
      this.#handleTcpConnection(true, socket)
    })
  }

  /**
   * @param {boolean} isInitiator
   * @param {net.Socket} socket
   */
  #handleTcpConnection(isInitiator, socket) {
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
      secretStream.off('error', this.#handleSocketError)
      this.#handleNoiseStreamConnection(secretStream)
    })
  }

  /**
   *
   * @param {NoiseSecretStream<net.Socket>} existing
   * @param {NoiseSecretStream<net.Socket>} keeping
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
   *
   * @param {NoiseSecretStream<net.Socket>} conn
   * @returns
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
      `${isInitiator ? 'outgoing' : 'incoming'} secretSteam connection ${
        isInitiator ? 'to' : 'from'
      } ${keyShortname(remotePublicKey)}`
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
    this.#noiseConnections.set(remoteId, conn)

    conn.on('close', () => {
      this.#log(`closed connection with ${keyShortname(remotePublicKey)}`)
      this.#noiseConnections.delete(remoteId)
    })

    // No 'error' listeners attached to `conn` at this point, it's up to the
    // consumer to attach an 'error' listener to avoid uncaught errors.
    this.emit('connection', conn)
  }

  get connections() {
    return this.#noiseConnections.values()
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
   * @type {MdnsDiscovery['stop']}
   */
  async #stop({ force = false, timeout = 0 } = {}) {
    this.#log('stopping')
    const { port } = getAddress(this.#server)
    this.#server.close()
    const destroyPromise = this.#dnssd.destroy()
    const closePromise = once(this.#server, 'close')
    await pTimeout(closePromise, {
      milliseconds: force ? (timeout === 0 ? 1 : timeout) : Infinity,
      fallback: () => {
        for (const socket of this.#noiseConnections.values()) {
          socket.destroy()
        }
        return pTimeout(closePromise, { milliseconds: 500 })
      },
    })
    await destroyPromise
    this.#log(`stopped for ${port}`)
  }
}

/**
 * Get the address of a server, will throw if the server is not yet listening or
 * if it is listening on a socket
 * @param {import('node:net').Server} server
 * @returns
 */
function getAddress(server) {
  const addr = server.address()
  if (addr === null || typeof addr === 'string') {
    throw new Error('Server is not listening on a port')
  }
  return addr
}

/**
 *
 * @param {Buffer} key
 * @returns
 */
function keyShortname(key) {
  return keyToPublicId(key).slice(0, 7)
}

function noop() {}
