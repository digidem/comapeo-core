import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import dnssd from 'dnssd'
import b4a from 'b4a'


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
  #connections = new Set()
  /** @type {typeof import('dnssd').Advertisement} */
  #advertiser
  /** @type {typeof import('dnssd').Browser} */
  #browser

  /** @param {Object} opts
   * @param {Keypair} opts.identityKeypair
   * @param {Number} opts.port */
  constructor({ identityKeypair, port }) {
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
    const listeningPort = typeof addr === 'string' ? addr : addr?.port


    this.#advertiser = new dnssd.Advertisement(
      dnssd.tcp(SERVICE_NAME),
      listeningPort
    )
    await this.#advertiser.start()

    // find all peers adverticing Mapeo
    this.#browser = await dnssd
      .Browser(dnssd.tcp(SERVICE_NAME))
      .on('serviceUp',
        /** @param {Service} service */
        (service) => {
          const socket = net.connect(
            service.port,
            service.addresses && service.addresses[0]
          )
          socket.on('connect',() => {
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

    const remoteAddress = socket.remoteAddress
    if (this.#connections.has(remoteAddress)) {
      socket.destroy()
      return
    }

    const secretStream = new NoiseSecretStream(isInitiator, socket, {
      keyPair: this.#identityKeypair,
    })

    secretStream.on('close', () => {
      this.#connections.delete(remoteAddress)
    })


    secretStream.on('connect', async () => {
      // deterministically choose the connection to keep,
      // by ordering the {remote,local}public keys
      const keep = !secretStream.isInitiator ||
        b4a.compare(secretStream.publicKey, secretStream.remotePublicKey) > 0
      if(keep){

        this.#connections.add(remoteAddress)
        this.emit('connection', secretStream)
      }

    })
  }

  stop() {
    this.#server.close() // wait for close
    this.#browser.removeAllListeners('serviceUp')
    this.#browser.stop()
    this.#advertiser.stop(true)
    // stop browsing
    // stop advertising
  }
}
