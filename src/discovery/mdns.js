import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import dnssd from '@gravitysoftware/dnssd'
import debug from 'debug'
import { randomBytes } from 'node:crypto'
import isIpPrivate from 'private-ip'

const log = debug('mdns')

const SERVICE_NAME = 'mapeo'

/** @typedef {{ publicKey: Buffer, secretKey: Buffer }} Keypair */

/**
 * @typedef {Object} Service
 * @property {string} host - hostname of the service
 * @property {number} port - port of the service
 * @property {Object<string, any>} txt - TXT records of the service
 * @property {string[]} [addresses] - addresses of the service
 */

export class MdnsDiscovery extends TypedEmitter {
  #identityKeypair
  #server
  /** @type {Map<string,NoiseSecretStream<net.Socket>>} */
  #noiseConnections = new Map()
  /** @type {import('@gravitysoftware/dnssd').Advertisement} */
  #advertiser
  /** @type {import('@gravitysoftware/dnssd').Browser} */
  #browser
  /** @type {string} */
  #id = randomBytes(8).toString('hex')

  /** @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   */
  constructor({ identityKeypair }) {
    super()
    this.#identityKeypair = identityKeypair
    this.#server = net.createServer(this.#handleConnection.bind(this, false))
  }

  async start() {
    // Let OS choose port, listen on ip4, all interfaces
    this.#server.listen(0, '0.0.0.0')
    this.#server.on('error', () => {})
    this.#server.on('close', () => {})
    await once(this.#server, 'listening')

    const addr = this.#server.address()
    if (!isAddressInfo(addr))
      throw new Error('Server must be listening on a port')
    log('server listening on port ' + addr.port)

    this.#advertiser = new dnssd.Advertisement(
      dnssd.tcp(SERVICE_NAME),
      addr.port,
      { txt: { id: this.#id } }
    )

    // find all peers adverticing Mapeo
    this.#browser = new dnssd.Browser(dnssd.tcp(SERVICE_NAME))
    this.#browser.on(
      'serviceUp',
      /** @param {Service} service */
      (service) => {
        if (service.txt?.id === this.#id) {
          log(`Discovered self, ignore`)
          return
        }
        log(
          'serviceUp',
          addr.port,
          addr.address,
          service.port,
          service.addresses
        )
        if (!isValidServerAddresses(service.addresses)) {
          throw new Error('Got invalid server addresses from service')
        }
        const socket = net.connect(service.port, service.addresses[0])
        socket.once('connect', () => {
          this.#handleConnection(true, socket)
        })
      }
    )

    Promise.all([this.#advertiser.start(), this.#browser.start()]).finally(
      () => {
        log(`started advertiser and browser for ${addr.port}`)
      }
    )
  }

  /**
   * @param {boolean} isInitiator
   * @param {net.Socket} socket
   */
  async #handleConnection(isInitiator, socket) {
    log(
      `${isInitiator ? 'outgoing' : 'incoming'} connection ${
        isInitiator ? 'to' : 'from'
      } ${socket.remotePort}`
    )
    if (!socket.remoteAddress) return
    if (!isIpPrivate(socket.remoteAddress)) return

    const { remoteAddress } = socket

    const secretStream = new NoiseSecretStream(isInitiator, socket, {
      keyPair: this.#identityKeypair,
    })

    secretStream.on('connect', async () => {
      log(`${isInitiator ? 'outgoing' : 'incoming'} secretSteam connection`)
      const { remotePublicKey } = secretStream
      if (!remotePublicKey) throw new Error('No remote public key')
      const remoteId = remotePublicKey.toString('hex')

      const close = () => {
        if (this.#noiseConnections.has(remoteId)) {
          this.#noiseConnections.delete(remoteId)
        }
        log(
          `Destroying connection ${isInitiator ? 'to' : 'from'} ${
            socket.remotePort
          }`
        )
        secretStream.destroy()
        socket.destroy()
      }

      secretStream.on('close', () => close())
      secretStream.on('error', () => close())

      const existing = this.#noiseConnections.get(remoteId)

      if (existing) {
        const keepExisting =
          (isInitiator && existing.isInitiator) ||
          (!isInitiator && !existing.isInitiator) ||
          Buffer.compare(this.#identityKeypair.publicKey, remotePublicKey)
        if (keepExisting) {
          log(`keeping existing, destroying new`)
          socket.destroy()
          secretStream.destroy()
          return
        } else {
          log(`destroying existing, keeping new`)
          existing.destroy()
        }
      }
      this.#noiseConnections.set(remoteId, secretStream)
      this.emit('connection', secretStream)
    })
  }

  get connections() {
    return this.#noiseConnections.values()
  }

  async stop() {
    const port = this.#server.address()?.port
    this.#browser.removeAllListeners('serviceUp')
    this.#browser.stop()
    this.#advertiser.stop(true)
    // eslint-disable-next-line no-unused-vars
    for (const [_, socket] of this.#noiseConnections) {
      socket.destroy()
    }
    await this.#server.close()
    log(`stopped for ${port}`)
  }
}

/**
 * @param {ReturnType<net.Server['address']>} addr
 * @returns {addr is net.AddressInfo}
 */
function isAddressInfo(addr) {
  if (addr === null || typeof addr === 'string') return false
  return true
}

/**
 * @param {string[] | undefined} addr
 * @returns {addr is [string, ...string[]]}
 */
function isValidServerAddresses(addr) {
  return addr?.length !== 0 && addr !== undefined
}
