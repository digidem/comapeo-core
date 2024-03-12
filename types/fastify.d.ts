import fastify from 'fastify'

import { StaticMapsPluginDecorator } from '../src/fastify-plugins/maps/static-maps.js'

declare module 'fastify' {
  export interface FastifyInstance {
    mapeoStaticMaps: StaticMapsPluginDecorator
  }
}
