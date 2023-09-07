import {
  Invite,
  InviteResponse,
  Invite_ProjectInfo,
  InviteResponse_Decision,
} from '../generated/rpc.js'

/** @typedef {import('type-fest').SetNonNullable<import('../generated/rpc.js').IInvite, 'encryptionKeys'>} IInvite */
/** @typedef {import('../generated/rpc.js').IInviteResponse} IInviteResponse */
/** @typedef {import('../generated/rpc.js').IInvite_ProjectInfo} IInvite_ProjectInfo  */

/**
 * @param {import('../generated/rpc.js').IInvite} message
 * @returns {asserts message is IInvite}
 */
function inviteValidate(message) {
  if (message.encryptionKeys === undefined) {
    throw new Error('encryptionKeys must be defined')
  }
}

// TODO: Ideally this asserts that `message.encryptionKeys` is non-nullable but TS isn't cooperating,
// and we can't add the assert annotation directly here because this needs to return a value
/**
 * @param {import('../generated/rpc.js').IInvite} message
 * @param {Parameters<typeof Invite['encode']>[1]} [writer]
 * @returns {ReturnType<typeof Invite['encode']>}
 */
function inviteEncode(message, writer) {
  inviteValidate(message)
  return Invite.encode(message, writer)
}

/**
 * @param {Parameters<typeof Invite['decode']>[0]} input
 * @param {Parameters<typeof Invite['decode']>[1]} [length]
 * @returns {IInvite}
 */
function inviteDecode(input, length) {
  const invite = Invite.decode(input, length)
  inviteValidate(invite)
  return invite
}

const InviteTransformer = {
  decode: inviteDecode,
  encode: inviteEncode,
  validate: inviteValidate,
}

export {
  Invite_ProjectInfo,
  InviteResponse_Decision,
  InviteResponse,
  InviteTransformer as Invite,
}
