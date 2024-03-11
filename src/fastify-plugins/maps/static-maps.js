import path from 'path'
import fs from 'fs/promises'
import FastifyStatic from '@fastify/static'
import fp from 'fastify-plugin'
import { Type as T } from '@sinclair/typebox'
import asar from '@electron/asar'
import { Mime } from 'mime/lite'
import standardTypes from 'mime/types/standard.js'

import { NotFoundError, getFastifyServerAddress } from '../utils.js'

export const PLUGIN_NAME = 'mapeo-static-maps'

export const plugin = fp(staticMapsPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
})

/**
 * @typedef {object} StaticMapsPluginOpts
 * @property {string} [prefix]
 * @property {string} staticRootDir
 */

/**
 * @typedef {object} StaticMapsPluginDecorator
 * @property {(styleId: string, serverAddress: string) => Promise<string>} getResolvedStyleJson
 * @property {(styleId: string) => Promise<import('node:fs').Stats>} getStyleJsonStats
 */

/** @type {import('fastify').FastifyPluginAsync<StaticMapsPluginOpts>} */
async function staticMapsPlugin(fastify, opts) {
  fastify.decorate('mapeoStaticMaps', {
    async getResolvedStyleJson(styleId, serverAddress) {
      const filePath = path.join(opts.staticRootDir, styleId, 'style.json')

      const data = await fs.readFile(filePath, 'utf-8')

      return data.replace(
        /\{host\}/gm,
        new URL(`${opts.prefix || ''}/${styleId}`, serverAddress).href
      )
    },
    async getStyleJsonStats(styleId) {
      const filePath = path.join(opts.staticRootDir, styleId, 'style.json')
      const stats = await fs.stat(filePath)
      return stats
    },
  })

  fastify.register(routes, {
    prefix: opts.prefix,
    staticRootDir: opts.staticRootDir,
  })
}

const GetStaticMapTileParamsSchema = T.Object({
  styleId: T.String(),
  tileId: T.String(),
  z: T.Number(),
  y: T.Number(),
  x: T.Number(),
  ext: T.Optional(T.String()),
})

const ListStaticMapsReplySchema = T.Array(
  T.Object({
    id: T.String(),
    name: T.Union([T.String(), T.Null()]),
    styleUrl: T.String(),
  })
)

const GetStyleJsonParamsSchema = T.Object({
  styleId: T.String(),
})

