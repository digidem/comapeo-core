import net from 'net'

import { TypedEmitter } from 'tiny-typed-emitter'
import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hyperswarm from 'hyperswarm'
import { MdnsDiscovery } from 'multicast-service-discovery'
import base32 from 'base32.js'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: NoiseSecretStream<RawConnectionStream>, info: PeerInfo) => void} connection
 * @property {(topicStatus: { topic: TopicString, mdns: TopicServiceStatus, dht: TopicServiceStatus }) => void} topicStatus
 * @property {(peerStatus: { status: String, peer: PeerInfo }) => void} peerStatus
 * @property {(error: Error) => void} error
 */

/**
 * The `Discovery` class provides an abstraction layer that allows peer discovery using either a distributed hash table (DHT) or Multicast DNS (mDNS).
 * It extends Node's native Event Emitter and can emit the following events:
 *
 * - `connection`: Emitted when a connection with another peer is established. Callback accepts two arguments: `connection` and `info`.
 * - `topicStatus`: Emitted when the connection status for a topic is updated. Callback accepts one argument: `topicStatus`.
 * - `peerStatus`: Emitted when a peer status is updated. Callback accepts one argument: `peerStatus`.
 * - `error`: Emitted when an error occurs. Callback accepts one argument: `error`.
 *
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
   *
   * @example Creating the discovery instance
   *
   * ```js
   * import { KeyManager } from '@mapeo/crypto'
   *
   * // Create the discovery instance
   * const discover = new Discovery({
   *  identityKeyPair: new KeyManager(
   *    KeyManager.generateIdentityKey()
   *  ).getIdentityKeypair(),
   *  mdns: true,
   *  dht: true,
   * })
   * ```
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
   *
   * @example
   *
   * ```js
   * import { KeyManager } from '@mapeo/crypto'
   *
   * // Create discovery instance
   * const discover = new Discovery({
   *  identityKeyPair: new KeyManager(
   *    KeyManager.generateIdentityKey()
   *  ).getIdentityKeypair(),
   * })
   *
   * console.log(discover.identityPublicKey) // Some hex-encoded string
   * ```
   */
  get identityPublicKey() {
    return encodeHex(this.#identityKeyPair.publicKey)
  }

  /**
   * Return the list of subscribed topics
   *
   * @returns {Topic[]}
   *
   * @example
   *
   * ```js
   * import { KeyManager } from '@mapeo/crypto'
   *
   * const discover = new Discover({
   *  identityKeyPair: new KeyManager(
   *    KeyManager.generateIdentityKey()
   *  ).getIdentityKeypair(),
   * })
   *
   * await discover.ready()
   *
   * // Create topic name (as a 32 byte buffer) to be joined (see footnote 1)
   * const topic = Buffer.alloc(32).fill('topics-example')
   *
   * discover.join(topic)
   *
   * console.log(discover.topics) // prints out `['746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069']`
   * ```
   *
   * Footnotes:
   *
   * 1. To create a secure topic name, refer to `KeyManager`, `createIdentityKeys`, and `getHypercoreKeypair` in the [`@mapeo/crypto`](https://github.com/digidem/mapeo-crypto) docs.
   */
  get topics() {
    return Array.from(this.#topics.values())
  }

  /**
   * Returns the list of peers that have been connected to
   *
   * @returns {PeerInfo[]}
   *
   * @example
   *
   * ```js
   * // Create identity keypairs `identityKeyPair1` and `identityKeyPair2`... (see footnote 1)
   *
   * // Create discovery instances
   * const discover1 = new Discovery({
   *  identityKeyPair: identityKeyPair1,
   *  mdns: true,
   *  dht: false,
   * })
   *
   * const discover2 = new Discovery({
   *  identityKeyPair: identityKeypair2,
   *  mdns: true,
   *  dht: false,
   * })
   *
   * // Bootstrap discovery instances
   * await discover1.ready()
   * await discover2.ready()
   *
   * console.log(discover2.peers) // Prints `[]`
   *
   * // Add event listener for when a new connection is made
   * discover2.once('connection', (_connection, peer) => {
   *  console.log(discover2.peers) // Prints `[Peer]`, where `Peer` has peer info for `identity1`
   *  console.log(discover2.peers[0].identityPublicKey === peer.identityPublicKey) // Prints `true`
   * })
   *
   * // Create a shared topic name (see footnote 2)
   * const topic = Buffer.alloc(32).fill('peers-example')
   *
   * // Tell discovery instances to join the same topic
   * await discover1.join(topic, { dht: false })
   * await discover2.join(topic, { dht: false })
   * ```
   *
   * Footnotes:
   *
   * 1. To create an identity keypair, refer to `KeyManager`, `generateRootKey` and `getIdentityKeypair` in the [`@mapeo/crypto`](https://github.codigidem/mapeo-crypto) docs.
   *
   * 2. To create a secure topic name, refer to `KeyManager`, `createIdentityKeys`, and `getHypercoreKeypair` in the [`@mapeo/crypto`](https://github.codigidem/mapeo-crypto) docs.
   */
  get peers() {
    return Array.from(this.#peers.values())
  }

  /**
   * Set up listeners for connections
   *
   * @returns {Promise<void>}
   *
   * @example
   *
   * ```js
   * import { KeyManager } from '@mapeo/crypto'
   *
   * // Create discovery instance
   * const discover = new Discover({
   *  identityKeyPair: new KeyManager(
   *    KeyManager.generateIdentityKey()
   *  ).getIdentityKeypair(),
   * })
   *
   * // Wait for base listeners to initialize
   * await discover.ready()
   *
   * // Add any other listeners on discovery instance...
   * ```
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

    const connection = new NoiseSecretStream(false, socket, {
      keyPair: this.#identityKeyPair,
    })

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
   * @param {NoiseSecretStream<RawDhtConnectionStream>} connection
   * @param {import('hyperswarm').PeerInfo} info
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
   * @param {Boolean} [options.mdns] Boolean that determines whether to use multicast-service-discovery to find peers. Uses mdns settings from constructor by default.
   * @param {Boolean|DhtOptions} [options.dht] Either a boolean that determines whether to use hyperswarm to find peers or an object that provides options that are passed to hyperswarm constructor. Uses dht settings from constructor by default.
   * @returns {Promise<Topic|undefined>}
   *
   * @example Basic usage
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('join-example')
   * await discover.join(topic, { mdns: true, dht: true })
   * ```
   *
   * @example Providing specific DHT options
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('join-example')
   *
   * await discover.join(topic, {
   *  // Pass in specific Hyperswarm DHT options (see footnote 1)
   *  dht: {
   *    // Options go here...
   *  },
   * })
   * ```
   *
   * Footnotes:
   *
   * 1. Refer to docs for [`hyperswarm`](https://github.com/hyperswarm/hyperswarm).
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
        dhtActive && this.dht
          ? this.dht.join(topicBuffer, { server: true, client: true })
          : undefined,
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
        (
          /** @type {import('multicast-service-discovery').Service} */ service
        ) => {
          const { addresses, port, txt } = service
          const host =
            (addresses && addresses.length && addresses[0]) || service.host

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

    if (dhtActive && this.dht && topic.dht) {
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
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('getPeersByTopic-example')
   *
   * discover.on('connection', (connection, peer) => {
   *  // The topic name is most likely represented as a hex-encoded string value
   *  const topicHexString = topic.toString('hex')
   *  console.log(discovery.getPeersByTopic(topicHexString)) // Prints `[Peer, ...]` with each `peer` that has been connected to
   * })
   *
   * await discover.ready()
   * await discover.join(topic)
   * ```
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
   * @returns {NoiseSecretStream<net.Socket>}
   */
  _connect(options) {
    const { host, port } = options
    const stream = net.connect({
      host,
      port,
      allowHalfOpen: true,
    })

    const connection = new NoiseSecretStream(true, stream, {
      keyPair: this.#identityKeyPair,
    })

    return connection
  }

  /**
   * Leave a topic
   *
   * @param {Buffer} topicBuffer
   * @returns {Promise<void>}
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('leave-example')
   *
   * await discover.join(topic)
   *
   * // The discovery instance will no longer receive connections from
   * // or connect to this topic after this call
   * await discover.leave(topic)
   * ```
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
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('leavePeer-example')
   *
   * discover.on('connection', (connection, peer) => {
   *  console.log(discover.peers) // Prints `[Peer]` with newly connected `peer`
   *
   *  setTimeout(() => {
   *    discover.leavePeer(peer.identityPublicKey).then(() => {
   *      console.log(discover.peers) // Prints `[]`
   *    })
   *  }, 3000)
   * })
   *
   * await discover.ready()
   * await discover.join(topic)
   * ```
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
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('destroy-example')
   *
   * await discover.ready()
   * await discover.join(topic)
   *
   * setTimeout(() => {
   *  console.log("Destroying discover instance...")
   *
   *  discover.destroy().then(() => {
   *    console.log("Discover instance destroyed")
   *  })
   * }, 1000)
   * ```
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
      peer,
      status: peer.status,
    })
  }
}

