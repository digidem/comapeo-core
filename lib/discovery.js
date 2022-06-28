import { TypedEmitter } from 'tiny-typed-emitter'
import Hyperswarm from 'hyperswarm'

import { LocalPeers } from './localpeers.js'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: NoiseSecretStream, info: PeerInfo) => void} peer
 * @property {(error: Error) => void} error
 */

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class Discovery extends TypedEmitter {
  #peers = new Map()
  #discover = new Map()
  #dht
  #mdns

  /**
   * @param {object} options
   * @param {object} options.keyPair
   * @param {Buffer} options.keyPair.publicKey
   * @param {Buffer} options.keyPair.secretKey
   * @param {boolean|object} [options.dht=true]
   * @param {boolean|object} [options.mdns=true]
   */
  constructor({ keyPair, dht = true, mdns = true }) {
    super()

    if (dht !== false) {
      this.dhtOptions = /** @type {DhtOptions} */ (
        dht && typeof dht === 'object' ? dht : {}
      )

      this.dhtOptions.keyPair = keyPair

      this.#dht = new Hyperswarm(this.dhtOptions)
      this.#dht.on('connection', this._onDhtPeer.bind(this))
    }

    if (mdns !== false) {
      const mdnsOptions = /** @type {MdnsOptions} */ (
        typeof mdns === 'object' ? mdns : {}
      )

      mdnsOptions.identityKeyPair = keyPair
      mdnsOptions.name = 'mapeo'

      this.#mdns = new LocalPeers(mdnsOptions)
    }
  }

  get peers() {
    return Array.from(this.#peers.values())
  }

  get discover() {
    return Array.from(this.#discover.values())
  }

  /**
   * @param {NoiseSecretStream} connection
   * @param {HyperswarmPeerInfo} info
   */
  _onDhtPeer(connection, info) {
    const publicKey = connection.remotePublicKey.toString('hex')
    const peer = this.#peers.get(publicKey)

    if (!peer) {
      const peerInfo = new PeerInfo({
        topics: info.topics,
        host: connection.remoteHost,
        port: connection.remotePort,
        discoveryType: 'dht',
        identityPublicKey: publicKey,
      })

      this.#peers.set(publicKey, {
        connection,
        peerInfo,
      })

      this.emit('peer', connection, peerInfo)
    } else {
      this.#dht.leavePeer(publicKey)
    }
  }

  /**
   * @param {NoiseSecretStream} connection
   * @param {import('./localpeers.js').MdnsPeerInfo} info
   */
  _onMdnsPeer(connection, info) {
    const peer = this.#peers.get(info.identityPublicKey)

    if (!peer) {
      const peerInfo = new PeerInfo({
        topics: [Buffer.from(info.topic, 'hex')],
        discoveryType: 'mdns',
        ...info,
      })

      this.#peers.set(info.identityPublicKey, {
        connection,
        peerInfo,
      })

      this.emit('peer', connection, peerInfo)
    } else {
      peer.peerInfo.addTopic(info.topic)
    }
  }

  /**
   * @param {Topic} topic
   */
  async join(topic) {
    const topicString = topic.toString('hex')
    const discover = {}

    if (!this.#discover.has(topicString)) {
      discover.topic = topicString

      if (this.#mdns) {
        discover.mdns = this.#mdns.join(topic)
        discover.mdns.on('connection', (connection, info) => {
          this._onMdnsPeer(connection, info)
        })
      }

      if (this.#dht) {
        discover.dht = this.#dht.join(topic, {
          server: this.dhtOptions?.server,
          client: this.dhtOptions?.client,
        })

        if (this.dhtOptions?.server) {
          await discover.dht.flushed()
        } else {
          await this.#dht.flush()
        }
      }

      this.#discover.set(topicString, discover)
    }
  }

  /**
   * @param {Topic} topic
   */
  async leave(topic) {
    const topicString = topic.toString('hex')

    if (this.#dht) {
      await this.#dht.leave(topic)
    }

    if (this.#mdns) {
      this.#mdns.leave(topic)
    }

    if (this.#discover.has(topicString)) {
      const discover = this.#discover.get(topicString)

      if (discover.mdns) {
        discover.mdns.destroy()
      }

      if (discover.dht) {
        await discover.dht.destroy()
      }

      this.#discover.delete(topicString)
    }
  }

  async destroy() {
    for (const discover of this.#discover.values()) {
      discover.mdns?.destroy()
      discover.dht?.destroy()
    }

    if (this.#dht) {
      this.#dht.destroy()
    }

    if (this.#mdns) {
      this.#mdns.destroy()
    }
  }
}

class PeerInfo {
  /**
   * @typedef {Set<Topic>}
   */
  #topics

  /**
   * @param {Object} options
   * @param {Topic[]} options.topics
   * @param {string} options.host
   * @param {number} options.port
   * @param {('dht'|'mdns')} options.discoveryType
   * @param {string} options.identityPublicKey
   */
  constructor(options) {
    const {
      topics = [],
      host,
      port,
      discoveryType,
      identityPublicKey,
    } = options

    this.#topics = new Set([...topics])
    this.discoveryType = discoveryType
    this.host = host
    this.port = port
    this.identityPublicKey = identityPublicKey
  }

  /**
   * @param {Topic} topic
   */
  addTopic(topic) {
    this.#topics.add(topic)
  }

  /**
   * @param {Topic} topic
   */
  removeTopic(topic) {
    this.#topics.delete(topic)
  }

  get topics() {
    return Array.from(this.#topics)
  }
}
