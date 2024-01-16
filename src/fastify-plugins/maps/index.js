import fp from 'fastify-plugin'

import { PLUGIN_NAME as MAPEO_STATIC_MAPS } from './static-maps.js'
import { getFastifyServerAddress } from '../utils.js'

export const PLUGIN_NAME = 'mapeo-maps'

export const plugin = fp(mapsPlugin, {
  fastify: '4.x',
  name: PLUGIN_NAME,
  decorators: { fastify: ['mapeoStaticMaps'] },
  dependencies: [MAPEO_STATIC_MAPS],
})

/**
 * @typedef {{ prefix?: string }} MapsPluginOpts
 */

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts>} */
async function mapsPlugin(fastify, opts) {
  fastify.register(routes, {
    prefix: opts.prefix,
  })
}

/** @type {import('fastify').FastifyPluginAsync<MapsPluginOpts, import('fastify').RawServerDefault, import('@fastify/type-provider-typebox').TypeBoxTypeProvider>} */
async function routes(fastify) {
  fastify.get('/style.json', async (req, rep) => {
    const serverAddress = await getFastifyServerAddress(req.server.server)
    // TODO: Figure out how to do interface merging: https://fastify.dev/docs/latest/Reference/TypeScript/#plugins
    // @ts-expect-error
    const { data, headers } = await fastify.mapeoStaticMaps.getStyleJsonInfo(
      'default',
      serverAddress
    )

    rep.headers(headers)
    rep.send(data)
  })
}
