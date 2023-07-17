import assert from 'node:assert'
import fp from 'fastify-plugin'
import { filetypemime } from 'magic-bytes.js'

import { SUPPORTED_BLOB_VARIANTS } from '../blob-store/index.js'

/**
 * @typedef {Object} BlobsServerPluginOpts
 *
 * @property {import('../blob-store/index.js').BlobStore} blobStore
 * @property {string} [prefix]
 */

/**
 * @typedef {Object} ParsedParams
 *
 * @property {string} driveId
 * @property {import('../types').BlobType} type
 * @property {import('../types').BlobVariant<ParsedParams['type']>} variant
 * @property {string} name
 */

/** @type {import('fastify').FastifySchema['params']} */
const PARAMS_JSON_SCHEMA = /** @type {const} */ {
  type: 'object',
  required: ['driveId', 'type', 'variant', 'name'],
  properties: {
    driveId: { type: 'string' },
    type: { type: 'string', enum: Object.keys(SUPPORTED_BLOB_VARIANTS) },
    variant: {
      type: 'string',
      enum: [...new Set(Object.values(SUPPORTED_BLOB_VARIANTS).flat())],
    },
    name: { type: 'string' },
  },
}

export default fp(blobServerPlugin, {
  fastify: '4.x',
  name: 'mapeo-blob-server',
})

/** @type {import('fastify').FastifyPluginAsync<BlobsServerPluginOpts>} */
async function blobServerPlugin(fastify, options) {
  // We call register here so that the `prefix` option can work if desired
  // https://fastify.dev/docs/latest/Reference/Routes#route-prefixing-and-fastify-plugin
  fastify.register(routes, options)
}

/** @type {import('fastify').FastifyPluginAsync<Omit<BlobsServerPluginOpts, 'prefix'>>} */
async function routes(fastify, options) {
  const { blobStore } = options

  fastify.get(
    '/:driveId/:type/:variant/:name',
    { schema: { params: PARAMS_JSON_SCHEMA } },
    /**
     * @param {import('fastify').FastifyRequest<{ Params: ParsedParams }>} request
     */
    async (request, reply) => {
      const { driveId, type, variant, name } = request.params

      const blobId = constructBlobId(driveId, type, variant, name)

      const entry = await blobStore.entry(blobId)
      const { blob, metadata } = entry.value

      const drive = blobStore.getDrive(blobId.driveId)
      const blobs = await drive.getBlobs()

      const blobsStream = blobs.createReadStream(blob)

      // Extract the 'mime' property of the metadata and use it for the response header if found
      if (metadata && 'mime' in metadata && typeof metadata.mime === 'string') {
        reply.header('Content-Type', metadata.mime)
      } else {
        // Attempt to guess the MIME type based on the blob contents
        const blobSlice = await blobs.get(entry.value.blob, {
          start: 0,
          length: 20,
        })

        const [guessedMime] = filetypemime(blobSlice)

        reply.header('Content-Type', guessedMime || 'application/octet-stream')
      }

      return reply.send(blobsStream)
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
