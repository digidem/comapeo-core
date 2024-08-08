import { Type as T } from '@sinclair/typebox'
import fp from 'fastify-plugin'
import { docSchemas } from '@mapeo/schema'

import { kGetIconBlob } from '../icon-api.js'
import { HEX_REGEX_32_BYTES, Z_BASE_32_REGEX_32_BYTES } from './constants.js'
import { ExhaustivenessError } from '../utils.js'

export default fp(iconServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-icons',
})

const ICON_DOC_ID_STRING = T.String({ pattern: HEX_REGEX_32_BYTES })
const PROJECT_PUBLIC_ID_STRING = T.String({ pattern: Z_BASE_32_REGEX_32_BYTES })

const VALID_SIZES = docSchemas.icon.definitions.size.enum
const VALID_MIME_TYPES = docSchemas.icon.properties.variants.items.oneOf.map(
  (iconType) => iconType.properties.mimeType.const
)
const VALID_PIXEL_DENSITIES = docSchemas.icon.properties.variants.items.oneOf
  .map((iconType) =>
    'pixelDensity' in iconType.properties
      ? iconType.properties.pixelDensity.enum
      : []
  )
  .flat()

const PARAMS_JSON_SCHEMA = T.Object({
  iconDocId: ICON_DOC_ID_STRING,
  projectPublicId: PROJECT_PUBLIC_ID_STRING,
  iconInfo: T.String({
    pattern: `^(${VALID_SIZES.join('|')})(@(${VALID_PIXEL_DENSITIES.join(
      '|'
    )}+)x)?$`,
  }),
  mimeTypeExtension: T.Union(
    VALID_MIME_TYPES.map((mimeType) => {
      switch (mimeType) {
        case 'image/png':
          return T.Literal('png')
        case 'image/svg+xml':
          return T.Literal('svg')
        default:
          throw new ExhaustivenessError(mimeType)
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
    '/:projectPublicId/:iconDocId/:iconInfo.:mimeTypeExtension',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (req, res) => {
      const { projectPublicId, iconDocId, iconInfo, mimeTypeExtension } =
        req.params

      const { size, pixelDensity } = extractSizeAndPixelDensity(iconInfo)

      const project = await getProject(projectPublicId)

      const mimeType =
        mimeTypeExtension === 'png' ? 'image/png' : 'image/svg+xml'

      try {
        const icon = await project.$icons[kGetIconBlob](
          iconDocId,
          mimeType === 'image/svg+xml'
            ? {
                size,
                mimeType,
              }
            : {
                size,
                pixelDensity,
                mimeType,
              }
        )

        res.header('Content-Type', mimeType)
        return res.send(icon)
      } catch (err) {
        res.code(404)
        throw err
      }
    }
  )
}

// matches strings that end in `@_x` and captures `_`, where `_` is a positive integer
const DENSITY_MATCH_REGEX = /@(\d+)x$/i

/**
 * @param {string} input
 *
 * @return {{
 * pixelDensity: import('../icon-api.js').BitmapOpts['pixelDensity'],
 * size: import('../icon-api.js').ValidSizes}}
 */
function extractSizeAndPixelDensity(input) {
  const result = DENSITY_MATCH_REGEX.exec(input)

  if (result) {
    const [match, capturedDensity] = result
    const size = input.split(match, 1)[0]
    const pixelDensity = parseInt(capturedDensity, 10)

    assertValidSize(size)
    assertValidPixelDensity(pixelDensity)

    return { size, pixelDensity }
  }

  assertValidSize(input)

  return { size: input, pixelDensity: 1 }
}

/**
 * @param {string} value
 * @returns {asserts value is Exclude<import('@mapeo/schema').Icon['variants'][number]['size'],'size_unspecified'>}
 */
function assertValidSize(value) {
  if (
    !VALID_SIZES.includes(
      // @ts-expect-error
      value
    )
  ) {
    throw new Error(`'${value}' is not a valid icon size`)
  }
}

/**
 * @param {unknown} value
 * @returns {asserts value is import('../icon-api.js').BitmapOpts['pixelDensity']}
 */
function assertValidPixelDensity(value) {
  if (!VALID_PIXEL_DENSITIES.includes(/** @type {any} */ (value))) {
    throw new Error(`${value} is not a valid icon pixel density`)
  }
}
