import fs from 'node:fs/promises'
import path from 'node:path'
import { fetch } from 'undici'
import { ReaderWatch, Server as SMPServerPlugin } from 'styled-map-package'

import { noop } from '../utils.js'
import { NotFoundError, ENOENTError } from './utils.js'
import { getErrorCode } from '../lib/error.js'

/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { Stats } from 'node:fs' */

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
    const { customMapPath } = opts

    const customMapReader = new ReaderWatch(customMapPath)

    fastify.addHook('onClose', () => customMapReader.close().catch(noop))

    fastify.get(`/${CUSTOM_MAP_PREFIX}/info`, async () => {
      const baseUrl = new URL(fastify.prefix, fastify.listeningOrigin)

      if (!baseUrl.href.endsWith('/')) {
        baseUrl.href += '/'
      }

      const customStyleJsonUrl = new URL(
        `${CUSTOM_MAP_PREFIX}/style.json`,
        baseUrl
      )
      const response = await fetch(customStyleJsonUrl)

      if (response.status === 404) {
        throw new NotFoundError(customStyleJsonUrl.href)
      }

      if (!response.ok) {
        throw new Error(`Failed to get style from ${customStyleJsonUrl.href}`)
      }

      /** @type {Stats | undefined} */
      let stats

      try {
        stats = await fs.stat(customMapPath)
      } catch (err) {
        if (getErrorCode(err) === 'ENOENT') {
          throw new ENOENTError(customMapPath)
        }

        throw err
      }

      const style = await response.json()

      const styleJsonName =
        typeof style === 'object' &&
        style &&
        'name' in style &&
        typeof style.name === 'string'
          ? style.name
          : undefined

      return {
        created: stats.ctime,
        size: stats.size,
        name: styleJsonName || path.parse(customMapPath).name,
      }
    })

    fastify.register(SMPServerPlugin, {
      prefix: CUSTOM_MAP_PREFIX,
      reader: customMapReader,
    })
  }

  const fallbackMapReader = new ReaderWatch(opts.fallbackMapPath)

  fastify.addHook('onClose', () => fallbackMapReader.close().catch(noop))

  fastify.register(SMPServerPlugin, {
    prefix: FALLBACK_MAP_PREFIX,
    reader: fallbackMapReader,
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
