import net from 'net'
import { TypedEmitter } from 'tiny-typed-emitter'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import SecretStream from '@hyperswarm/secret-stream'

export class LocalPeers extends TypedEmitter {
	/**
	 * @type Map<string, MdnsPeerDiscovery>
	 */
	#discovery = new Map()

	/**
	 * @type import('net').Server
	 */
	#tcp = net.createServer()

	/**
	 * @param {object} options
	 * @param {string} options.name
	 * @param {number} options.port
	 * @param {object} options.identityKeyPair
	 * @param {Buffer} options.identityKeyPair.publicKey
	 * @param {Buffer} options.identityKeyPair.secretKey
	 */
	constructor (options) {
		super()

		const {
			name,
			port,
			identityKeyPair
		} = options

		this.name = name
		this.port = port
		this.identityKeyPair = identityKeyPair
	}

	/**
	 * @param {Buffer} topic
	 * @returns {MdnsPeerDiscovery}
	 */
	join (topic) {
		const topicString = topic.toString('hex')
		let discovery = this.#discovery.get(topicString)

		if (discovery) {
			return discovery
		}

		discovery = new MdnsPeerDiscovery({
			topic: topicString,
			tcp: this.#tcp,
			name: this.name,
			port: this.port,
			identityKeyPair: this.identityKeyPair
		})

		this.#discovery.set(topicString, discovery)
		return discovery
	}

	/**
	 * @param {Buffer} topic
	 * @returns {void}
	 */
	leave (topic) {
		const topicString = topic.toString('hex')

		if (!this.#discovery.has(topicString)) {
			return
		}

		const discovery = this.#discovery.get(topicString)

		if (discovery) {
			discovery.destroy()
		}

		this.#discovery.delete(topicString)
	}
}

export class MdnsPeerDiscovery extends TypedEmitter {
	/**
	 * @type {MdnsDiscovery}
	 */
	#mdns

	/**
	 * @type import('net').Server
	 */
	#tcp

	/**
	 * @type Map<string, MdnsPeerInfo>
	 */
	#peers = new Map()

	/**
	 * @param {object} options
	 * @param {import('net').Server} options.tcp
	 * @param {string} options.name
	 * @param {number} options.port
	 * @param {string} options.topic
	 * @param {object} options.identityKeyPair
	 * @param {Buffer} options.identityKeyPair.publicKey
	 * @param {Buffer} options.identityKeyPair.secretKey
	 */
	constructor (options) {
		super()

		const {
			tcp,
			name,
			topic,
			port,
			identityKeyPair
		} = options

		this.#mdns = new MdnsDiscovery()
		this.#tcp = tcp

		this.topic = topic
		this.identityPublicKey = identityKeyPair.publicKey.toString('hex')

		this.#mdns.on('service', (service) => {
			if (
				service.txt
				&& service.txt.topic === topic
				&& service.txt.identity !== this.identityPublicKey
			) {
				const {
					host,
					port,
					txt
				} = service

				let peer
				if (this.#peers.has(txt.identity)) {
					peer = this.#peers.get(txt.identity)
				} else {
					peer = new MdnsPeerInfo({
						host,
						port,
						topic: txt.topic,
						identityPublicKey: txt.identity
					})
	
					this.#peers.set(txt.identity, peer)
				}

				this.emit('peer', peer)
			}
		})

		this.#mdns.on('service-down', (service) => {
			if (
				service.txt
				&& service.txt.topic === topic
				&& service.txt.identity !== this.identityPublicKey
			) {
				const { txt } = service

				if (this.#peers.has(txt.identity)) {
					this.emit('peer-closed', this.#peers.get(txt.identity))
					this.#peers.delete(txt.identity)
				}
			}
		})

		this.#mdns.announce(name, {
			port,
			txt: {
				identity: this.identityPublicKey,
				topic
			}
		})

		this.#mdns.lookup(name)
	}

	destroy () {
		this.removeAllListeners('peer')
		this.removeAllListeners('peer-closed')

		if (this.#mdns) {
			this.#mdns.destroy()
			this.#mdns = undefined
		}
	}
}

class MdnsPeerInfo {
	/**
	 * @param {object} options
	 * @param {string} options.host
	 * @param {number} options.port
	 * @param {string} options.topic
	 * @param {Buffer} options.identityPublicKey
	 */
	constructor (options) {
		const {
			host,
			port,
			topic,
			identityPublicKey
		} = options

		this.host = host
		this.port = port
		this.topic = topic
		this.identityPublicKey = identityPublicKey
	}
}
