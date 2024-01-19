import { promisify } from 'util'
import StateMachine from 'start-stop-state-machine'

/**
 * @typedef {Object} StartOpts
 *
 * @property {string} [host]
 * @property {number} [port]
 */

// Class to properly manage the server lifecycle of a Fastify instance
export class FastifyController {
  #fastify
  #fastifyStarted
  #host
  #port
  #serverState

  /**
   * @param {Object} opts
   * @param {import('fastify').FastifyInstance} opts.fastify
   */
  constructor({ fastify }) {
    this.#fastifyStarted = false
    this.#host = '127.0.0.1'
    this.#port = 0

    this.#fastify = fastify

    this.#serverState = new StateMachine({
      start: this.#startServer.bind(this),
      stop: this.#stopServer.bind(this),
    })
  }

  /**
   * @param {StartOpts} [opts]
   */
  async #startServer({ host = '127.0.0.1', port = 0 } = {}) {
    this.#host = host
    this.#port = port

    if (!this.#fastifyStarted) {
      await this.#fastify.listen({ host: this.#host, port: this.#port })
      this.#fastifyStarted = true
      return
    }

    const { server } = this.#fastify

    await new Promise((res, rej) => {
      server.listen.call(server, { port: this.#port, host: this.#host })

      server.once('listening', onListening)
      server.once('error', onError)

      function onListening() {
        server.removeListener('error', onError)
        res(null)
      }

      /**
       * @param {Error} err
       */
      function onError(err) {
        server.removeListener('listening', onListening)
        rej(err)
      }
    })
  }

  async #stopServer() {
    const { server } = this.#fastify
    await promisify(server.close.bind(server))()
  }

  /**
   * @param {StartOpts} [opts]
   */
  async start(opts) {
    await this.#serverState.start(opts)
  }

  async started() {
    return this.#serverState.started()
  }

  async stop() {
    await this.#serverState.stop()
  }
}
