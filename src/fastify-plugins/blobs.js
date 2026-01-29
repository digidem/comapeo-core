import fp from 'fastify-plugin'
import { filetypemime } from 'magic-bytes.js'
import { pEvent } from 'p-event'
import { Type as T } from '@sinclair/typebox'

import { SUPPORTED_BLOB_VARIANTS } from '../blob-store/index.js'
import { HEX_REGEX_32_BYTES, Z_BASE_32_REGEX_32_BYTES } from './constants.js'
import { getErrorMessage } from '../errors.js'
import {
  BlobNotFoundError,
  BlobStoreEntryNotFoundError,
  MissingGetBlobStoreError,
  UnsupportedVariantError,
} from '../errors.js'

/** @import { BlobId } from '../types.js' */

export default fp(blobServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-blobs',
})

/**
 * @typedef {Object} BlobServerPluginOpts
 *
 * @property {(projectPublicId: string) => Promise<import('../blob-store/index.js').BlobStore>} getBlobStore
 */

const BLOB_TYPES = /** @type {BlobId['type'][]} */ (
  Object.keys(SUPPORTED_BLOB_VARIANTS)
)
const BLOB_VARIANTS = [
  ...new Set(Object.values(SUPPORTED_BLOB_VARIANTS).flat()),
]

const PARAMS_JSON_SCHEMA = T.Object({
  projectPublicId: T.String({ pattern: Z_BASE_32_REGEX_32_BYTES }),
  driveId: T.String({ pattern: HEX_REGEX_32_BYTES }),
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
  if (!options.getBlobStore) throw new MissingGetBlobStoreError()

  // We call register here so that the `prefix` option can work if desired
  // https://fastify.dev/docs/latest/Reference/Routes#route-prefixing-and-fastify-plugin
  fastify.register(routes, options)
}

/** @type {import('fastify').FastifyPluginAsync<Omit<BlobServerPluginOpts, 'prefix'>, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify, options) {
  const { getBlobStore } = options

  fastify.get(
    '/:projectPublicId/:driveId/:type/:variant/:name',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    async (request, reply) => {
      const { projectPublicId, ...blobId } = request.params

      if (!isValidBlobId(blobId)) {
        reply.code(400)
        throw new UnsupportedVariantError(blobId.variant, blobId.type)
      }
      const { driveId } = blobId

      let blobStore
      try {
        blobStore = await getBlobStore(projectPublicId)
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
        throw new BlobStoreEntryNotFoundError()
      }

      const { metadata } = entry.value

      let blobStream
      try {
        blobStream = await blobStore.createReadStreamFromEntry(driveId, entry)
      } catch (e) {
        reply.code(404)
        throw e
      }

      try {
        await pEvent(blobStream, 'readable', { rejectionEvents: ['error'] })
      } catch (err) {
        // This matches [how Hyperblobs checks if a blob is unavailable][0].
        // [0]: https://github.com/holepunchto/hyperblobs/blob/518088d2b828082fd70a276fa2c8848a2cf2a56b/index.js#L49
        if (getErrorMessage(err) === 'Block not available') {
          reply.code(404)
          throw new BlobNotFoundError()
        } else {
          throw err
        }
      }

      // Extract the 'mimeType' property of the metadata and use it for the response header if found
      if (
        metadata &&
        typeof metadata === 'object' &&
        'mimeType' in metadata &&
        typeof metadata.mimeType === 'string'
      ) {
        reply.header('Content-Type', metadata.mimeType)
      } else {
        // Attempt to guess the MIME type based on the blob contents
        const blobSlice = await blobStore.getEntryBlob(driveId, entry, {
          length: 20,
        })

        if (!blobSlice) {
          reply.code(404)
          throw new BlobNotFoundError()
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
