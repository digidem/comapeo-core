import {
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from './roles.js'
export { plugin as CoMapeoMapsFastifyPlugin } from './fastify-plugins/maps.js'
export { FastifyController } from './fastify-controller.js'
export { MapeoManager } from './mapeo-manager.js'

export const roles = /** @type {const} */ ({
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
})
