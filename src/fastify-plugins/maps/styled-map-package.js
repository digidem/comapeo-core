import fp from 'fastify-plugin'
import { Reader } from 'styled-map-package'

/** @import {FastifyPluginAsync} from 'fastify' */
/** @import {Resource, SMPStyle} from 'styled-map-package/reader.js' */

export const PLUGIN_NAME = 'comapeo-styled-map-package'

/**
 * @typedef {object} StyledMapPackagePluginOpts
 * @property {string} filepath
 * @property {boolean} [lazy]
 * @property {string} [prefix]
 *
 */

/**
 * @typedef {object} StyledMapPackagePluginDecorator
 * @property {(baseUrl?: string) => Promise<SMPStyle>} getStyle
 * @property {(path: string) => Promise<Resource>} getResource
 */

export const plugin = fp(styledMapPackagePlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
})

/** @type {FastifyPluginAsync<StyledMapPackagePluginOpts>} */
async function styledMapPackagePlugin(fastify, opts) {
  let reader = opts.lazy ? null : new Reader(opts.filepath)

  fastify.addHook('onClose', async () => {
    if (reader) {
      // Can fail to close if `opts.filepath` used for instantiation is invalid
      try {
        await reader.close()
      } catch (err) {
        fastify.log.warn('Failed to close SMP reader instance', err)
      }
    }
  })

  fastify.decorate('comapeoSmp', {
    async getStyle(baseUrl) {
      if (!reader) {
        reader = new Reader(opts.filepath)
      }

      const base =
        baseUrl || new URL(opts.prefix || '', fastify.listeningOrigin).href

      return reader.getStyle(base)
    },

    async getResource(path) {
      if (!reader) {
        reader = new Reader(opts.filepath)
      }

      return reader.getResource(path)
    },
  })

  fastify.register(routes, {
    prefix: opts.prefix,
  })
}

/** @type {FastifyPluginAsync} */
async function routes(fastify) {
  if (!fastify.hasDecorator('comapeoSmp')) {
    throw new Error('Could not find `comapeoSmp` decorator')
  }

  fastify.get('/style.json', async () => {
    const baseUrl = fastify.prefix
      ? new URL(fastify.prefix, fastify.listeningOrigin).href
      : fastify.listeningOrigin

    return fastify.comapeoSmp.getStyle(baseUrl)
  })

  fastify.get('*', async (request, reply) => {
    /** @type {Resource} */
    let resource
    try {
      // Removes the prefix that might have been registered by a consumer of the plugin
      const normalizedPath = fastify.prefix
        ? request.url.replace(fastify.prefix, '')
        : request.url

      resource = await fastify.comapeoSmp.getResource(decodeURI(normalizedPath))
    } catch (e) {
      // @ts-expect-error
      e.statusCode = 404
      throw e
    }

    reply
      .type(resource.contentType)
      .header('content-length', resource.contentLength)

    if (resource.contentEncoding) {
      reply.header('content-encoding', resource.contentEncoding)
    }

    return reply.send(resource.stream)
  })
}
