import { MapeoManager } from '../mapeo-manager.js'
import createFastifyPlugin from 'fastify-plugin'

/**
 * @typedef {ConstructorParameters<typeof MapeoManager>[0]} ComapeoPluginOptions
 */

/** @type {import('fastify').FastifyPluginAsync<ComapeoPluginOptions>} */
const comapeoPlugin = async function (fastify, opts) {
  fastify.decorate('comapeo', new MapeoManager(opts))
}

export default createFastifyPlugin(comapeoPlugin, { name: 'comapeo' })
