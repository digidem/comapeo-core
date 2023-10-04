import { parseVersionId } from '@mapeo/schema'
import { Type as T } from '@sinclair/typebox'
import fp from 'fastify-plugin'

export default fp(iconServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-icon-server',
})

const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
const HEX_STRING_32_BYTES = T.String({ pattern: HEX_REGEX_32_BYTES })
const PARAMS_JSON_SCHEMA = T.Object({
  iconDocId: HEX_STRING_32_BYTES,
  size: T.String(),
  pixelDensity: T.Number(),
})

/**
 * @typedef {Object} IconServerPluginOpts
 * @property {import('fastify').RegisterOptions['prefix']} prefix
 * @property {import('../core-manager/index.js').CoreManager} coreManager
 * @property {import('../datatype/index.js').DataType<
 *   import('../datastore/index.js').DataStore<'config'>,
 *   typeof import('../schema/project.js').iconTable,
 *   'icon',
 *   import('@mapeo/schema').Icon,
 *   import('@mapeo/schema').IconValue>} iconDataType
 **/

/** @type {import('fastify').FastifyPluginAsync<import('fastify').RegisterOptions & IconServerPluginOpts>} */
async function iconServerPlugin(fastify, options) {
  fastify.register(routes, options)
}

/** @type {import('fastify').FastifyPluginAsync<
 * Omit<IconServerPluginOpts, 'prefix'>,
 * import('fastify').RawServerDefault,
 * import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, options) {
  const { coreManager, iconDataType } = options
  fastify.get(
    '/:iconDocId/:size/:pixelDensity',
    {
      schema: {
        params: PARAMS_JSON_SCHEMA,
      },
    },
    async (req, res) => {
      const { iconDocId, size, pixelDensity } = req.params
      const icon = await iconDataType.getByDocId(iconDocId)
      const bestVariant = findBestVariantMatch(icon.variants, {
        size,
        pixelDensity,
      })
      const { coreDiscoveryKey, index } = parseVersionId(
        bestVariant.blobVersionId
      )
      const core = coreManager.getCoreByDiscoveryKey(coreDiscoveryKey)
      res.headers({ 'mime-type': bestVariant.mimeType })
      if (core) {
        const blob = core.get(index)
        res.send(blob)
      } else {
        res.statusCode = 404
        res.send()
      }
    }
  )
}

/**
 * @param {import('@mapeo/schema').IconValue['variants']} variants
 * @param {object} opts
 * @param {string} opts.size
 * @param {number} opts.pixelDensity
 **/
function findBestVariantMatch(variants, { size, pixelDensity }) {
  console.log(size, pixelDensity)
  return variants[0]
}
