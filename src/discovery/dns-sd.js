import { TypedEmitter } from 'tiny-typed-emitter'
import { Bonjour } from 'bonjour-service'
// @ts-ignore
import debug from 'debug'
import pTimeout from 'p-timeout'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'

const SERVICE_NAME = 'mapeo'

/**
 * @typedef {object} MapeoService
 * @property {string} address IPv4 address of service
 * @property {number} port
 * @property {string} name Instance name
 */

/**
 * @typedef {object} DnsSdEvents
 * @property {(service: MapeoService) => void} up
 * @property {(service: MapeoService) => void} down
 */

/**
 * @extends {TypedEmitter<DnsSdEvents>}
 */
export class DnsSd extends TypedEmitter {
  #name
  /** @type {import('bonjour-service').Bonjour | null} */
  #bonjour = null
  /** @type {import('bonjour-service').Service | null} */
  #service = null
  /** @type {import('bonjour-service').Browser | null} */
  #browser = null
  /** @type {null | Error} */
  #error = null
  /** @param {import('bonjour-service').Service} service */
  #handleServiceUp = (service) => {
    if (service.name === this.#name) {
      this.#log(`Ignoring service up from self`)
      return
    }
    const address = service.addresses?.filter(isIpv4)[0]
    /* c8 ignore start */
    if (!address) {
      this.#log(`service up (${service.name}) with no ipv4 addresses`)
      return
    }
    /* c8 ignore stop */
    const { name, port } = service
    this.#log(`service up`, [name, address, port])
    this.emit('up', { port, name, address })
  }
  /** @param {import('bonjour-service').Service} service */
  #handleServiceDown = (service) => {
    if (service.name === this.#name) {
      this.#log(`Ignoring service down from self`)
      return
    }
    const address = service.addresses?.filter(isIpv4)[0]
    /* c8 ignore start */
    if (!address) {
      this.#log(`service down (${service.name}) with no ipv4 addresses`)
      return
    }
    /* c8 ignore stop */
    const { name, port } = service
    this.#log(`service down`, [name, address, port])
    this.emit('down', { port, name, address })
  }
  #disableIpv6
  /** @type {Promise<any> | null} */
  #advertisingStarting = null
  /** @type {Promise<any> | null} */
  #advertisingStopping = null
  #log
  #createDgramSocket

  /**
   *
   * @param {object} [opts]
   * @param {string} [opts.name]
   * @param {boolean} [opts.disableIpv6]
   * @param {() => import('node:dgram').Socket} [opts.createDgramSocket] Internal - used for adding latency in tests
   */
  constructor({ name, disableIpv6 = true, createDgramSocket } = {}) {
    super()
    this.#name = name || randomBytes(8).toString('hex')
    this.#disableIpv6 = disableIpv6
    this.#createDgramSocket = createDgramSocket
    this.#log = debug('mapeo:dnssd:' + this.#name)
  }

  get name() {
    return this.#name
  }

  /** @param {number} port */
  async advertise(port) {
    if (this.#advertisingStopping) {
      await this.#advertisingStopping
    }
    this.#log(`Starting advertising on ${port}`)
    if (this.#service && this.#service.port === port) {
      if (this.#service.published) {
        this.#log(`Already advertising on ${port}`)
        return
      }
      this.#log(`service stopped, starting`)
      this.#service.start()
    } else {
      if (this.#service) {
        this.#log(`Stopping previous advertisement on ${this.#service.port}`)
        await this.stopAdvertising()
      }
      const instance = this.#getInstance()
      this.#service = instance.publish({
        name: this.#name,
        host: this.#name + '.local',
        port,
        type: SERVICE_NAME,
        disableIpv6: this.#disableIpv6,
      })
    }
    this.#advertisingStarting = once(this.#service, 'up')
    await pTimeout(this.#advertisingStarting, { milliseconds: 5000 })
    this.#advertisingStarting = null
    this.#log(`Now advertising on ${port}`)
  }

  browse() {
    if (this.#browser) {
      // @ts-ignore - using private property as a check for whether browser is already started
      if (this.#browser.onresponse) {
        this.#log(`browser already started, updating`)
        this.#browser.update()
        return
      }
      this.#browser.start()
    } else {
      const instance = this.#getInstance()
      this.#browser = instance.find({
        type: SERVICE_NAME,
      })
    }
    this.#browser.on('up', this.#handleServiceUp)
    this.#browser.on('down', this.#handleServiceDown)
  }

  async stopAdvertising() {
    this.#log(`stopping advertising`)
    if (this.#advertisingStarting) {
      await this.#advertisingStarting
    }
    const service = this.#service
    if (!service) return
    this.#advertisingStopping = /** @type {Promise<void>} */ (
      new Promise((res) => {
        service.stop(res)
      })
    )
    await this.#advertisingStopping
    this.#advertisingStopping = null
    this.#log(`stopped advertising`)
  }

  stopBrowsing() {
    if (!this.#browser) return
    this.#browser.removeListener('up', this.#handleServiceUp)
    this.#browser.removeListener('down', this.#handleServiceDown)
    this.#browser.stop()
  }

  async destroy() {
    this.#log(`destroying`)
    const bonjour = this.#bonjour
    if (!bonjour) return
    this.#bonjour = null
    this.stopBrowsing()
    this.#browser = null
    const service = this.#service
    this.#service = null
    await /** @type {Promise<void>} */ (
      new Promise((res) => {
        bonjour.unpublishAll(res)
      })
    )
    this.#log(`all services unpublished`)
    await /** @type {Promise<void>} */ (
      new Promise((res) => {
        if (!service) return res()
        service.stop(res)
      })
    )
    this.#log(`stopped advertising`)
    await new Promise((res) => {
      bonjour.destroy(res)
    })
    this.#log(`destroyed`)
  }

  /**
   * Lazily get a Bonjour instance. Previous errors are cleared
   *
   * @returns {Bonjour}
   */
  #getInstance() {
    if (this.#bonjour) {
      // tests don't replicate an error here yet
      /* c8 ignore start */
      if (this.#error) {
        // Don't allow advertise / browse when the instance has errored
        throw this.#error
      }
      /* c8 ignore stop */
      return this.#bonjour
    }
    this.#error = null
    this.#bonjour = new Bonjour(
      {
        // @ts-ignore types for bonjour-service are incorrect for this
        socket: this.#createDgramSocket ? this.#createDgramSocket() : undefined,
      },
      // Tests don't replicate error here yet
      /* c8 ignore start */
      (/** @type {any} */ error) => {
        // TODO: Logging
        this.#error = error
      }
      /* c8 ignore stop */
    )
    return this.#bonjour
  }
}

/**
 * Returns true if the given ip is an ipv4 address
 * @param {string} ip
 * @returns {boolean}
 */
function isIpv4(ip) {
  return ip.split('.').length === 4
}
