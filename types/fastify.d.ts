import fastify from 'fastify'

import { MapsPluginContext } from '../src/fastify-plugins/maps/index.js'
import { StaticMapsPluginDecorator } from '../src/fastify-plugins/maps/static-maps.js'
import { FallbackMapPluginDecorator } from '../src/fastify-plugins/maps/offline-fallback-map.js'

declare module 'fastify' {
  export interface FastifyInstance {
    mapeoFallbackMap: FallbackMapPluginDecorator
    mapeoMaps: MapsPluginContext
    mapeoStaticMaps: StaticMapsPluginDecorator
  }
}
