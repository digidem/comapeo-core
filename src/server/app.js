import fastifyWebsocket from '@fastify/websocket'
import createFastify from 'fastify'
import fastifySensible from '@fastify/sensible'

import routes from './routes.js'
import comapeoPlugin from './comapeo-plugin.js'

/** @import { ComapeoPluginOptions } from './comapeo-plugin.js' */
/** @typedef {import('fastify').FastifyServerOptions['logger']} FastifyLogger */
/** @typedef {{ logger?: FastifyLogger } & ComapeoPluginOptions} ServerOptions */

/**
 * @param {ServerOptions} opts
 * @returns
 */
export default function createServer({ logger, ...comapeoPluginOpts }) {
  const fastify = createFastify({ logger })
  fastify.register(fastifyWebsocket)
  fastify.register(fastifySensible, { sharedSchemaId: 'HttpError' })
  fastify.register(comapeoPlugin, comapeoPluginOpts)
  fastify.register(routes)
  return fastify
}
