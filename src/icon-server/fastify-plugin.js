import { Type as T } from '@sinclair/typebox'
import fp from 'fastify-plugin'
import { docSchemas } from '@mapeo/schema'

import { kGetIconBlob } from '../icon-api.js'

export default fp(iconServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-icon-server',
})

// iconDocId is a hex encoded 32-byte string
const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
// projectId is encoded to a z-base-32 52-character string (32 bytes)
const Z_BASE_32_REGEX_32_BYTES = '^[0-9a-zA-Z]{52}$'
const ICON_DOC_ID_STRING = T.String({ pattern: HEX_REGEX_32_BYTES })
const PROJECT_PUBLIC_ID_STRING = T.String({ pattern: Z_BASE_32_REGEX_32_BYTES })

const sizes = docSchemas.icon.properties.variants.items.properties.size.enum
const mimeTypes =
  docSchemas.icon.properties.variants.items.properties.mimeType.enum

const PARAMS_JSON_SCHEMA = T.Object({
  iconDocId: ICON_DOC_ID_STRING,
  projectPublicId: PROJECT_PUBLIC_ID_STRING,
  size: T.Union(sizes.map((size) => T.Literal(size))),
  pixelDensity: T.Optional(T.String()), // e.g. @2x
  mimeTypeExtension: T.Union(
    mimeTypes.map((mimeType) => {
      switch (mimeType) {
        case 'image/png':
          return T.Literal('png')
        case 'image/svg+xml':
          return T.Literal('svg')
      }
    })
  ),
})

/**
 * @typedef {Object} IconServerPluginOpts
 *
 * @property {(projectId: string) => Promise<import('../mapeo-project.js').MapeoProject>} getProject
 **/

/** @type {import('fastify').FastifyPluginAsync<import('fastify').RegisterOptions & IconServerPluginOpts>} */
async function iconServerPlugin(fastify, options) {
  if (!options.getProject) throw new Error('Missing getProject')
  fastify.register(routes, options)
}

/** @type {import('fastify').FastifyPluginAsync<Omit<IconServerPluginOpts, 'prefix'>, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, options) {
  const { getProject } = options

  fastify.get(
    '/:projectPublicId/:iconDocId/:size:pixelDensity(@[123]x)?.:mimeTypeExtension',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (req, res) => {
      const { projectPublicId, iconDocId, size, mimeTypeExtension } = req.params

      const pixelDensity = req.params.pixelDensity
        ? extractPixelDensity(req.params.pixelDensity)
        : 1

      const project = await getProject(projectPublicId)

      const mimeType =
        mimeTypeExtension === 'png' ? 'image/png' : 'image/svg+xml'

      try {
        const icon = await project.$icons[kGetIconBlob](iconDocId, {
          size,
          pixelDensity,
          mimeType,
        })

        res.header('Content-Type', mimeType)
        return res.send(icon)
      } catch (err) {
        res.code(404)
        throw err
      }
    }
  )
}

/**
 * @param {string} input
 * @returns {import('@mapeo/schema').Icon['variants'][number]['pixelDensity']}
 */
function extractPixelDensity(input) {
  const result = parseInt(input[1], 10)

  if (isNaN(result)) throw new Error('Could not extract pixel density')

  switch (result) {
    case 1:
    case 2:
    case 3:
      return result
    default:
      throw new Error(`Invalid pixel density ${result}`)
  }
}
