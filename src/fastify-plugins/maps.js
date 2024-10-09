import { fetch } from 'undici'
import { Server as SMPServerPlugin } from 'styled-map-package'

import { noop } from '../utils.js'

/** @import { FastifyPluginAsync } from 'fastify' */

export const CUSTOM_MAP_PREFIX = 'custom'
export const FALLBACK_MAP_PREFIX = 'fallback'

/**
 * @typedef {Object} MapsPluginOpts
 *
 * @property {string | URL} defaultOnlineStyleUrl
 * @property {string} [customMapPath]
 * @property {string} fallbackMapPath
 */

/** @type {FastifyPluginAsync<MapsPluginOpts>} */
export async function plugin(fastify, opts) {
  if (opts.customMapPath) {
    fastify.register(SMPServerPlugin, {
      prefix: CUSTOM_MAP_PREFIX,
      filepath: opts.customMapPath,
    })
  }

  fastify.register(SMPServerPlugin, {
    prefix: FALLBACK_MAP_PREFIX,
    filepath: opts.fallbackMapPath,
  })

  fastify.get('/style.json', async (_request, reply) => {
    const baseUrl = new URL(fastify.prefix, fastify.listeningOrigin)

    // Important for using as a base for creating new URL objects
    if (!baseUrl.href.endsWith('/')) {
      baseUrl.href += '/'
    }

    /** @type {Array<string | URL>}*/
    const styleUrls = [
      opts.defaultOnlineStyleUrl,
      new URL(`${FALLBACK_MAP_PREFIX}/style.json`, baseUrl),
    ]

    if (opts.customMapPath) {
      styleUrls.unshift(new URL(`${CUSTOM_MAP_PREFIX}/style.json`, baseUrl))
    }

    for (const url of styleUrls) {
      const resp = await fetch(url, { method: 'HEAD' }).catch(noop)

      if (resp && resp.status === 200) {
        return reply
          .headers({
            'cache-control': 'no-cache',
          })
          .redirect(url.toString())
      }
    }

    return reply.status(404).send()
  })
}
