import net from 'net'
import { EventEmitter } from 'events'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import Hyperswarm from 'hyperswarm'
import SecretStream from '@hyperswarm/secret-stream'

export class Discovery extends EventEmitter {
	#swarm
	#mdns
	keyPair

	/**
	 * @param {Object} [options]
	 * @param {Object} [options.keyPair] - public and secret keys
	 * @param {Buffer} [options.keyPair.publicKey]
	 * @param {Buffer} [options.keyPair.secretKey]
	 * @param {Object|boolean} [options.dht] - set to false to disable dht, or pass object that will be passed to hyperswarm
	 * @param {Object|boolean} [options.mens] - set to false to disable mdns, or pass object that will be passed to mdns-sd-discovery
	 */
	constructor (options = {}) {
		super()

		this.keyPair = options.keyPair

		if (options.dht !== false) {
			this.#swarm = new Hyperswarm({ keyPair: this.keyPair, ...options.dht })
			this.#swarm.on('connection', this._onSwarmPeer.bind(this))
		}

		if (options.mdns !== false) {
			this.#mdns = new MdnsDiscovery({
				host: 'mapeo',
				...options.mdns
			})
		}
	}

	_onSwarmPeer (connection, info) {
		info.connectionType = 'dht'
		this.emit('connection', connection, info)
	}

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
			const server = net.createServer()
			this._server = server
			server.on('connection', (socket) => {
				const stream = new SecretStream(true, socket, {
					keyPair: this.keyPair
				})

				this.emit('connection', stream, {
					connectionType: 'mdns'
				})
			})

			server.on('error', (error) => {
				this.emit('error', error)
			})

			// start the server
			server.listen(options.mdnsPort || null, async () => {
				const address = server.address()
				const port = options.mdnsPort || address.port
				await this.#mdns.announce(topic, { port })
			})
		}
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
			this.#mdns.on('service', this._onMdnsPeer.bind(this))
			await this.#mdns.lookup(topic)
		}
	}

	async destroy () {
		if (this.#swarm) {
			await this.#swarm.destroy()
		}

		if (this.#mdns) {
			if (this._socket) {
				this._socket.destroy()
			}

			if (this._server) {
				this._server.close()
			}

			await this.#mdns.destroy()
		}
	}
}
