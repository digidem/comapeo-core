import fastifyWebsocket from '@fastify/websocket'
import fastifySensible from '@fastify/sensible'
import createFastifyPlugin from 'fastify-plugin'
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
 * @prop {string[]} [allowedHosts]
 */

/** @typedef {ComapeoPluginOptions & OtherServerOptions & RouteOptions} ServerOptions */

/** @type {import('fastify').FastifyPluginAsync<ServerOptions>} */
async function comapeoServer(
  fastify,
  {
    serverBearerToken,
    serverName,
    allowedHosts,
    allowedProjects = 1,
    ...comapeoPluginOpts
  }
) {
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
}

export default createFastifyPlugin(comapeoServer, {
  name: 'comapeoServer',
  fastify: '4.x',
})