/**
 * @typedef {Object} PeerInfoEvents
 * @property {(status: PeerStatus) => void} status
 * @property {(close: void) => void} close
 *
 * @typedef {'connecting'|'connected'|'disconnecting'|'disconnected'} PeerStatus
 */

/**
 * The PeerInfo class provides an abstraction that represents a discovered peer.
 * It extends Node's native Event Emitter and can emit the following events:
 *
 * - `status`: Emitted when the connection status for the peer is updated. Callback accepts one argument: `status`.
 * - `close`: Emitted when the connection to the peer is closed. Callback accepts no arguments.
 *
 * @extends {TypedEmitter<PeerInfoEvents>}
 */
export class PeerInfo extends TypedEmitter {
  /** @type {Set<TopicString>} */
  #topics = new Set()

  /**
   * @typedef {Object} PeerInfoOptions
   * @property {IdentityPublicKeyString} identityPublicKey
   * @property {('dht'|'mdns')} discoveryType
   * @property {NoiseSecretStream<RawConnectionStream>} connection
   * @property {import('hyperswarm').PeerInfo} [dhtPeerInfo]
   * @property {TopicString[]} [topics]
   * @property {string} [host]
   * @property {number} [port]
   * @property {PeerStatus} [status]
   *
   * @param {PeerInfoOptions} options
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('my-topic').toString('hex')
   * const pubKey = Buffer.alloc(32).fill('my-public-key').toString('hex')
   *
   * const peer = new PeerInfo({
   *  topics: [topic],
   *  host: 'some.address.local.lan',
   *  port: 12345,
   *  discoveryType: 'mdns',
   *  identityPublicKey: pubKey,
   *  status: 'disconnected',
   * })
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
   * @param {NoiseSecretStream<RawConnectionStream>} [options.connection]
   * @param {import('hyperswarm').PeerInfo} [options.dhtPeerInfo]
   * @param {TopicString[]} [options.topics]
   * @param {string} [options.host]
   * @param {number} [options.port]
   * @param {PeerStatus} [options.status]
   *
   * @returns {void}
   *
   * @example
   *
   * ```js
   * const peer = new PeerInfo({
   *  host: 'some.address.lan.local',
   *  port: 12345,
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(peer.host) // Prints `'some.address.lan.local'`
   * console.log(peer.port) // Prints `12345`
   *
   * peer.update({ host: 'another.address.lan.local', port: 54321 })
   *
   * console.log(peer.host) // Prints `'another.address.lan.local'`
   * console.log(peer.port) // Prints `54321`
   * ```
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
   *
   * @example
   *
   * ```js
   * const peer = new PeerInfo({
   *  topics: [],
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * const topic = Buffer.alloc(32).fill('addTopic-example').toString('hex') // '616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65'
   *
   * peer.addTopic(topic)
   *
   * console.log(peer.topics) // Prints `['616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65']`
   *
   * // Adding the same topic again is idempotent
   * peer.addTopic(topic)
   *
   * console.log(peer.topics) // Still prints `['616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65']`
   * ```
   */
  addTopic(topic) {
    this.#topics.add(topic)
  }

