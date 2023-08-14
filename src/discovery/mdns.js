import { TypedEmitter } from 'tiny-typed-emitter'
import net from 'node:net'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import { KeyManager } from '@mapeo/crypto'

const keyManager = new KeyManager(randomBytes(16))
const identityKeypair = keyManager.getIdentityKeypair()
const mdnsDiscovery = new MdnsDiscovery({ identityKeypair })

const SERVICE_NAME = 'mapeo'

discover.announce('mdns-basic-example', { port: 3456 })
class MdnsDiscovery extends TypedEmitter {
  #identityKeypair
  #server
  /** @typedef {Set<string>} */
  #connections = new Set()
  #advertiser
  #browser

  constructor({ identityKeypair }) {
    super()
    this.#identityKeypair = identityKeypair
    this.#server = net.createServer(this.#handleConnection.bind(this, false))
  }

  async start() {
    // Let OS choose port, listen on ip4, all interfaces
    this.#server.listen(0, '0.0.0.0')
    // TODO: listen for errors
    await once(this.#server, 'listening')

    const listeningPort = this.#server.address().port

    this.#advertiser = new dnssd.Advertisement(
      dnssd.tcp(SERVICE_NAME),
      listeningPort
    )
    this.#advertiser.start()

    // find all peers adverticing Mapeo
    this.#browser = dnssd
      .Browser(dnssd.tcp(SERVICE_NAME))
      .on('serviceUp', (service) => {
        net.connect(
          service.port,
          service.addresses[0],
          this.#handleConnection.bind(this, true)
        )
      })
      .start()
  }

  /**
   * @param {boolean} isInitiator
   * @param {net.Socket} socket
   */
  #handleConnection(isInitiator, socket) {
    const remoteAddress = socket.remoteAddress
    if (this.#connections.has(remoteAddress)) {
      socket.destroy()
      return
    }
    this.#connections.add(remoteAddress)
    // listen for socket disconnect and remove from this.#connections
    const secretStream = new NoiseSecretStream(isInitiator, socket, {
      keyPair: this.#identityKeypair,
    })
    secretStream.on('connect', () => {
      // dedupe - as in issue based on key comparison
      // once dedupe is done, emit('connection', secretStream)
    })
  }

  stop() {
    this.#server.close() // wait for close
    // stop browsing
    // stop advertising
  }
}
