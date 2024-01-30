import fp from 'fastify-plugin'
import { Type as T } from '@sinclair/typebox'
import { fetch } from 'undici'

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

const GetStyleJsonQueryStringSchema = T.Object({
  access_token: T.Optional(T.String()),
})

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify) {
  fastify.get(
    '/style.json',
    { schema: { querystring: GetStyleJsonQueryStringSchema } },
    async (req, rep) => {
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

      // 2. Attempt to get a default style.json from online source
      {
        const upstreamResponse = await fetch(
          constructUpstreamStyleUrl(req.query.access_token)
        ).catch((err) => {
          fastify.log.error(err)
          return null
        })

        if (upstreamResponse) {
          if (upstreamResponse.ok) {
            // Set up headers to forward
            for (const [key, value] of upstreamResponse.headers) {
              // TODO: Typically Mapbox gzips the content but we'd need to make sure
              // something like https://github.com/fastify/fastify-compress/ is registered
              if (key.toLowerCase() === 'content-encoding') continue
              rep.header(key, value)
            }
            return upstreamResponse.json()
          } else {
            fastify.log.error(
              `Upstream style.json request failed: ${upstreamResponse.statusText}`
            )
          }
        }
      }

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
    }
  )
}

export const UPSTREAM_MAP_STYLE_URL =
  'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12'

/**
 * @param {string} [accessToken]
 * @returns {string}
 */
function constructUpstreamStyleUrl(accessToken) {
  const url = new URL(UPSTREAM_MAP_STYLE_URL)

  if (accessToken) {
    url.search = new URLSearchParams({
      access_token: accessToken,
    }).toString()
  }

  return url.href
}
