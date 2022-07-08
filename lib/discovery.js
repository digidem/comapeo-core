import net from 'net'

import { TypedEmitter } from 'tiny-typed-emitter'
import SecretStream from '@hyperswarm/secret-stream'
import Hyperswarm from 'hyperswarm'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import base32 from 'base32.js'

/**
 * @typedef {Object} DiscoveryEvents
 * @property {(connection: NoiseSecretStream, info: PeerInfo) => void} connection
 * @property {(status: { topic: TopicString, mdns: TopicServiceStatus, dht: TopicServiceStatus }) => void} status
 * @property {(error: Error) => void} error
 */

/**
 * @extends {TypedEmitter<DiscoveryEvents>}
 */
export class Discovery extends TypedEmitter {
  #identityKeyPair
  #topics = new Map()
  #peers = new Map()
  #tcp

  /**
   * @param {Object} options
   * @param {IdentityKeyPair} options.identityKeyPair
   * @param {Boolean|Object} options.mdns
   * @param {Boolean|Object} options.dht
   */
  constructor(options) {
    super()

    const { identityKeyPair, dht = true, mdns = true } = options

    this.#identityKeyPair = identityKeyPair

    if (mdns) {
      this.#tcp = net.createServer()
      this.mdns = mdns
    }

    if (dht) {
      this.dhtOptions = /** @type {DhtOptions} */ (
        dht && typeof dht === 'object' ? dht : {}
      )

      this.dhtOptions.keyPair = identityKeyPair
      this.dht = new Hyperswarm(this.dhtOptions)
    }
  }

  get identityPublicKey() {
    return this.#identityKeyPair.publicKey.toString('hex')
  }

  get topics() {
    return Array.from(this.#topics.values())
  }

  get peers() {
    return Array.from(this.#peers.values())
  }

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
   * @param {import('net').Socket} socket
   */
  _onMdnsConnection(socket) {
    const socketAddress = /** @type {import('net').AddressInfo} */ (
      socket.address()
    )

    const connection = new SecretStream(false, socket)

    connection.on('connect', () => {
      const remotePublicKey = connection.remotePublicKey.toString('hex')

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
        })

        this.#peers.set(remotePublicKey, peer)
        this.emit('connection', connection, peer)
      }
    })

