import fastifyWebsocket from '@fastify/websocket'
import createFastify from 'fastify'
import fastifySensible from '@fastify/sensible'
import routes from './routes.js'
import comapeoPlugin from './comapeo-plugin.js'
import baseUrlPlugin from './base-url-plugin.js'
import allowedHostsPlugin from './allowed-hosts-plugin.js'
/** @import { FastifyServerOptions } from 'fastify' */
/** @import { ComapeoPluginOptions } from './comapeo-plugin.js' */
/** @import { RouteOptions } from './routes.js' */

/**
 * @internal
 * @typedef {object} OtherServerOptions
 * @prop {FastifyServerOptions['logger']} [logger]
 * @prop {string[]} [allowedHosts]
 */

/** @typedef {ComapeoPluginOptions & OtherServerOptions & RouteOptions} ServerOptions */

/**
 * @param {ServerOptions} opts
 * @returns
 */
export default function createServer({
  logger,
  serverBearerToken,
  serverName,
  allowedHosts,
  allowedProjects = 1,
  ...comapeoPluginOpts
}) {
  const fastify = createFastify({ logger })
  fastify.register(fastifyWebsocket)
  fastify.register(fastifySensible, { sharedSchemaId: 'HttpError' })
  fastify.register(allowedHostsPlugin, { allowedHosts })
  fastify.register(baseUrlPlugin)
  fastify.register(comapeoPlugin, comapeoPluginOpts)
  fastify.register(routes, {
    serverBearerToken,
    serverName,
    allowedProjects,
  })
  return fastify
}
