import fastify from 'fastify'
import IconServerPlugin from './fastify-plugin.js'

/**
 * @param {object} opts
 * @param {import('fastify').FastifyServerOptions['logger']} opts.logger
 * @param {import('fastify').RegisterOptions['prefix']} opts.prefix
 * @param {import('../core-manager/index.js').CoreManager} opts.coreManager
 * @param {import('../datatype/index.js').DataType<
 *   import('../datastore/index.js').DataStore<'config'>,
 *   typeof import('../schema/project.js').iconTable,
 *   'icon',
 *   import('@mapeo/schema').Icon,
 *   import('@mapeo/schema').IconValue>} opts.iconDataType
 **/
export function createIconServer({
  logger,
  prefix,
  coreManager,
  iconDataType,
}) {
  const server = fastify({ logger })
  server.register(IconServerPlugin, {
    prefix,
    coreManager,
    iconDataType,
  })
  return server
}
