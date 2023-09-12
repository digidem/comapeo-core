// @ts-check
import { TypedEmitter } from 'tiny-typed-emitter'

/**
 * @typedef {Object} Events
 * @property {(message: any) => void} message
 */

/**
 * @extends {TypedEmitter<Events>}
 */
export class SubChannel extends TypedEmitter {
  #id
  #messagePort

  /**
   * @param {import('rpc-reflector/server.js').MessagePortLike} messagePort Parent channel to add namespace to
   * @param {string} id ID for the subchannel
   */
  constructor(messagePort, id) {
    super()

    this.#id = id
    this.#messagePort = messagePort

    // Listen to all messages on the shared channel but only handle the relevant ones
    this.#messagePort.on('message', ({ id, message }) => {
      if (this.#id !== id) return
      this.emit('message', message)
    })
  }

  /**
   * Send messages with the subchannel's ID
   * @param {any} message
   */
  postMessage(message) {
    this.#messagePort.postMessage({ id: this.#id, message })
  }
}
