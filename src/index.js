import {
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
} from './roles.js'
import { kProjectReplicate } from './mapeo-project.js'
export { plugin as CoMapeoMapsFastifyPlugin } from './fastify-plugins/maps.js'
export { FastifyController } from './fastify-controller.js'
export { MapeoManager } from './mapeo-manager.js'

// Type exports
/** @typedef {import('./mapeo-project.js').MapeoProject} MapeoProject */
/** @typedef {import('./mapeo-project.js').EditableProjectSettings} EditableProjectSettings */
/**
 * @namespace IconApi
 * @typedef {import('./icon-api.js').BitmapOpts} IconApi.BitmapOpts
 * @typedef {import('./icon-api.js').SvgOpts} IconApi.SvgOpts
 */
/**
 * @namespace BlobApi
 * @typedef {import('./types.js').BlobId} BlobApi.BlobId
 * @typedef {import('./blob-api.js').Metadata} BlobApi.Metadata
 */
// This needs to be defined in a separate comment block so that the @template definition works.
/**
 * @template {import('./types.js').BlobType} TBlobType
 * @typedef {import('./types.js').BlobVariant<TBlobType>} BlobApi.BlobVariant
 */
/**
 * @namespace InviteApi
 * @typedef {import('./invite/invite-api.js').Invite} InviteApi.Invite
 */
/**
 * @namespace MemberApi
 * @typedef {import('./member-api.js').MemberInfo} MemberApi.MemberInfo
 * @typedef {import('./roles.js').RoleId} MemberApi.RoleId
 * @typedef {import('./roles.js').RoleIdForNewInvite} MemberApi.RoleIdForNewInvite
 */
/**
 * @param {MapeoProject} project
 * @param {(
 *   boolean |
 *   import('stream').Duplex |
 *   import('streamx').Duplex
 * )} isInitiatorOrStream
 * @returns {import('./types.js').ReplicationStream}
 */
export const replicateProject = (project, isInitiatorOrStream) =>
  project[kProjectReplicate](isInitiatorOrStream)

export const roles = /** @type {const} */ ({
  CREATOR_ROLE_ID,
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
})
