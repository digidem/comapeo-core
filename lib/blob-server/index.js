import fastify from 'fastify'

import BlobServerPlugin from './fastify-plugin.js'

/**
 * @param {object} opts
 * @param {import('fastify').FastifyServerOptions['logger']} opts.logger
 * @param {import('../blob-store/index.js').BlobStore} opts.blobStore
 * @param {import('./fastify-plugin.js').BlobServerPluginOpts['getBlobStore']} opts.getBlobStore
 * @param {import('fastify').RegisterOptions['prefix']} opts.prefix
 * @param {string} opts.projectId Temporary option to enable `getBlobStore` option. Will be removed when multiproject support in Mapeo class is implemented.
 *
 */
export function createBlobServer({ logger, blobStore, prefix, projectId }) {
  const server = fastify({ logger })
  server.register(BlobServerPlugin, {
    getBlobStore: (projId) => {
      // Temporary measure until multiprojects is implemented in Mapeo class
      if (projectId !== projId) throw new Error('Project ID does not match')
      return blobStore
    },
    prefix,
  })
  return server
}
