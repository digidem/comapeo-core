import { Type as T } from '@sinclair/typebox'
import fp from 'fastify-plugin'
import { kIconApi } from '../mapeo-project.js'

export default fp(iconServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-icon-server',
})

// iconDocId is a hex encoded 32-byte string
const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
// projectId is encoded to a z-base-32 52-character string (32 bytes)
const Z_BASE_32_REGEX_32_BYTES = '^[0-9a-zA-Z]{52}$'
const ICON_DOC_ID_STRING = T.String({ pattern: HEX_REGEX_32_BYTES })
const PROJECT_ID_STRING = T.String({ pattern: Z_BASE_32_REGEX_32_BYTES })

const PARAMS_JSON_SCHEMA = T.Object({
  iconDocId: ICON_DOC_ID_STRING,
  projectId: PROJECT_ID_STRING,
  size: T.String(),
  pixelDensity: T.Number(),
})

/**
 * @typedef {Object} IconServerPluginOpts
 * @property {import('fastify').RegisterOptions['prefix']} prefix
 * @property {(projectId: string) => Promise<import('../mapeo-project.js').MapeoProject>} getProject
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
  const { getProject } = options

  fastify.get(
    '/:projectId/:iconDocId/:size/:pixelDensity',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (req, res) => {
      const { projectId, iconDocId, size, pixelDensity } = req.params
      const project = await getProject(projectId)
      const iconApi = project[kIconApi]
      let icon
      try {
        icon = await iconApi.getIcon({ iconId: iconDocId, size, pixelDensity })
      } catch (e) {
        return res.code(404)
      }
      res.header('mime-type', icon.mimeType)
      return res.send(icon.icon)
    }
  )
}
