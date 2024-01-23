import fp from 'fastify-plugin'

import {
  NotFoundError,
  createStyleJsonResponseHeaders,
  getFastifyServerAddress,
} from '../utils.js'
import { PLUGIN_NAME as MAPEO_STATIC_MAPS } from './static-maps.js'
import { PLUGIN_NAME as MAPEO_OFFLINE_FALLBACK } from './offline-fallback-map.js'

export const PLUGIN_NAME = 'mapeo-maps'

export const plugin = fp(mapsPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
  decorators: { fastify: ['mapeoStaticMaps', 'mapeoFallbackMap'] },
  dependencies: [MAPEO_STATIC_MAPS, MAPEO_OFFLINE_FALLBACK],
})

/**
 * @typedef {object} MapsPluginOpts
 * @property {string} [prefix]
 */

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts>} */
async function mapsPlugin(fastify, opts) {
  fastify.register(routes, {
    prefix: opts.prefix,
  })
}

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify) {
  fastify.get('/style.json', async (req, rep) => {
    const serverAddress = await getFastifyServerAddress(req.server.server)

    // 1. Attempt to get "default" local static map's style.json
    {
      const styleId = 'default'

      const results = await Promise.all([
        fastify.mapeoStaticMaps.getStyleJsonStats(styleId),
        fastify.mapeoStaticMaps.getResolvedStyleJson(styleId, serverAddress),
      ]).catch(() => {
        fastify.log.warn('Cannot read default static map')
        return null
      })

      if (results) {
        const [stats, styleJson] = results
        rep.headers(createStyleJsonResponseHeaders(stats.mtime))
        return styleJson
      }
    }

    // TODO: 2. Attempt to get map's style.json from online source

    // 3. Provide offline fallback map's style.json
    {
      let results = null

      try {
        results = await Promise.all([
          fastify.mapeoFallbackMap.getStyleJsonStats(),
          fastify.mapeoFallbackMap.getResolvedStyleJson(serverAddress),
        ])
      } catch (err) {
        throw new NotFoundError(`id = fallback, style.json`)
      }

      const [stats, styleJson] = results
      rep.headers(createStyleJsonResponseHeaders(stats.mtime))
      return styleJson
    }
  })
}
