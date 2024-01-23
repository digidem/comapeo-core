import path from 'path'
import fs from 'fs/promises'
import FastifyStatic from '@fastify/static'
import fp from 'fastify-plugin'

import {
  NotFoundError,
  createStyleJsonResponseHeaders,
  getFastifyServerAddress,
} from '../utils.js'

export const PLUGIN_NAME = 'mapeo-static-maps'

export const plugin = fp(offlineFallbackMapPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
})

/**
 * @typedef {object} OfflineFallbackMapPluginOpts
 * @property {string} [prefix]
 * @property {string} styleJsonPath
 * @property {string} sourcesDir
 */

/**
 * @typedef {object} FallbackMapPluginDecorator
 * @property {(serverAddress: string) => Promise<any>} getResolvedStyleJson
 * @property {() => Promise<import('node:fs').Stats>} getStyleJsonStats
 */

/** @type {import('fastify').FastifyPluginAsync<OfflineFallbackMapPluginOpts>} */
async function offlineFallbackMapPlugin(fastify, opts) {
  const { styleJsonPath, sourcesDir } = opts

  fastify.decorate(
    'mapeoFallbackMap',
    /** @type {FallbackMapPluginDecorator} */
    ({
      async getResolvedStyleJson(serverAddress) {
        const rawStyleJson = await fs.readFile(styleJsonPath, 'utf-8')
        const styleJson = JSON.parse(rawStyleJson)

        const sources = styleJson.sources || {}

        const sourcesDirFiles = await fs.readdir(sourcesDir, {
          withFileTypes: true,
        })

        for (const file of sourcesDirFiles) {
          // Only work with files
          if (file.isDirectory()) continue

          // Ignore the style.json file if it exists
          if (file.name === 'style.json') continue

          // Only work with json or geojson files
          const extension = path.extname(file.name)
          if (!(extension === '.json' || extension === '.geojson')) continue

          const sourceName = path.basename(file.name, extension) + '-source'

          sources[sourceName] = {
            type: 'geojson',
            data: new URL(`${opts.prefix || ''}/${file.name}`, serverAddress)
              .href,
          }
        }

        styleJson.sources = sources

        return styleJson
      },
      async getStyleJsonStats() {
        return fs.stat(styleJsonPath)
      },
    })
  )

  fastify.register(routes, {
    prefix: opts.prefix,
    styleJsonPath: opts.styleJsonPath,
    sourcesDir: opts.sourcesDir,
  })
}

/** @type {import('fastify').FastifyPluginAsync<OfflineFallbackMapPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, opts) {
  const { sourcesDir } = opts

  fastify.register(FastifyStatic, {
    root: sourcesDir,
    decorateReply: false,
  })

  fastify.get('/style.json', async (req, rep) => {
    const serverAddress = await getFastifyServerAddress(req.server.server)

    let stats, styleJson

    try {
      const results = await Promise.all([
        fastify.mapeoFallbackMap.getStyleJsonStats(),
        fastify.mapeoFallbackMap.getResolvedStyleJson(serverAddress),
      ])

      stats = results[0]
      styleJson = results[1]
    } catch (err) {
      throw new NotFoundError(`id = fallback, style.json`)
    }

    rep.headers(createStyleJsonResponseHeaders(stats.mtime))

    return styleJson
  })
}
