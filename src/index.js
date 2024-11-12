import {
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from './roles.js'
import { kProjectReplicate } from './mapeo-project.js'
export { plugin as CoMapeoMapsFastifyPlugin } from './fastify-plugins/maps.js'
export { FastifyController } from './fastify-controller.js'
export { MapeoManager } from './mapeo-manager.js'
/** @import { MapeoProject } from './mapeo-project.js' */

/**
 * @param {MapeoProject} project
 * @param {Parameters<MapeoProject.prototype[kProjectReplicate]>} args
 * @returns {ReturnType<MapeoProject.prototype[kProjectReplicate]>}
 */
export const replicateProject = (project, ...args) =>
  project[kProjectReplicate](...args)

export const roles = /** @type {const} */ ({
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
})
