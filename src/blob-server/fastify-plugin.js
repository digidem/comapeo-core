// @ts-check
import fp from 'fastify-plugin'
import { filetypemime } from 'magic-bytes.js'
import { Type as T } from '@sinclair/typebox'

import { SUPPORTED_BLOB_VARIANTS } from '../blob-store/index.js'

export default fp(blobServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-blob-server',
})

/** @typedef {import('../types.js').BlobId} BlobId */

/**
 * @typedef {Object} BlobServerPluginOpts
 *
 * @property {(projectId: string) => import('../blob-store/index.js').BlobStore} getBlobStore
 */

const BLOB_TYPES = /** @type {BlobId['type'][]} */ (
  Object.keys(SUPPORTED_BLOB_VARIANTS)
)
const BLOB_VARIANTS = [
  ...new Set(Object.values(SUPPORTED_BLOB_VARIANTS).flat()),
]
const HEX_REGEX_32_BYTES = '^[0-9a-fA-F]{64}$'
const HEX_STRING_32_BYTES = T.String({ pattern: HEX_REGEX_32_BYTES })

const PARAMS_JSON_SCHEMA = T.Object({
  projectId: HEX_STRING_32_BYTES,
  driveDiscoveryId: HEX_STRING_32_BYTES,
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
    '/:projectId/:driveDiscoveryId/:type/:variant/:name',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (request, reply) => {
      const { projectId, ...blobId } = request.params

      if (!isValidBlobId(blobId)) {
        reply.code(400)
        throw new Error(
          `Unsupported variant "${blobId.variant}" for ${blobId.type}`
        )
      }
      const { driveDiscoveryId: driveDiscoveryId } = blobId

      let blobStore
      try {
        blobStore = getBlobStore(projectId)
      } catch (e) {
        reply.code(404)
        throw e
      }

      let entry
      try {
        entry = await blobStore.entry(blobId, { wait: false })
      } catch (e) {
        reply.code(404)
        throw e
      }

      if (!entry) {
        reply.code(404)
        throw new Error('Entry not found')
      }

      const { metadata } = entry.value

      let blobStream
      try {
        blobStream = await blobStore.createEntryReadStream(
          driveDiscoveryId,
          entry
        )
      } catch (e) {
        reply.code(404)
        throw e
      }

      // Extract the 'mimeType' property of the metadata and use it for the response header if found
      if (
        metadata &&
        'mimeType' in metadata &&
        typeof metadata.mimeType === 'string'
      ) {
        reply.header('Content-Type', metadata.mimeType)
      } else {
        // Attempt to guess the MIME type based on the blob contents
        const blobSlice = await blobStore.getEntryBlob(
          driveDiscoveryId,
          entry,
          {
            length: 20,
          }
        )

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
 * @param {Omit<BlobId, 'variant'> & { variant: BlobId['variant'] }} maybeBlobId
 * @returns {maybeBlobId is BlobId}
 */
function isValidBlobId(maybeBlobId) {
  const { type, variant } = maybeBlobId
  /** @type {readonly BlobId['variant'][]} */
  const validVariants = SUPPORTED_BLOB_VARIANTS[type]
  return validVariants.includes(variant)
}
