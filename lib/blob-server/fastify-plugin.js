// @ts-check
import assert from 'node:assert'
import fp from 'fastify-plugin'
import { filetypemime } from 'magic-bytes.js'
import { Type as T } from '@sinclair/typebox'

import { SUPPORTED_BLOB_VARIANTS } from '../blob-store/index.js'

export default fp(blobServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-blob-server',
})

/**
 * @typedef {Object} BlobServerPluginOpts
 *
 * @property {(projectId: string) => import('../blob-store/index.js').BlobStore} getBlobStore
 */

const BLOB_TYPES = /** @type {import('../types').BlobId['type'][]} */ (
  Object.keys(SUPPORTED_BLOB_VARIANTS)
)
const BLOB_VARIANTS = [
  ...new Set(Object.values(SUPPORTED_BLOB_VARIANTS).flat()),
]
const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
const HEX_STRING_32_BYTES = T.String({ pattern: HEX_REGEX_32_BYTES })

const PARAMS_JSON_SCHEMA = T.Object({
  projectId: HEX_STRING_32_BYTES,
  driveId: HEX_STRING_32_BYTES,
  type: T.Union(
    BLOB_TYPES.map((type) => {
      return T.Literal(type)
    })
  ),
  variant: T.Union(
    BLOB_VARIANTS.map((variant) => {
      return T.Literal(variant)
    })
  ),
  name: T.String(),
})

/** @type {import('fastify').FastifyPluginAsync<import('fastify').RegisterOptions & BlobServerPluginOpts>} */
async function blobServerPlugin(fastify, options) {
  if (!options.getBlobStore) throw new Error('Missing getBlobStore')

  // We call register here so that the `prefix` option can work if desired
  // https://fastify.dev/docs/latest/Reference/Routes#route-prefixing-and-fastify-plugin
  fastify.register(routes, options)
}

/** @type {import('fastify').FastifyPluginAsync<Omit<BlobServerPluginOpts, 'prefix'>, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, options) {
  const { getBlobStore } = options

  fastify.get(
    '/:projectId/:driveId/:type/:variant/:name',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (request, reply) => {
      const { projectId, driveId, type, variant, name } = request.params

      const blobStore = getBlobStore(projectId)

      const blobId = constructBlobId(driveId, type, variant, name)

      const entry = await blobStore.entry(blobId, { wait: false })

      if (!entry) {
        reply.code(404)
        throw new Error('Entry not found')
      }

      const { metadata } = entry.value

      const blobStream = await blobStore.createEntryReadStream(driveId, entry)

      // Extract the 'mime' property of the metadata and use it for the response header if found
      if (metadata && 'mime' in metadata && typeof metadata.mime === 'string') {
        reply.header('Content-Type', metadata.mime)
      } else {
        // Attempt to guess the MIME type based on the blob contents
        const blobSlice = await blobStore.getEntryBlob(driveId, entry, {
          length: 20,
        })

        if (!blobSlice) {
          reply.code(404)
          throw new Error('Blob not found')
        }

        const [guessedMime] = filetypemime(blobSlice)

        reply.header('Content-Type', guessedMime || 'application/octet-stream')
      }

      return reply.send(blobStream)
    }
  )
}

/**
 * @param {string} driveId
 * @param {import('../types').BlobType} type
 * @param {import('../types').BlobVariant<ParsedParams['type']>} variant
 * @param {string} name
 *
 * @returns {import('../types').BlobId}
 */
function constructBlobId(driveId, type, variant, name) {
  assert(
    SUPPORTED_BLOB_VARIANTS[type].includes(/** @type {*} */ (variant)),
    `Unsupported variant "${variant}" for ${type}`
  )

  return /** @type {import('../types').BlobId} */ ({
    driveId,
    type,
    variant,
    name,
  })
}
