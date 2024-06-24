import {
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from './roles.js'
export { plugin as MapeoStaticMapsFastifyPlugin } from './fastify-plugins/maps/static-maps.js'
export { plugin as MapeoOfflineFallbackMapFastifyPlugin } from './fastify-plugins/maps/offline-fallback-map.js'
export { plugin as MapeoMapsFastifyPlugin } from './fastify-plugins/maps/index.js'
export { FastifyController } from './fastify-controller.js'
export { MapeoManager } from './mapeo-manager.js'

export const roles = /** @type {const} */ ({
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
})
