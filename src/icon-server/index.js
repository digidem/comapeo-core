import fastify from 'fastify'
import IconServerPlugin from './fastify-plugin.js'

/**
 * @param {object} opts
 * @param {import('fastify').FastifyServerOptions['logger']} opts.logger
 * @param {import('fastify').RegisterOptions['prefix']} opts.prefix
 * @param {import('../mapeo-manager.js').MapeoManager} opts.manager
 **/
export function createIconServer({ logger, prefix, manager }) {
  const server = fastify({ logger })
  server.register(IconServerPlugin, {
    prefix,
    manager,
  })
  return server
}