/** @type {import('fastify').FastifyPluginAsync<StaticMapsPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, opts) {
  const { staticRootDir } = opts

  /**
   * @param {import('fastify').FastifyRequest<{Params: import('@sinclair/typebox').Static<typeof GetStaticMapTileParamsSchema>}>} req
   * @param {import('fastify').FastifyReply} rep
   */
  async function handleStyleTileGet(req, rep) {
    const result = getStyleTileInfo(staticRootDir, req.params)

    if (!result) {
      const { tileId, z, x, y, ext } = req.params
      throw new NotFoundError(
        `Tileset id = ${tileId}, ext=${ext}, [${z}, ${x}, ${y}]`
      )
    }

    const { data, mimeType } = result

    if (mimeType) {
      rep.header('Content-Type', mimeType)
    }

    rep.send(data)
  }

  // Serve static files
  fastify.register(FastifyStatic, {
    root: staticRootDir,
    setHeaders: (res, path) => {
      if (path.toLowerCase().endsWith('.pbf')) {
        res.setHeader('Content-Type', 'application/x-protobuf')
      }
    },
  })

  /// List static maps
  fastify.get(
    '/',
    { schema: { response: { 200: ListStaticMapsReplySchema } } },
    async (req) => {
      const styleDirFiles = await fs.readdir(staticRootDir)

      const serverAddress = await getFastifyServerAddress(req.server.server)

      const result = (
        await Promise.all(
          styleDirFiles.map(async (filename) => {
            const stat = await fs.stat(path.join(staticRootDir, filename))
            if (!stat.isDirectory()) return null

            let styleJson

            try {
              const styleJsonContent = await fs.readFile(
                path.join(staticRootDir, filename, 'style.json'),
                'utf-8'
              )

              styleJson = JSON.parse(styleJsonContent)
            } catch (err) {
              return null
            }

            return {
              id: filename,
              name: typeof styleJson.name === 'string' ? styleJson.name : null,
              styleUrl: new URL(
                `${req.server.prefix || ''}/${filename}/style.json`,
                serverAddress
              ).href,
            }
          })
        )
      ).filter(
        /**
         * @template {import('@sinclair/typebox').Static<typeof ListStaticMapsReplySchema>[number] | null} V
         * @param {V} v
         * @returns {v is NonNullable<V>}
         */
        (v) => v !== null
      )

      return result
    }
  )

  /// Get a map's style.json
  fastify.get(
    `/:styleId/style.json`,
    { schema: { params: GetStyleJsonParamsSchema } },
    async (req, rep) => {
      const { styleId } = req.params

      const serverAddress = await getFastifyServerAddress(req.server.server)

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

      const styleJsonBytes = Buffer.from(styleJson)

      rep.headers({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'max-age=' + 5 * 60, // 5 minutes
        'Access-Control-Allow-Headers':
          'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since',
        'Access-Control-Allow-Origin': '*',
        'Last-Modified': new Date(stats.mtime).toUTCString(),
        'Content-Length': styleJsonBytes.length,
      })

      return styleJsonBytes
    }
  )

  // Get a tile (extension specified)
  fastify.get(
    `/:styleId/tiles/:tileId/:z/:x/:y.:ext`,
    { schema: { params: GetStaticMapTileParamsSchema } },
    handleStyleTileGet
  )
  // Get a tile (extension not specified)
  fastify.get(
    `/:styleId/tiles/:tileId/:z/:x/:y`,
    { schema: { params: GetStaticMapTileParamsSchema } },
    handleStyleTileGet
  )
}

/**
 * @param {string} archive
 * @param {string} filename
 */
function extractAsarFile(archive, filename) {
  try {
    return asar.extractFile(archive, filename)
  } catch (err) {
    return undefined
  }
}

const mime = new Mime(standardTypes, { 'application/x-protobuf': ['pbf'] })

/**
 * @param {string} baseDirectory
 * @param {import('@sinclair/typebox').Static<typeof GetStaticMapTileParamsSchema>} params
 * @returns {null | { data: Buffer, mimeType: string | null, shouldGzip: boolean}}
 */
function getStyleTileInfo(baseDirectory, params) {
  const { styleId, tileId, z, x, y } = params
  let { ext } = params

  // TODO: If necessary, need to flip the y value first if the TileJSON source is TMS scheme
  // Doing this will depend on if we decide that the asar directory structure should only follow XYZ or if it should align with corresponding tilejson spec

  const fileBasename = path.join(z.toString(), x.toString(), y.toString())
  const asarPath = path.join(baseDirectory, styleId, 'tiles', tileId + '.asar')

  /** @type {Buffer | undefined} */
  let data

  if (ext) {
    data = extractAsarFile(asarPath, fileBasename + '.' + ext)
  } else {
    // Try common extensions
    const extensions = ['png', 'jpg', 'jpeg']

    for (const e of extensions) {
      data = extractAsarFile(asarPath, fileBasename + '.' + e)

      // Match found, use the corresponding extension moving forward
      if (data) {
        ext = e
        break
      }
    }
  }

  // extension check isn't fully necessary since the buffer will only exist if the extension exists
  // but useful to check for types reasons
  if (!data || !ext) {
    return null
  }

  const mimeType = mime.getType(ext)

  const shouldGzip = ext === 'mvt' || ext === 'pbf'

  return { data, mimeType, shouldGzip }
}
