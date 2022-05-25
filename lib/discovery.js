import net from 'net'
import { TypedEmitter } from 'tiny-typed-emitter'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import Hyperswarm from 'hyperswarm'
import SecretStream from '@hyperswarm/secret-stream'

export class Discovery extends TypedEmitter {
	#swarm
	#mdns
	#tcp
	keyPair

	/**
	 * @param {Object} [options]
	 * @param {Object} [options.keyPair] - public and secret keys
	 * @param {Buffer} [options.keyPair.publicKey]
	 * @param {Buffer} [options.keyPair.secretKey]
	 * @param {Object|boolean} [options.dht=true] - set to false to disable dht, or pass an object that will be passed to hyperswarm
	 * @param {Object|boolean} [options.mdns=true] - set to false to disable mdns, or pass an object that will be passed to mdns-sd-discovery
	 */
	constructor (options = {}) {
		super()

		const {
			dht = true,
			mdns = true
		} = options

		this.keyPair = options.keyPair

		if (dht !== false) {
			const hyperswarmOptions = typeof dht === 'object' ? dht : {}
			hyperswarmOptions.keyPair = this.keyPair
			this.#swarm = new Hyperswarm(hyperswarmOptions)
			this.#swarm.on('connection', this._onSwarmConnection.bind(this))
		}

		if (mdns !== false) {
			this.#mdns = new MdnsDiscovery(mdns)
			this.#tcp = net.createServer()
			this.#tcp.on('connection', this.onMdnsConnection.bind(this))
		}
	}

	_onSwarmConnection (connection, info) {
		info.connectionType = 'dht'
		this.emit('connection', connection, info)
	}

	/**
	 * @param {Buffer} name
	 * @param {Object} service
	 * @param {string} service.host
	 * @param {number} service.port
	 */
	_onMdnsPeer (name, service) {
		const socket = net.connect({
			host: service.host,
			port: service.port,
			allowHalfOpen: true
		})

		this._socket = socket

		const stream = new SecretStream(false, socket, {
			keyPair: this.keyPair
		})

		socket.on('connect', async () => {
			this.emit('connection', stream, {
				topic: name,
				connectionType: 'mdns'
			})
		})
	}

	/**
	 * @param {Buffer} topic - Buffer with size of 32 bytes
	 * @param {Object} [options]
	 * @param {number} [options.mdnsPort] - port to use for mdns announcement
	 */
	async announce (topic, options = {}) {
		if (this.#swarm) {
			const discovery = this.#swarm.join(topic, { server: true, client: false })
			await discovery.flushed()
		}

		if (this.#mdns) {
			this.#tcp?.listen(options.mdnsPort || null, async () => {
				const address = /** @type import('net').AddressInfo */ (this.#tcp?.address())
				await this.#mdns.announce(topic, { port: address.port })
			})
		}
	}

	async onConnection (socket) {

	}

	/**
	 * @param {Buffer} topic - Buffer with size of 32 bytes
	 */
	async lookup (topic) {
		if (this.#swarm) {
			this.#swarm.join(topic, { server: false, client: true })
			await this.#swarm.flush()
		}

		if (this.#mdns) {
			this.#mdns.on('service', (name, service) => {
				const stream = new SecretStream(true, socket, {
					keyPair: this.keyPair
				})
		
				this.emit('connection', stream, {
					topic,
					connectionType: 'mdns'
				})
			})
			await this.#mdns.lookup(topic)
		}
	}

	async destroy () {
		if (this.#swarm) {
			await this.#swarm.destroy()
		}

		if (this.#mdns) {
			if (this.#tcp) {
				this.#tcp.close()
				this.#tcp = undefined
			}

			await this.#mdns.destroy()
		}
	}
}
