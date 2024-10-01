import { MapeoManager } from '../mapeo-manager.js'
import createFastifyPlugin from 'fastify-plugin'

/**
 * @typedef {ConstructorParameters<typeof MapeoManager>[0]} ComapeoPluginOptions
 */

/** @type {import('fastify').FastifyPluginAsync<ComapeoPluginOptions>} */
const comapeoPlugin = async function (fastify, opts) {
  fastify.decorate('comapeo', new MapeoManager(opts))
  // TODO: Check if deviceInfo is already set, and if not, set it.
}

export default createFastifyPlugin(comapeoPlugin, { name: 'comapeo' })
