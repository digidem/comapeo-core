import fp from 'fastify-plugin'

import { PLUGIN_NAME as MAPEO_STATIC_MAPS } from './static-maps.js'
import { NotFoundError, getFastifyServerAddress } from '../utils.js'

export const PLUGIN_NAME = 'mapeo-maps'

export const plugin = fp(mapsPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
  decorators: { fastify: ['mapeoStaticMaps'] },
  dependencies: [MAPEO_STATIC_MAPS],
})

/**
 * @typedef {{ prefix?: string }} MapsPluginOpts
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

      let stats, styleJson
      try {
        const results = await Promise.all([
          fastify.mapeoStaticMaps.getStyleJsonStats(styleId),
          fastify.mapeoStaticMaps.getResolvedStyleJson(styleId, serverAddress),
        ])

        stats = results[0]
        styleJson = results[1]
      } catch (err) {
        throw new NotFoundError(`id = ${styleId}, style.json`)
      }

      rep.headers({
        'Cache-Control': 'max-age=' + 5 * 60, // 5 minutes
        'Access-Control-Allow-Headers':
          'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since',
        'Access-Control-Allow-Origin': '*',
        'Last-Modified': new Date(stats.mtime).toUTCString(),
      })

      return styleJson
    }

    // TODO: 2. Attempt to get map's style.json from online source

    // TODO: 3. Provide offline fallback map's style.json
  })
}
