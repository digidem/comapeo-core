import { once } from 'events'
import fastify from 'fastify'
import pTimeout from 'p-timeout'
import StateMachine from 'start-stop-state-machine'

import BlobServerPlugin from './fastify-plugins/blobs.js'
import { kBlobStore } from './mapeo-project.js'

export const BLOBS_PREFIX = 'blobs'
export const ICONS_PREFIX = 'icons'

/**
 * @typedef {Object} StartOpts
 *
 * @property {string} [host]
 * @property {number} [port]
 */

export class MediaServer {
  #serverState
  #fastify
  #createFastify

  /**
   * @param {object} params
   * @param {(projectPublicId: string) => Promise<import('./mapeo-project.js').MapeoProject>} params.getProject
   * @param {import('fastify').FastifyServerOptions['logger']} [params.logger]
   */
  constructor({ getProject, logger }) {
    this.#createFastify = () => {
      const server = fastify({ logger })

      server.register(BlobServerPlugin, {
        prefix: BLOBS_PREFIX,
        getBlobStore: async (projectPublicId) => {
          const project = await getProject(projectPublicId)
          return project[kBlobStore]
        },
      })

      return server
    }

    this.#fastify = this.#createFastify()

    this.#serverState = new StateMachine({
      start: this.#startServer.bind(this),
      stop: this.#stopServer.bind(this),
    })
  }

  /**
   * @param {StartOpts} [opts]
   */
  async #startServer({ host = '127.0.0.1', port } = {}) {
    await this.#fastify.listen({ host, port })
  }

  async #stopServer() {
    await this.#fastify.close()
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
    // Server was stopped before
    // Need to replace the existing Fastify instance with a new one in order to listen again
    if (this.#serverState.state.value === 'stopped') {
      this.#fastify = this.#createFastify()
    }

    await this.#serverState.start(opts)
  }

  async started() {
    return this.#serverState.started()
  }

  async stop() {
    await this.#serverState.stop()
  }

  /**
   * @param {'blobs' | 'icons'} mediaType
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
