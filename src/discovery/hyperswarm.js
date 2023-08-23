import { TypedEmitter } from 'tiny-typed-emitter'
import Hyperswarm from 'hyperswarm'

export class HyperSwarmDiscovery extends TypedEmitter {
  /** @type {String} */
  #projectDiscoveryId
  #hyperswarm
  constructor() {
    super()
  }
  /**
   * @param {String} projectDiscoveryId
   * @returns {Promise<void>}
   */
  async join(projectDiscoveryId) {
    this.#projectDiscoveryId = projectDiscoveryId
    if (!this.#hyperswarm) {
      this.#hyperswarm = new Hyperswarm()
      const topic = Buffer.alloc(32).fill(this.#projectDiscoveryId)
      this.#hyperswarm.join(topic, { server: false, client: true })
      await this.#hyperswarm.flush()
      this.#hyperswarm.on('connection', (peerInfo) => {
        this.emit('connection', peerInfo)
      })
    }
  }

  leave() {}

  async stop() {
    const hyperswarm = this.#hyperswarm
    this.#hyperswarm = null
    this.removeAllListeners('connection')
    await hyperswarm.destroy()
  }
}
