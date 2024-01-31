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
  api_key: T.Optional(T.String()),
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
        const apiKey = req.query.api_key
        const upstreamUrl = apiKey
          ? styleUrlWithApiKey(defaultOnlineStyleUrl, apiKey)
          : defaultOnlineStyleUrl

        try {
          const upstreamResponse = await fetch(upstreamUrl)

          if (upstreamResponse.ok) {
            // Set up headers to forward
            for (const [key, value] of upstreamResponse.headers) {
              // TODO: Typically Mapbox gzips the content but we'd need to make sure
              // something like https://github.com/fastify/fastify-compress/ is registered
              if (key.toLowerCase() === 'content-encoding') continue
              rep.header(key, value)
            }
            // Some upstream providers will not set the 'application/json' content-type header despite the body being JSON e.g. Protomaps
            // TODO: Should we forward the upstream 'content-type' header?
            // We kind of assume that a Style Spec-compatible JSON payload will always be used by a provider
            // Tehcnically, there could be cases where a provider doesn't use the Mapbox Style Spec and has their own format,
            // which may be delivered as some other content type
            rep.header('content-type', 'application/json; charset=utf-8')
            return upstreamResponse.json()
          } else {
            fastify.log.error(
              `Upstream style.json request failed: ${upstreamResponse.statusText}`
            )
          }
        } catch (err) {
          fastify.log.error(err)
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

/**
 * If `url` already contains a relevant api key query param, this function will overwrite it with `apiKey`.
 *
 * @param {string} url
 * @param {string} apiKey
 * @returns {string}
 */
function styleUrlWithApiKey(url, apiKey) {
  const u = new URL(url)

  const existingSearchParams = new URLSearchParams(u.search)

  /** @type {string | null} */
  let paramToUpsert = null

  switch (u.hostname) {
    case 'api.mapbox.com': {
      // Mapbox expects `access_token`: https://docs.mapbox.com/api/maps/styles/
      paramToUpsert = 'access_token'
      break
    }
    case 'api.protomaps.com':
    case 'api.maptiler.com': {
      // Protomaps expects `key` (no docs link yet)
      // MapTiler expects `key`: https://docs.maptiler.com/cloud/api/maps/
      paramToUpsert = 'key'
      break
    }
    case 'tiles.stadiamaps.com': {
      // Stadia expects `api_key`: https://docs.stadiamaps.com/themes/
      paramToUpsert = 'api_key'
      break
    }
    case 'basemapstyles-api.arcgis.com': {
      // ArcGIS expects `token`: https://docs.maptiler.com/cloud/api/maps/
      paramToUpsert = 'token'
      break
    }
    default: {
      // TODO: Should there be a default? (e.g. self-hosted instances using something like https://openmaptiles.org/)
    }
  }

  if (paramToUpsert) {
    existingSearchParams.set(paramToUpsert, apiKey)
    u.search = existingSearchParams.toString()
  }

  return u.href
}
