import { WebSocketServer } from 'ws'
import { assert } from '../utils.js'
/** @typedef {import('../mapeo-manager.js').MapeoManager} MapeoManager */

/**
 * TODO: Is there a better name for this?
 *
 * Control a `MapeoManager` with WebSockets.
 */
export default class WebsocketManagerWrapper {
  #manager
  /** @type {null | WebSocketServer} */
  #websocketServer = null

  /**
   * @param {MapeoManager} manager
   */
  constructor(manager) {
    this.#manager = manager
  }

  /**
   * @param {object} options
   * @param {number} options.port
   * @returns {Promise<void>}
   */
  listen({ port }) {
    return new Promise((resolve) => {
      assert(!this.#websocketServer, 'Already listening')

      this.#websocketServer = new WebSocketServer({ port })

      this.#websocketServer.on('connection', (websocket) => {
        this.#manager.connectWebsocketPeer(websocket, false)
      })

      this.#websocketServer.on('error', (err) => {
        // TODO: Handle this error
        console.error('@@@@', 'websocket server error', err)
      })

      this.#websocketServer.on('listening', () => {
        resolve()
      })
    })
  }

  /**
   * Permanently close the websocket server.
   * @returns {Promise<void>}
   */
  close() {
    return new Promise((resolve, reject) => {
      if (!this.#websocketServer) {
        reject(new Error('Nothing to close'))
        return
      }
      this.#websocketServer.close((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}