    connection.on('close', async () => {
      const remotePublicKey = connection.remotePublicKey.toString('hex')
      const peer = this.#peers.get(remotePublicKey)

      if (peer) {
        peer.destroy()

        peer.on('close', () => {
          this.#peers.delete(remotePublicKey)
        })
      }
    })
  }

  /**
   * @param {ConnectionStream} connection
   * @param {HyperswarmPeerInfo} info
   */
  async _onDhtConnection(connection, info) {
    const publicKey = connection.remotePublicKey.toString('hex')
    let peer = this.#peers.get(publicKey)

    if (peer) {
      connection.end()
      return
    }

    peer = new PeerInfo({
      topics: info.topics.map((topic) => {
        return encodeHex(topic)
      }),
      host: connection.rawStream.remoteAddress,
      port: connection.rawStream.remotePort,
      discoveryType: 'dht',
      identityPublicKey: publicKey,
      connection,
      swarmInfo: info,
    })

    this.#peers.set(publicKey, peer)

    info.on('topic', (/** @type {TopicBuffer} */ topic) => {
      peer.addTopic(encodeHex(topic))
    })

    connection.on('close', async () => {
      await peer.destroy()
      peer.on('close', () => {
        this.#peers.delete(publicKey)
      })
    })

    connection.on('error', (/** @type {any} */ error) => {
      if (error.code === 'ECONNRESET') {
        // TODO: it seems like this ECONNRESET error is expected when a stream closes, but that also doesn't seem right
        return
      }

      console.error(error)
    })

    this.emit('connection', connection, peer)
    for (const topic of this.#topics.values()) {
      await this.dht.flush()
      if (!topic.dht.destroyed) {
        try {
          // TODO: verify that this doesn't break anything
          await topic.dht.refresh({ server: false })
        } catch (error) {
          if (error.message === 'Stream was destroyed') {
            // TODO: for example, it seems like streams can be destroyed before the refresh happens resulting in an error
            return
          }
          console.error(error)
        }
      }
    }
  }

  /**
   * @param {TopicBuffer} topicBuffer
   * @param {Object} options
   * @param {Boolean} [options.mdns]
   * @param {Boolean} [options.dht]
   */
  async join(topicBuffer, options = {}) {
    const mdnsActivated = options.mdns ? options.mdns : this.mdns && !!this.mdns
    const dhtActivated = options.dht ? options.dht : this.dht && !!this.dht

    const topicHex = encodeHex(topicBuffer)
    let topic = this.#topics.get(topicHex)

    if (topic) {
      return
    } else {
      topic = new Topic({
        topicBuffer,
        mdns: mdnsActivated && new MdnsDiscovery(),
        dht:
          dhtActivated &&
          this.dht.join(topicBuffer, { server: true, client: true }),
      })

      this.#topics.set(topicHex, topic)
    }

    this._updateStatus(topic, {
      mdns: mdnsActivated ? 'joining' : 'deactivated',
      dht: dhtActivated ? 'joining' : 'deactivated',
    })

    /**
     * @type {import('@gravitysoftware/dnssd').ServiceIdentifier}
     */
    const serviceType = {
      name: '_mapeo',
      protocol: '_tcp',
      subtypes: [topic.base32String],
    }

    if (mdnsActivated && this.port && this.host) {
      topic.mdns?.on('stopAnnouncing', () => {
        this._updateStatus(topic, {
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

          const topicBuffer = decodeBase32(txt.topic)
          const topicHexString = encodeHex(topicBuffer)
          let topic = this.#topics.get(topicHexString)

          if (!topic) {
            topic = new Topic({ topicBuffer: txt.topic })
            this.#topics.set(topic.hexString, topic)
          }

          if (txt.identity === this.identityPublicKey) {
            this._updateStatus(topic, {
              mdns: 'joined',
            })

            return
          }

          let peer = this.#peers.get(txt.identity)

          if (peer) {
            peer.update({
              host,
              port,
            })
            peer.addTopic(topic.hexString)
          } else {
            const connection = this._connect({ host, port })

            connection.on('connect', () => {
              this.emit('connection', connection, peer)
            })

            connection.on('close', async () => {
              peer.destroy()
              peer.on('close', () => {
                this.#peers.delete(txt.identity)
              })
            })

            connection.on('error', (/** @type {any} */ error) => {
              console.error('mdns tcp connection error', error)
            })

            peer = new PeerInfo({
              topics: [topic.hexString],
              discoveryType: 'mdns',
              host,
              port,
              identityPublicKey: txt.identity,
              connection,
            })
          }

          this.#peers.set(txt.identity, peer)
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
            peer &&
            peer.topics.length === 1 &&
            peer.topics.includes(txt.topic)
          ) {
            peer.destroy()
            peer.on('close', () => {
              this.#peers.delete(txt.identity)
            })
          }
        }
      )

      topic.mdns?.announce(serviceType, {
        port: this.port,
        host: this.host,
        txt: {
          topic: topic.base32String,
          identity: this.identityPublicKey,
        },
      })

      topic.mdns?.lookup(serviceType)
    }

    if (dhtActivated) {
      await this.dht.flush()
      await topic.dht.flushed()
      this._updateStatus(topic, { dht: 'joined' })
    }

    return topic
  }

  /**
   * @param {TopicString} topic
   * @returns {PeerInfo[]}
   */
  getPeersByTopic(topic) {
    return this.peers.filter((peer) => {
      return peer.topics.include(topic)
    })
  }

  /**
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
   * @param {Buffer} topicBuffer
   */
  async leave(topicBuffer) {
    const topic = this.#topics.get(encodeHex(topicBuffer))

    if (!topic) {
      return
    }

    this._updateStatus(topic, {
      mdns: this.mdns ? 'leaving' : undefined,
      dht: this.dht ? 'leaving' : undefined,
    })

    if (this.dht) {
      await this.dht.leave(topicBuffer)

      this._updateStatus(topic, {
        dht: 'closed',
      })
    }

    await topic.destroy()
    this.#topics.delete(topic.hexString)
  }

  /**
   * @param {Buffer|String} identityPublicKey
   */
  async leavePeer(identityPublicKey) {
    const peer = this.#peers.get(identityPublicKey)
    peer.destroy()
    peer.on('close', () => {
      this.#peers.delete(identityPublicKey)
    })
  }

  async destroy() {
    for (const peer of this.#peers.values()) {
      peer.destroy()
      peer.on('close', () => {
        this.#peers.delete(peer.identityPublicKey)
      })
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
   * @private
   * @param {Topic} topic
   * @param {TopicStatus} status
   */
  _updateStatus(topic, status) {
    topic.updateStatus(status)

    this.emit('status', {
      topic: topic.hexString,
      ...topic.status(),
    })
  }
}

/**
 * @typedef {Object} PeerInfoEvents
 * @property {(close: void) => void} close
 *
 * @typedef {'closed'|'joining'|'joined'|'leaving'|'deactivated'} TopicServiceStatus
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
   * @property {HyperswarmPeerInfo} [swarmInfo]
   * @property {TopicString[]} [topics]
   * @property {string} [host]
   * @property {number} [port]
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
      swarmInfo,
    } = options

    this.addTopics(topics)
    this.connection = connection
    this.swarmInfo = swarmInfo
    this.host = host
    this.port = port
    this.discoveryType = discoveryType
    this.identityPublicKey = identityPublicKey

    connection?.on('close', () => {
      this.emit('close')
    })
  }

  /**
   * @param {PeerInfoOptions} options
   */
  update(options) {
    const {
      connection,
      topics = [],
      host,
      port,
      discoveryType,
      identityPublicKey,
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
  }

  /**
   * @param {TopicString} topic
   */
  addTopic(topic) {
    this.#topics.add(topic)
  }

  /**
   * @param {TopicString[]} topics
   */
  addTopics(topics) {
    for (const topic of topics) {
      this.#topics.add(topic)
    }
  }

  /**
   * @param {TopicString} topic
   */
  removeTopic(topic) {
    this.#topics.delete(topic)
  }

  /**
   * @returns {TopicString[]}
   */
  get topics() {
    return Array.from(this.#topics.values())
  }

  /**
   * @typedef {Object} TopicJson
   * @property {TopicString[]} topics
   * @property {IdentityPublicKeyString} identityPublicKey
   * @property {String} [host]
   * @property {Number} [port]
   * @returns {TopicJson}
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
   */
  destroy() {
    this.connection?.end()
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

  toJSON() {
    return {
      topic: encodeHex(this.topicBuffer),
      dhtStatus: this.dhtStatus,
      mdnsStatus: this.mdnsStatus,
    }
  }

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