  /**
   * Add a several topics to the list of topics associated with the peer
   *
   * @param {TopicString[]} topics
   * @returns {void}
   *
   * @example
   *
   * ```js
   * const peer = new PeerInfo({
   *  topics: [],
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * const topicFoo = Buffer.alloc(32).fill('foo').toString('hex') // '666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f'
   * const topicBar = Buffer.alloc(32).fill('bar').toString('hex') // '6261726261726261726261726261726261726261726261726261726261726261'
   *
   * peer.addTopics([topicFoo, topicBar])
   *
   * console.log(peer.topics) // Prints `['666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f', '6261726261726261726261726261726261726261726261726261726261726261']`
   *
   * // Adding the same topic(s) again is idempotent
   * peer.addTopics([topicBar, topicFoo])
   *
   * console.log(peer.topics) // Still prints `['666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f', '6261726261726261726261726261726261726261726261726261726261726261']`
   * ```
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
   *
   * @example
   *
   * ```js
   * const topic = Buffer.alloc(32).fill('removeTopic-example').toString('hex') // '72656d6f7665546f7069632d6578616d706c6572656d6f7665546f7069632d65'
   *
   * const peer = new PeerInfo({
   *  topics: [topic],
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(peer.topics) // Prints `['72656d6f7665546f7069632d6578616d706c6572656d6f7665546f7069632d65']`
   *
   * peer.removeTopic(topic)
   *
   * console.log(peer.topics) // Prints `[]`
   * ```
   */
  removeTopic(topic) {
    this.#topics.delete(topic)
  }

