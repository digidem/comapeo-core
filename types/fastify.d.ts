import fastify from 'fastify'

import { StaticMapsPluginDecorator } from '../src/fastify-plugins/maps/static-maps.js'
import { FallbackMapPluginDecorator } from '../src/fastify-plugins/maps/offline-fallback-map.js'

declare module 'fastify' {
  export interface FastifyInstance {
    mapeoFallbackMap: FallbackMapPluginDecorator
    mapeoStaticMaps: StaticMapsPluginDecorator
  }
}
