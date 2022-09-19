import net from 'net'

import { TypedEmitter } from 'tiny-typed-emitter'
import SecretStream from '@hyperswarm/secret-stream'
import Hyperswarm from 'hyperswarm'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import base32 from 'base32.js'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: NoiseSecretStream, info: PeerInfo) => void} connection
 * @property {(topicStatus: { topic: TopicString, mdns: TopicServiceStatus, dht: TopicServiceStatus }) => void} topicStatus
 * @property {(peerStatus: { status: String, peer: PeerInfo }) => void} peerStatus
 * @property {(error: Error) => void} error
 */

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class Discovery extends TypedEmitter {
  #identityKeyPair

  /** @type {Map<string, Topic>} */
  #topics = new Map()

  /** @type {Map<string, PeerInfo>} */
  #peers = new Map()

  #tcp

  /**
   * @param {Object} options
   * @param {IdentityKeyPair} options.identityKeyPair
   * @param {Boolean} [options.mdns=true] Boolean that determines whether to use multicast dnssd to find peers
   * @param {Boolean|DhtOptions} [options.dht=true] Either a boolean that determines whether to use hyperswarm to find peers or an object that provides options that are passed to hyperswarm constructor
   */
  constructor(options) {
    super()

    const { identityKeyPair, dht = true, mdns = true } = options

    this.#identityKeyPair = identityKeyPair

    this.mdnsActive = !!mdns
    this.dhtActive = !!dht
    this.dhtOptions = this._getDhtOptions(dht)
    this.dhtOptions.keyPair = identityKeyPair

    if (this.mdnsActive) {
      this.#tcp = net.createServer()
      this.mdns = mdns
    }

    if (this.dhtActive) {
      this.dht = new Hyperswarm(this.dhtOptions)
    }
  }

  /**
   * Return the public key for the identity used for discovery
   *
   * @returns {string}
   */
  get identityPublicKey() {
    return encodeHex(this.#identityKeyPair.publicKey)
  }

  /**
   * Return the list of subscribed topics
   *
   * @returns {Topic[]}
   */
  get topics() {
    return Array.from(this.#topics.values())
  }

  /**
   * Returns the list of peers that have been connected to
   *
   * @returns {PeerInfo[]}
   */
  get peers() {
    return Array.from(this.#peers.values())
  }

  /**
   * Set up listeners for connections
   *
   * @returns {Promise<void>}
   */
  async ready() {
    if (this.mdns) {
      const address = await this._startServer()
      this.port = address.port
      this.host = address.host

      this.#tcp?.on('connection', this._onMdnsConnection.bind(this))
    }

    if (this.dht) {
      this.dht.on('connection', this._onDhtConnection.bind(this))
    }
  }

  /**
   * Handle connections that occur via mDNS
   *
   * @private
   * @param {import('net').Socket} socket
   * @returns {Promise<void>}
   */
  async _onMdnsConnection(socket) {
    if (socket.destroyed) {
      throw new Error('Socket destroyed')
    }

    const socketAddress = /** @type {import('net').AddressInfo} */ (
      socket.address()
    )

    if (!socketAddress.address) {
      throw new Error('Socket not connected')
    }

    /** @type {ConnectionStream} */
    const connection = new SecretStream(false, socket)

    connection.on('error', (error) => {
      console.error('Error on mdns client connection', error)
    })

    connection.on('connect', () => {
      const remotePublicKey = encodeHex(connection.remotePublicKey)

      if (remotePublicKey === this.identityPublicKey) {
        return
      }

      let peer = this.#peers.get(remotePublicKey)

      if (peer) {
        connection.end()
      } else {
        peer = new PeerInfo({
          topics: [],
          identityPublicKey: remotePublicKey,
          discoveryType: 'mdns',
          host: socketAddress.address,
          port: socketAddress.port,
          connection,
          status: 'connected',
        })

        this.#peers.set(remotePublicKey, peer)
        this.emit('connection', connection, peer)

        connection.on('close', async () => {
          const remotePublicKey = encodeHex(connection.remotePublicKey)
          const peer = this.#peers.get(remotePublicKey)

          if (peer) {
            this._updatePeerStatus(peer, 'disconnecting')
            peer.destroy()
            this._updatePeerStatus(peer, 'disconnected')
            this.#peers.delete(remotePublicKey)
          }
        })
      }
    })
  }

  /**
   * Handle connection that occur via the Hyperswarm DHT
   *
   * @private
   * @param {ConnectionStream} connection
   * @param {HyperswarmPeerInfo} info
   * @returns {Promise<void>}
   */
  async _onDhtConnection(connection, info) {
    const publicKey = encodeHex(connection.remotePublicKey)

    connection.on('error', async (/** @type {any} */ error) => {
      if (error.code === 'ECONNRESET') {
        // TODO: it seems like this ECONNRESET error is expected when a stream closes, but that also doesn't seem right
        return
      }

      console.error('DHT connection error', error)
      this._updatePeerStatus(peer, 'disconnecting')
      peer.destroy()
      this._updatePeerStatus(peer, 'disconnected')
      this.#peers.delete(publicKey)
    })

    if (this.#peers.has(publicKey)) {
      connection.end()
      return
    }

    const peer = new PeerInfo({
      topics: info.topics.map((topic) => {
        return encodeHex(topic)
      }),
      host: connection.rawStream.remoteAddress,
      port: connection.rawStream.remotePort,
      discoveryType: 'dht',
      identityPublicKey: publicKey,
      connection,
      dhtPeerInfo: info,
      status: 'connecting',
    })

    this.#peers.set(publicKey, peer)

    info.on('topic', (/** @type {TopicBuffer} */ topic) => {
      peer.addTopic(encodeHex(topic))
    })

    connection.on('connect', () => {
      this._updatePeerStatus(peer, 'connected')
    })

    connection.on('close', async () => {
      this._updatePeerStatus(peer, 'disconnecting')
      peer.destroy()
      this._updatePeerStatus(peer, 'disconnected')
      this.#peers.delete(publicKey)
    })

    this.emit('connection', connection, peer)

    for (const topic of this.#topics.values()) {
      if (this.dht && !this.dht.destroyed) {
        await this.dht.flush()
      }

      if (!topic.dht.destroyed) {
        try {
          // TODO: verify that this doesn't break anything
          await topic.dht.refresh({ server: false })
        } catch (error) {
          if (error.message === 'Stream was destroyed') {
            // TODO: for example, it seems like streams can be destroyed before the refresh happens resulting in an error
            return
          }
          console.error('DHT refresh error', error)
        }
      }
    }
  }

  /**
   * Return the configuration options object passed into the Hyperswarm instance
   *
   * @private
   * @param {Boolean|DhtOptions} options
   * @returns {DhtOptions}
   */
  _getDhtOptions(options) {
    const optionsObject = options && typeof options === 'object' ? options : {}
    return Object.assign(this.dhtOptions || {}, optionsObject)
  }

  /**
   * Join a topic to broadcast to and listen for connections from.
   *
   * @param {TopicBuffer} topicBuffer
   * @param {Object} options
   * @param {Boolean} [options.mdns] Boolean that determines whether to use mdns-sd-discovery to find peers. Uses mdns settings from constructor by default.
   * @param {Boolean|DhtOptions} [options.dht] Either a boolean that determines whether to use hyperswarm to find peers or an object that provides options that are passed to hyperswarm constructor. Uses dht settings from constructor by default.
   * @returns {Promise<Topic|undefined>}
   */
  async join(topicBuffer, options = {}) {
    const { mdns = this.dhtActive, dht = this.dhtActive } = options
    const mdnsActive = mdns || this.mdnsActive
    const dhtActive = dht === false ? !!dht : this.dhtActive
    const dhtOptions = this._getDhtOptions(dht)

    const topicHex = encodeHex(topicBuffer)

    if (dhtActive && !this.dht) {
      this.dht = new Hyperswarm(dhtOptions)
    }

    if (this.#topics.has(topicHex)) {
      return
    }

    const topic = new Topic({
      topicBuffer,
      mdns: mdnsActive ? new MdnsDiscovery() : undefined,
      dht:
        dhtActive && this.dht.join(topicBuffer, { server: true, client: true }),
    })

    this.#topics.set(topicHex, topic)

    this._updateTopicStatus(topic, {
      mdns: mdnsActive ? 'joining' : 'deactivated',
      dht: dhtActive ? 'joining' : 'deactivated',
    })

    /**
     * @type {import('@gravitysoftware/dnssd').ServiceIdentifier}
     */
    const serviceType = {
      name: '_mapeo',
      protocol: '_tcp',
      subtypes: [topic.base32String],
    }

    if (mdnsActive && this.port && this.host) {
      topic.mdns?.on('stopAnnouncing', () => {
        this._updateTopicStatus(topic, {
          mdns: 'closed',
        })
      })

      topic.mdns?.on('error', (/** @type {any} */ error) => {
        if (typeof error === 'function') {
          // TODO: ignore this because why would this happen?
        }
      })

      topic.mdns?.on(
        'service',
        (/** @type {import('@gravitysoftware/dnssd').Service} */ service) => {
          const { host, port, txt } = service

          const topicBuffer = decodeHex(txt.topic)
          const topicHexString = encodeHex(topicBuffer)
          let topic = this.#topics.get(topicHexString)

          if (!topic) {
            topic = new Topic({ topicBuffer })
            this.#topics.set(topic.hexString, topic)
          }

          if (txt.identity === this.identityPublicKey) {
            this._updateTopicStatus(topic, {
              mdns: 'joined',
            })

            return
          }

          if (this.#peers.has(txt.identity)) {
            const peer = this.#peers.get(txt.identity)
            peer?.update({ host, port })
            peer?.addTopic(topic.hexString)
          } else {
            const connection = this._connect({ host, port })

            const peer = new PeerInfo({
              topics: [topic.hexString],
              discoveryType: 'mdns',
              host,
              port,
              identityPublicKey: txt.identity,
              connection,
              status: 'connecting',
            })

            this.#peers.set(txt.identity, peer)

            connection.on('connect', () => {
              this._updatePeerStatus(peer, 'connected')
              this.emit('connection', connection, peer)
            })

            connection.on('close', async () => {
              this._updatePeerStatus(peer, 'disconnecting')
              peer.destroy()
              this._updatePeerStatus(peer, 'disconnected')
              this.#peers.delete(txt.identity)
            })

            connection.on('error', (/** @type {any} */ error) => {
              this._updatePeerStatus(peer, 'disconnecting')
              peer.destroy()
              this._updatePeerStatus(peer, 'disconnected')
              this.#peers.delete(txt.identity)
              console.error('mdns tcp connection error', error)
            })
          }
        }
      )

      topic.mdns?.on(
        'serviceDown',
        (/** @type {import('@gravitysoftware/dnssd').Service} */ service) => {
          const { txt } = service

          const topic = this.#topics.get(txt.topic)

          if (!topic) {
            return
          }

          const peer = this.#peers.get(txt.identity)

          if (
            (peer && !peer.topics) ||
            (peer &&
              peer.topics.length === 1 &&
              peer.topics.includes(txt.topic))
          ) {
            this._updatePeerStatus(peer, 'disconnecting')
            peer.destroy()
            this._updatePeerStatus(peer, 'disconnecting')

            this.#peers.delete(txt.identity)
          }
        }
      )

      topic.mdns?.announce(serviceType, {
        port: this.port,
        host: this.host,
        txt: {
          topic: topic.hexString,
          identity: this.identityPublicKey,
        },
      })

      topic.mdns?.lookup(serviceType)
    }

    if (dhtActive) {
      await this.dht.flush()
      await topic.dht.flushed()
      this._updateTopicStatus(topic, { dht: 'joined' })
    }

    return topic
  }

  /**
   * Return a list of connected peers discovered through the specified topic
   *
   * @param {TopicString} topic
   * @returns {PeerInfo[]}
   */
  getPeersByTopic(topic) {
    return this.peers.filter((peer) => {
      return peer.topics.includes(topic)
    })
  }

  /**
   * Create a connection object that is passed to other discovered peers
   *
   * @private
   * @param {Address} options
   * @returns {ConnectionStream}
   */
  _connect(options) {
    const { host, port } = options
    const stream = net.connect({
      host,
      port,
      allowHalfOpen: true,
    })

    const connection = new SecretStream(true, stream, {
      keyPair: this.#identityKeyPair,
    })

    return connection
  }

  /**
   * Leave a topic
   *
   * @param {Buffer} topicBuffer
   * @returns {Promise<void>}
   */
  async leave(topicBuffer) {
    const topic = this.#topics.get(encodeHex(topicBuffer))

    if (!topic) {
      return
    }

    this._updateTopicStatus(topic, {
      mdns: this.mdns ? 'leaving' : undefined,
      dht: this.dht ? 'leaving' : undefined,
    })

    if (this.dht) {
      await this.dht.leave(topicBuffer)

      this._updateTopicStatus(topic, {
        dht: 'closed',
      })
    }

    await topic.destroy()
    this.#topics.delete(topic.hexString)
  }

  /**
   * Disconnect from a connected peer
   *
   * @param {Buffer|String} identityPublicKey
   * @returns {Promise<void>}
   */
  async leavePeer(identityPublicKey) {
    if (Buffer.isBuffer(identityPublicKey)) {
      identityPublicKey = encodeHex(identityPublicKey)
    }

    const peer = this.#peers.get(identityPublicKey)

    if (!peer) {
      return
    }

    this._updatePeerStatus(peer, 'disconnecting')
    peer.destroy()
    this._updatePeerStatus(peer, 'disconnected')
    this.#peers.delete(identityPublicKey)
  }

  /**'
   * Destroy the discovery instance
   * @returns {Promise<void>}
   */
  async destroy() {
    for (const peer of this.#peers.values()) {
      this._updatePeerStatus(peer, 'disconnecting')
      peer.destroy()
      this._updatePeerStatus(peer, 'disconnected')
      this.#peers.delete(peer.identityPublicKey)
    }

    for (const topic of this.#topics.values()) {
      await topic.destroy()
      this.#topics.delete(topic.hexString)
    }

    this._closeServer()

    if (this.dht) {
      await this.dht.destroy()
    }
  }

  /**
   * Create a TCP server and returns information about the server's address
   *
   * @private
   * @typedef {Object} Address
   * @property {String} host
   * @property {Number} port
   *
   * @returns {Promise<Address>}
   */
  async _startServer() {
    await this.#tcp?.listen()
    const address = /** @type {net.AddressInfo} */ (this.#tcp?.address())

    return {
      host: address.address,
      port: address.port,
    }
  }

  /**
   * Close the TCP server
   *
   * @private
   * @returns {Promise<void>}
   */
  async _closeServer() {
    if (!this.#tcp) {
      return
    }

    return new Promise((resolve) => {
      this.#tcp?.close(() => {
        resolve()
      })
    })
  }

  /**
   * Update the connection state for a topic
   *
   * @private
   * @param {Topic} topic
   * @param {TopicStatus} status
   */
  _updateTopicStatus(topic, status) {
    topic.updateStatus(status)

    this.emit('topicStatus', {
      topic: topic.hexString,
      ...topic.status(),
    })
  }

  /**
   * Update the connection state for a peer
   *
   * @private
   * @param {PeerInfo} peer
   * @param {PeerStatus} status
   */
  _updatePeerStatus(peer, status) {
    peer.updateStatus(status)

    this.emit('peerStatus', {
      peer: peer,
      status: peer.status,
    })
  }
}

/**
 * @typedef {Object} PeerInfoEvents
 * @property {(close: void) => void} close
 * @property {(status: PeerStatus) => void} status
 *
 * @typedef {'connecting'|'connected'|'disconnecting'|'disconnected'} PeerStatus
 */

/**
 * @extends {TypedEmitter<PeerInfoEvents>}
 */
export class PeerInfo extends TypedEmitter {
  /**
   * @typedef {Set<Topic>}
   */
  #topics = new Set()

  /**
   * @typedef {Object} PeerInfoOptions
   * @property {IdentityPublicKeyString} identityPublicKey
   * @property {('dht'|'mdns')} discoveryType
   * @property {ConnectionStream} connection
   * @property {HyperswarmPeerInfo} [dhtPeerInfo]
   * @property {TopicString[]} [topics]
   * @property {string} [host]
   * @property {number} [port]
   * @property {PeerStatus} [status]
   *
   * @param {PeerInfoOptions} options
   */
  constructor(options) {
    super()
    const {
      connection,
      topics = [],
      host,
      port,
      discoveryType,
      identityPublicKey,
      dhtPeerInfo,
      status = 'disconnected',
    } = options

    this.addTopics(topics)
    this.connection = connection
    this.dhtPeerInfo = dhtPeerInfo
    this.host = host
    this.port = port
    this.discoveryType = discoveryType
    this.identityPublicKey = identityPublicKey
    this.status = status

    connection?.on('close', () => {
      this.emit('close')
    })
  }

  /**
   * Update connection info associated with a discovered peer
   *
   * @param {Object} options
   * @param {IdentityPublicKeyString} [options.identityPublicKey]
   * @param {('dht'|'mdns')} [options.discoveryType]
   * @param {ConnectionStream} [options.connection]
   * @param {HyperswarmPeerInfo} [options.dhtPeerInfo]
   * @param {TopicString[]} [options.topics]
   * @param {string} [options.host]
   * @param {number} [options.port]
   * @param {PeerStatus} [options.status]
   *
   * @returns {void}
   */
  update(options) {
    const {
      connection,
      topics = [],
      host,
      port,
      discoveryType,
      identityPublicKey,
      status,
    } = options

    if (topics && topics.length) {
      this.addTopics(topics)
    }

    if (connection) {
      this.connection = connection
    }

    if (host) {
      this.host = host
    }

    if (port) {
      this.port = port
    }

    if (discoveryType) {
      this.discoveryType = discoveryType
    }

    if (identityPublicKey) {
      this.identityPublicKey = identityPublicKey
    }

    if (status) {
      this.status = status
    }
  }

  /**
   * Add a topic to the list of topics associated with the peer
   *
   * @param {TopicString} topic
   * @returns {void}
   */
  addTopic(topic) {
    this.#topics.add(topic)
  }

  /**
   * Add a several topics to the list of topics associated with the peer
   *
   * @param {TopicString[]} topics
   * @returns {void}
   */
  addTopics(topics) {
    for (const topic of topics) {
      this.#topics.add(topic)
    }
  }

  /**
   * Remove a topic from the list of topics associated with the peer
   *
   * @param {TopicString} topic
   * @returns {void}
   */
  removeTopic(topic) {
    this.#topics.delete(topic)
  }

  /**
   * Get the list of topics associated with the peer
   *
   * @returns {TopicString[]}
   */
  get topics() {
    return Array.from(this.#topics.values())
  }

  /**
   * Update the connection status of the peer
   *
   * @param {PeerStatus} status
   * @returns {void}
   */
  updateStatus(status) {
    this.status = status
    this.emit('status', status)
  }

  /**
   * Return JSON-serializable information about the peer
   *
   * @typedef {Object} PeerInfoJson
   * @property {TopicString[]} topics
   * @property {IdentityPublicKeyString} identityPublicKey
   * @property {String} [host]
   * @property {Number} [port]
   * @returns {PeerInfoJson}
   */
  toJSON() {
    return {
      topics: this.topics,
      identityPublicKey: this.identityPublicKey,
      host: this.host,
      port: this.port,
    }
  }

  /**
   * Destroy the peer connection
   *
   * @returns {void}
   */
  destroy() {
    if (this.connection && !this.connection.destroying) {
      this.connection.end()
    }
  }
}

/**
 * @typedef TopicStatus
 * @property {TopicServiceStatus} [mdns]
 * @property {TopicServiceStatus} [dht]
 *
 * @typedef {Object} TopicEvents
 * @property {(status: TopicStatus) => void} status
 * @property {(close: void) => void} close
 *
 * @typedef {'closed'|'joining'|'joined'|'leaving'|'deactivated'} TopicServiceStatus
 */

/**
 * @extends {TypedEmitter<TopicEvents>}
 */
export class Topic extends TypedEmitter {
  /**
   * @param {Object} options
   * @param {TopicBuffer} options.topicBuffer
   * @param {TopicServiceStatus} [options.dhtStatus]
   * @param {TopicServiceStatus} [options.mdnsStatus]
   * @param {MdnsDiscovery} [options.mdns]
   * @param {Hyperswarm} [options.dht]
   */
  constructor(options) {
    super()

    const {
      topicBuffer,
      dhtStatus = 'closed',
      mdnsStatus = 'closed',
      mdns,
      dht,
    } = options

    this.topicBuffer = topicBuffer
    this.base32String = encodeBase32(topicBuffer)
    this.hexString = encodeHex(topicBuffer)
    this.mdns = mdns
    this.dht = dht

    /** @type {TopicServiceStatus} */
    this.dhtStatus = dht ? dhtStatus : 'deactivated'

    /** @type {TopicServiceStatus} */
    this.mdnsStatus = mdns ? mdnsStatus : 'deactivated'
  }

  /**
   * @returns {Required<TopicStatus>}
   */
  status() {
    return {
      dht: this.dhtStatus,
      mdns: this.mdnsStatus,
    }
  }

  /**
   * @param {Object} status
   * @param {TopicServiceStatus} [status.dht]
   * @param {TopicServiceStatus} [status.mdns]
   */
  updateStatus(status) {
    if (this.dht && status.dht) {
      this.dhtStatus = status.dht
    }

    if (this.mdns && status.mdns) {
      this.mdnsStatus = status.mdns
    }

    this.emit('status', {
      dht: this.dhtStatus,
      mdns: this.mdnsStatus,
    })
  }

  /**
   * @typedef {Object} TopicJson
   * @property {string} topic
   * @property {TopicServiceStatus} dhtStatus
   * @property {TopicServiceStatus} mdnsStatus
   * @returns {TopicJson}
   */
  toJSON() {
    return {
      topic: encodeHex(this.topicBuffer),
      dhtStatus: this.dhtStatus,
      mdnsStatus: this.mdnsStatus,
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.mdns && this.mdns instanceof MdnsDiscovery) {
      this.mdns?.destroy()
    }

    if (this.dht) {
      await this.dht.destroy()
    }
  }
}

/**
 * @param {Buffer} buffer
 * @returns {String}
 */
export function encodeBase32(buffer) {
  return base32.encode(buffer, { type: 'crockford' })
}

/**
 * @param {String} str
 * @returns {Buffer}
 */
export function decodeBase32(str) {
  return base32.decode(str, { type: 'crockford' })
}

/**
 * @param {Buffer} buffer
 * @returns {String}
 */
export function encodeHex(buffer) {
  return buffer.toString('hex')
}

/**
 * @param {String} str
 * @returns {Buffer}
 */
export function decodeHex(str) {
  return Buffer.from(str, 'hex')
}
