import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import dnssd from '@gravitysoftware/dnssd'


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
  /** @type {Set<string>} */
  #socketConnections = new Set()
  /** @type {Set<string>} */
  #noiseConnections = new Set()
  /** @type {typeof import('@gravitysoftware/dnssd').Advertisement} */
  #advertiser
  /** @type {typeof import('@gravitysoftware/dnssd').Browser} */
  #browser

  /** @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   */
  constructor({ identityKeypair}) {
    super()
    this.#identityKeypair = identityKeypair
    this.#server = net.createServer(this.#handleConnection.bind(this, false))
  }

  async start() {
    // Let OS choose port, listen on ip4, all interfaces
    this.#server.listen(0, '0.0.0.0')
    // TODO: listen for errors
    await once(this.#server, 'listening')

    const addr = /** @type {net.AddressInfo} */ (this.#server.address())
    if(!isAddressInfo(addr)) throw new Error('Server must be listening on a port')


    this.#advertiser = new dnssd.Advertisement(
      dnssd.tcp(SERVICE_NAME),
      addr.port
    )
    await this.#advertiser.start()

    // find all peers adverticing Mapeo
    this.#browser = await dnssd
      .Browser(dnssd.tcp(SERVICE_NAME))
      .on('serviceUp',
        /** @param {Service} service */
        (service) => {
          if(!isValidServerAddresses(service.addresses)) {
            throw new Error('Got invalid server addresses from service')
          }
          const socket = net.connect(
            service.port,
            service.addresses[0]
          )
          socket.once('connect',() => {
            this.#handleConnection(true, socket)
          })
        })
      .start()
  }

  /**
   * @param {boolean} isInitiator
   * @param {net.Socket} socket
   */
  async #handleConnection(isInitiator, socket) {
    if(!socket.remoteAddress) return

    const { remoteAddress } = socket
    if (this.#socketConnections.has(remoteAddress)) {
      socket.destroy()
      return
    }
    this.#socketConnections.add(remoteAddress)

    const secretStream = new NoiseSecretStream(isInitiator, socket, {
      keyPair: this.#identityKeypair,
    })


    secretStream.on('connect', async () => {
      const remotePublicKey = secretStream.remotePublicKey?.toString('hex')

      if(!remotePublicKey) throw new Error('Invalid remote public key')

      secretStream.on('close', () => {
        this.#socketConnections.delete(remoteAddress)
        this.#noiseConnections.delete(remotePublicKey)
      })

      const isDuplicate = this.#noiseConnections.has(remotePublicKey)
      if(isDuplicate){
        this.#socketConnections.delete(remoteAddress)
        socket.destroy()
        secretStream.destroy()
        return
      }
      this.#noiseConnections.add(remotePublicKey)
      this.emit('connection', secretStream)
    })
  }

  stop() {
    this.#server.close() // wait for close
    this.#browser.removeAllListeners('serviceUp')
    this.#browser.stop()
    this.#advertiser.stop(true)
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
  * @returns {boolean}
  */
function isValidServerAddresses(addr){
  return (addr?.length !== 0 && addr !== undefined)
}
