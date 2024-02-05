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
export const DEFAULT_MAPBOX_STYLE_URL =
  'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12'

const MAP_PROVIDER_API_KEY_QUERY_PARAM_BY_HOSTNAME = new Map([
  // Mapbox expects `access_token`: https://docs.mapbox.com/api/maps/styles/
  ['api.mapbox.com', 'access_token'],
  // Protomaps expects `key` (no docs link yet)
  ['api.protomaps.com', 'key'],
  // MapTiler expects `key`: https://docs.maptiler.com/cloud/api/maps/
  ['api.maptiler.com', 'key'],
  // Stadia expects `api_key`: https://docs.stadiamaps.com/themes/
  ['tiles.stadiamaps.com', 'api_key'],
  // ArcGIS expects `token`: https://developers.arcgis.com/documentation/mapping-apis-and-services/security/api-keys/
  ['basemapstyles-api.arcgis.com', 'token'],
])

export const plugin = fp(mapsPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
  decorators: { fastify: ['mapeoStaticMaps', 'mapeoFallbackMap'] },
  dependencies: [MAPEO_STATIC_MAPS, MAPEO_OFFLINE_FALLBACK],
})

/**
 * @typedef {object} MapsPluginOpts
 * @property {string} [prefix]
 * @property {string} [defaultOnlineStyleUrl]
 */

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts>} */
async function mapsPlugin(fastify, opts) {
  fastify.register(routes, {
    prefix: opts.prefix,
    defaultOnlineStyleUrl: opts.defaultOnlineStyleUrl,
  })
}

const GetStyleJsonQueryStringSchema = T.Object({
  key: T.Optional(T.String()),
})

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, opts) {
  const { defaultOnlineStyleUrl = DEFAULT_MAPBOX_STYLE_URL } = opts

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
        const { key } = req.query

        const upstreamUrlObj = new URL(defaultOnlineStyleUrl)
        const { hostname } = upstreamUrlObj

        if (key) {
          const paramToUpsert =
            MAP_PROVIDER_API_KEY_QUERY_PARAM_BY_HOSTNAME.get(hostname)

          if (paramToUpsert) {
            // Note that even if the search param of interest already exists in the url
            // it is overwritten by the key provided in the request's search params
            upstreamUrlObj.searchParams.set(paramToUpsert, key)
          } else {
            fastify.log.warn(
              `Provided API key will not be applied to unrecognized provider: ${hostname}`
            )
          }
        }

        try {
          const upstreamResponse = await fetch(upstreamUrlObj.href, {
            signal: AbortSignal.timeout(30_000),
          })

          if (upstreamResponse.ok) {
            // Set up headers to forward
            // TODO: Change this to an allow-list of headers instead of a block-list
            for (const [name, value] of upstreamResponse.headers) {
              // We do our own content encoding
              if (name.toLowerCase() === 'content-encoding') continue
              rep.header(name, value)
            }
            // Some upstream providers will not set the 'application/json' content-type header despite the body being JSON e.g. Protomaps
            // TODO: Should we forward the upstream 'content-type' header?
            // We kind of assume that a Style Spec-compatible JSON payload will always be used by a provider
            // Technically, there could be cases where a provider doesn't use the Mapbox Style Spec and has their own format,
            // which may be delivered as some other content type
            rep.header('content-type', 'application/json; charset=utf-8')
            return upstreamResponse.json()
          } else {
            fastify.log.warn(
              `Upstream style.json request returned non-2xx status: ${upstreamResponse.status} ${upstreamResponse.statusText}`
            )
          }
        } catch (err) {
          fastify.log.warn('Failed to make upstream style.json request', err)
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
