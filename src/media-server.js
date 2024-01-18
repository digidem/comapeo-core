import { once } from 'events'
import { promisify } from 'util'
import Fastify from 'fastify'
import pTimeout from 'p-timeout'
import StateMachine from 'start-stop-state-machine'

export const BLOBS_PREFIX = 'blobs'
export const ICONS_PREFIX = 'icons'

export const kFastify = Symbol('fastify')

/**
 * @typedef {Object} StartOpts
 *
 * @property {string} [host]
 * @property {number} [port]
 */

export class MediaServer {
  #fastify
  #fastifyStarted
  #host
  #port
  #serverState

  /**
   * @param {Object} params
   * @param {import('fastify').FastifyServerOptions['logger']} [params.logger]
   */
  constructor({ logger } = {}) {
    this.#fastifyStarted = false
    this.#host = '127.0.0.1'
    this.#port = 0

    this.#fastify = Fastify({ logger })

    this.#serverState = new StateMachine({
      start: this.#startServer.bind(this),
      stop: this.#stopServer.bind(this),
    })
  }

  get [kFastify]() {
    return this.#fastify
  }

  /**
   * @template {import('fastify').FastifyPluginOptions} Options
   * @param {import('fastify').FastifyPluginAsync<Options>} plugin
   * @param {Options} opts
   */
  registerPlugin(plugin, opts) {
    return this.#fastify.register(plugin, opts)
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
   * @returns {Promise<string>}
   */
  async #getAddress() {
    return pTimeout(getServerAddress(this.#fastify.server), {
      milliseconds: 1000,
    })
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

  /**
   * @param {'blobs' | 'icons' | 'maps'} mediaType
   * @returns {Promise<string>}
   */
  async getMediaAddress(mediaType) {
    /** @type {string | null} */
    let prefix = null

    switch (mediaType) {
      case 'blobs': {
        prefix = BLOBS_PREFIX
        break
      }
      case 'icons': {
        prefix = ICONS_PREFIX
        break
      }
      default: {
        throw new Error(`Unsupported media type ${mediaType}`)
      }
    }

    const base = await this.#getAddress()

    return base + '/' + prefix
  }
}

/**
 * @param {import('node:http').Server} server
 *
 * @returns {Promise<string>}
 */
async function getServerAddress(server) {
  const address = server.address()

  if (!address) {
    await once(server, 'listening')
    return getServerAddress(server)
  }

  if (typeof address === 'string') {
    return address
  }

  // Full address construction for non unix-socket address
  // https://github.com/fastify/fastify/blob/7aa802ed224b91ca559edec469a6b903e89a7f88/lib/server.js#L413
  let addr = ''
  if (address.address.indexOf(':') === -1) {
    addr += address.address + ':' + address.port
  } else {
    addr += '[' + address.address + ']:' + address.port
  }

  return 'http://' + addr
}
