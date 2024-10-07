import fastifyWebsocket from '@fastify/websocket'
import createFastify from 'fastify'
import fastifySensible from '@fastify/sensible'
import routes from './routes.js'
import comapeoPlugin from './comapeo-plugin.js'
/** @import { FastifyServerOptions } from 'fastify' */
/** @import { ComapeoPluginOptions } from './comapeo-plugin.js' */

/**
 * @internal
 * @typedef {object} OtherServerOptions
 * @prop {FastifyServerOptions['logger']} [logger]
 * @prop {string} serverBearerToken
 */

/** @typedef {ComapeoPluginOptions & OtherServerOptions} ServerOptions */

/**
 * @param {ServerOptions} opts
 * @returns
 */
export default function createServer({
  logger,
  serverBearerToken,
  ...comapeoPluginOpts
}) {
  const fastify = createFastify({ logger })
  fastify.register(fastifyWebsocket)
  fastify.register(fastifySensible, { sharedSchemaId: 'HttpError' })
  fastify.register(comapeoPlugin, comapeoPluginOpts)
  fastify.register(routes, { serverBearerToken })
  return fastify
}
