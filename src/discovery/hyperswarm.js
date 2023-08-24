import { TypedEmitter } from 'tiny-typed-emitter'
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import createTestnet from '@hyperswarm/testnet'

export class HyperswarmDiscovery extends TypedEmitter {
  #hyperswarm
  /** @type {Buffer} */
  #projectDiscoveryId
  /**
   * @param {Buffer} projectDiscoveryId
   */
  constructor(projectDiscoveryId) {
    super()
    this.#projectDiscoveryId = projectDiscoveryId
  }
  /** @returns {Promise<void>} */
  async start() {
    if (!this.#hyperswarm) {
      const testnet = await createTestnet(10)
      this.#hyperswarm = new Hyperswarm({ dht: testnet.nodes[0] })
      const topic = crypto.discoveryKey(this.#projectDiscoveryId)
      const swarm = this.#hyperswarm.join(topic, {
        server: true,
        client: true,
      })
      this.#hyperswarm.on('connection', (noiseStream, peerInfo) => {
        this.emit('connection', noiseStream, peerInfo)
        noiseStream.on('error', () => {})
      })
      await this.#hyperswarm.flush()
      await swarm.flushed()
    }
  }

  async stop() {
    const hyperswarm = this.#hyperswarm
    this.#hyperswarm = null
    hyperswarm.removeAllListeners('connection')
    await hyperswarm.destroy()
  }
}