  /**
   * Get the list of topics associated with the peer
   *
   * @returns {TopicString[]}
   *
   * @example
   *
   * ```js
   * const peer = new PeerInfo({
   *  topics: [],
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(peer.topics) // Prints `[]`
   *
   * const topic = Buffer.alloc(32).fill('topics-example').toString('hex') // '746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069'
   *
   * peer.addTopic(topic)
   *
   * console.log(peer.topics) // Prints `['746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069']`
   * ```
   */
  get topics() {
    return Array.from(this.#topics.values())
  }

  /**
   * Update the connection status of the peer
   *
   * @param {PeerStatus} status
   * @returns {void}
   *
   * @example Basic usage
   *
   * ```js
   * const peer = new PeerInfo({
   *  status: 'connecting',
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(peer.status) // Prints `'connecting'`
   *
   * peer.updateStatus('connected')
   *
   * console.log(peer.status) // Prints `'connected'`
   * ```
   *
   * @example Listening for status changes using the 'status' event
   *
   * ```js
   * const peer = new PeerInfo({
   *  status: 'connecting',
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * // Add an event listener on the peer to react to status changes
   * peer.on('status', console.log)
   *
   * // Console will print `'connected'` after this call
   * peer.updateStatus('connected')
   * ```
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
   *
   * @example
   *
   * ```js
   * const pubKey = Buffer.alloc(32).fill('my-public-key').toString('hex') // '6d792d7075626c69632d6b65796d792d7075626c69632d6b65796d792d707562'
   * const topic = Buffer.alloc(32).fill('toJSON-example').toString('hex') // '746f4a534f4e2d6578616d706c65746f4a534f4e2d6578616d706c65746f4a53'
   *
   * const peer = new PeerInfo({
   *  identityPublicKey: pubKey,
   *  topics: [topic],
   *  host: 'some.address.lan.local',
   *  port: 12345,
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(peer.toJSON()) // Prints { topics: [ '746f4a534f4e2d6578616d706c65746f4a534f4e2d6578616d706c65746f4a53' ], identityPublicKey: '6d792d7075626c69632d6b65796d792d7075626c69632d6b65796d792d707562', host: 'some.address.lan.local', port: 12345 }
   * ```
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
   *
   * @example
   *
   * ```js
   * const peer = new PeerInfo({
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * // Add event listener for when the peer is destroyed
   * peer.on('close', () => {
   *  console.log("connection for peer destroyed")
   * })
   *
   * peer.destroy()
   * ```
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
 * The `Topic` class provides an abstraction represents a discovery topic.
 * It extends Node's native Event Emitter and can emit the following events:
 *
 * - `status`: Emitted when the connection status for the topic is updated. Callback accepts one argument: `status`.
 * - `close`: Emitted when the connection for the topic is closed. Callback accepts no arguments.
 *
 * @extends {TypedEmitter<TopicEvents>}
 */
export class Topic extends TypedEmitter {
  /**
   * @param {Object} options
   * @param {TopicBuffer} options.topicBuffer
   * @param {TopicServiceStatus} [options.dhtStatus]
   * @param {TopicServiceStatus} [options.mdnsStatus]
   * @param {MdnsDiscovery} [options.mdns]
   * @param {import('hyperswarm').PeerDiscoverySession} [options.dht]
   *
   * @example
   *
   * ```js
   * const topicBuffer = Buffer.alloc(32).fill('my-topic')
   *
   * const topic = new Topic({
   *  topicBuffer,
   *  dhtStatus: 'joining',
   *  mdnsStatus: 'joining',
   *  // Pass a mDNS service discovery instance (see footnote 1)
   *  mdns: new MdnsDiscovery(),
   *  // Pass a Hyperswarm discovery instance (see footnote 2)
   *  dht: new Hyperswarm().join(topicBuffer),
   * })
   * ```
   *
   * Footnotes:
   *
   * 1. Refer to docs for [`mdns-sd-discovery`](https://github.com/digidem/multicast-service-discovery)
   *
   * 2. Refer to docs for [`hyperswarm`](https://github.com/hyperswarm/hyperswarm)
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
   * Return the connection statuses for the topic
   *
   * @returns {Required<TopicStatus>}
   *
   * @example
   *
   * ```js
   * const topic = new Topic({
   *  dhtStatus: 'joined',
   *  mdnsStatus: 'closed',
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`
   * ```
   */
  status() {
    return {
      dht: this.dhtStatus,
      mdns: this.mdnsStatus,
    }
  }

  /**
   * Update the connection status for the topic
   *
   * @param {Object} status
   * @param {TopicServiceStatus} [status.dht]
   * @param {TopicServiceStatus} [status.mdns]
   *
   * @returns {void}
   *
   * @example Basic usage
   *
   * ```js
   * const topicBuffer = Buffer.alloc(32).fill('updateStatus-example')
   *
   * // Updates to the statuses are only possible if `mdns` or `dht` are specified.
   * // Otherwise  their respective statuses will always be `'deactivated'`.
   * const topic = new Topic({
   *  topicBuffer,
   *  dhtStatus: 'joined',
   *  mdnsStatus: 'closed',
   *  mdns: new MdnsDiscovery(),
   *  dht: new Hyperswarm().join(topicBuffer),
   * })
   *
   * console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`
   *
   * topic.updateStatus({
   *  dht: 'leaving',
   *  mdns: 'joining',
   * })
   *
   * console.log(topic.status()) // Prints `{ dht: 'leaving', mdns: 'joining' }`
   * ```
   *
   * @example Listening to status changes using the 'status' event
   *
   * ```js
   * const topicBuffer = Buffer.alloc(32).fill('updateStatus-example')
   *
   * // Updates to the statuses are only possible if `mdns` or `dht` are specified.
   * // Otherwise  their respective statuses will always be `'deactivated'`.
   * const topic = new Topic({
   *  topicBuffer,
   *  dhtStatus: 'joined',
   *  mdnsStatus: 'closed',
   *  mdns: new MdnsDiscovery(),
   *  dht: new Hyperswarm().join(topicBuffer),
   * })
   *
   * console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`
   *
   * topic.on('status', console.log)
   *
   * // Console will print `{ dht: 'leaving', mdns: 'joining' }` after this call
   * topic.updateStatus({
   *  dht: 'leaving',
   *  mdns: 'joining',
   * })
   * ```
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
   * Return JSON-serializable information about the topic
   *
   * @typedef {Object} TopicJson
   * @property {string} topic
   * @property {TopicServiceStatus} dhtStatus
   * @property {TopicServiceStatus} mdnsStatus
   * @returns {TopicJson}
   *
   * @example
   *
   * ```js
   * const topicBuffer = Buffer.alloc(32).fill('toJSON-example')
   *
   * const topic = new Topic({
   *  topicBuffer,
   *  dhtStatus: 'joined',
   *  mdnsStatus: 'closed',
   *  mdns: new MdnsDiscovery(),
   *  dht: new Hyperswarm().join(topicBuffer),
   * })
   *
   * console.log(topic.toJSON()) // Prints `{ topic: '746f4a534f4e2d6578616d706c65746f4a534f4e2d6578616d706c65746f4a53', dhtStatus: 'joined', mdnsStatus: 'closed' }`
   * ```
   */
  toJSON() {
    return {
      topic: encodeHex(this.topicBuffer),
      dhtStatus: this.dhtStatus,
      mdnsStatus: this.mdnsStatus,
    }
  }

  /**
   * Destroy the topic
   *
   * @returns {Promise<void>}
   *
   * @example
   *
   * ```js
   * const topic = new Topic({
   *  // For the sake of brevity, specify the rest of the contructor options here...
   * })
   *
   * setTimeout(() => {
   *  console.log("Destroying topic instance...")
   *
   *  topic.destroy().then(() => {
   *    console.log("Topic instance destroyed")
   *  })
   * }, 1000)
   * ```
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
