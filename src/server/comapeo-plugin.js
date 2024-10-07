import { MapeoManager } from '../mapeo-manager.js'
import createFastifyPlugin from 'fastify-plugin'

/**
 * @typedef {Omit<ConstructorParameters<typeof MapeoManager>[0], 'fastify'> & {
 *   serverName: string;
 *   serverPublicBaseUrl: string;
 * }} ComapeoPluginOptions
 */

/** @type {import('fastify').FastifyPluginAsync<ComapeoPluginOptions>} */
const comapeoPlugin = async function (fastify, opts) {
  const comapeo = new MapeoManager({
    ...opts,
    fastify,
    // TODO(evanhahn)
    // deviceType: 'selfHostedServer',
  })
  fastify.decorate('comapeo', comapeo)
  const existingDeviceInfo = comapeo.getDeviceInfo()
  if (existingDeviceInfo.deviceType === 'device_type_unspecified') {
    await comapeo.setDeviceInfo({
      deviceType: 'selfHostedServer',
      name: opts.serverName,
      selfHostedServerDetails: {
        baseUrl: opts.serverPublicBaseUrl,
      },
    })
  }
}

export default createFastifyPlugin(comapeoPlugin, { name: 'comapeo' })
