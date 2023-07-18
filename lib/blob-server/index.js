import fastify from 'fastify'

import BlobServerPlugin from './fastify-plugin.js'

/**
 * @param {object} opts
 * @param {import('fastify').FastifyServerOptions['logger']} opts.logger
 * @param {import('./fastify-plugin.js').BlobServerPluginOpts['blobStore']} opts.blobStore
 * @param {import('./fastify-plugin.js').BlobServerPluginOpts['prefix']} opts.prefix
 */
export function createBlobServer({ logger, blobStore, prefix }) {
  const server = fastify({ logger })
  server.register(BlobServerPlugin, { blobStore, prefix })
  return server
}
