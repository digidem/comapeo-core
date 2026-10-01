import {
  COORDINATOR_ROLE_ID,
  MEMBER_ROLE_ID,
  BLOCKED_ROLE_ID,
} from '../roles.js'

/** @import {RoleIdForNewInvite} from '../roles.js' */

/**
 * @typedef {object} InviteLinkParams
 * @property {string} inviteIdString
 * @property {string} swarmPublicKey
 * @property {string} invitorName
 * @property {string} projectName
 * @property {number} expiresAt
 * @property {RoleIdForNewInvite} roleId
 */

import {
  MissingInviteURLParameter,
  InvalidInviteURLKeyParameterError,
  InvalidInviteURLRoleError,
} from '../errors.js'
import { CrockfordBase32 } from 'crockford-base32'

/**
 * @type {Record<keyof InviteLinkParams, string>}
 */
export const URL_PARAM_MAPPINGS = {
  inviteIdString: 'i',
  swarmPublicKey: 'd',
  invitorName: 'n',
  projectName: 'p',
  expiresAt: 'e',
  roleId: 'r',
}

/** @type {Record<string, RoleIdForNewInvite>} */
const ROLE_MAP = {
  c: COORDINATOR_ROLE_ID,
  m: MEMBER_ROLE_ID,
  b: BLOCKED_ROLE_ID,
}

export const INTERNET_INVITE_PAGE = 'https://a.comapeo.app/invite'

/**
 * @param {string} url
 * @returns {InviteLinkParams}
 */
export function parseInviteURL(url) {
  const { hash } = new URL(url)

  const params = new URLSearchParams(hash.slice(1))

  /**
   * @type {Partial<InviteLinkParams>}
   */
  const opts = {}

  for (const [optName, paramName] of Object.entries(URL_PARAM_MAPPINGS)) {
    const value = params.get(paramName)
    if (!value) throw new MissingInviteURLParameter({ paramName })
    if (optName === 'expiresAt') {
      // Convert timestamp from seconds string to milliseconds number
      opts[optName] = parseInt(value) * 1000
    } else if (optName === 'roleId') {
      const roleId = ROLE_MAP[value]
      if (!roleId) throw new InvalidInviteURLRoleError({ value })
      opts.roleId = roleId
    } else if (optName === 'inviteIdString' || optName === 'swarmPublicKey') {
      // Decode z32 and convert to hex
      const decoded = CrockfordBase32.decode(value)
      if (decoded.length !== 32) {
        throw new InvalidInviteURLKeyParameterError({
          paramName: optName,
          byteLength: decoded.length,
        })
      }
      // @ts-ignore Type narrowing on computed key not precise enough
      opts[/**@type {keyof InviteLinkParams}*/ (optName)] =
        decoded.toString('hex')
    } else {
      // @ts-ignore It complains about the use of Partial
      opts[/**@type {keyof InviteLinkParams}*/ (optName)] = value
    }
  }

  return validateGotAllURLOpts(opts)
}

/**
 * @param {InviteLinkParams} opts
 * @returns {string}
 */
export function makeInviteURL(opts) {
  const params = new URLSearchParams()
  for (const [optName, paramName] of Object.entries(URL_PARAM_MAPPINGS)) {
    let value = opts[/**@type {keyof InviteLinkParams}*/ (optName)]
    if (typeof value === 'number') {
      // Convert milliseconds timestamp to seconds and then to a string
      value = Math.floor(value / 1000).toString()
    } else if (optName === 'inviteIdString' || optName === 'swarmPublicKey') {
      value = CrockfordBase32.encode(Buffer.from(value, 'hex'))
    }
    if (optName === 'roleId') {
      for (const [paramValue, roleId] of Object.entries(ROLE_MAP)) {
        if (roleId === value) {
          value = paramValue
          break
        }
      }
    }
    params.set(paramName, value)
  }
  const url = INTERNET_INVITE_PAGE + `#` + params.toString()

  return url
}

/**
 *
 * @param {Partial<InviteLinkParams>} opts
 * @returns {InviteLinkParams}
 */
function validateGotAllURLOpts(opts) {
  for (const paramName in opts) {
    if (!opts[/**@type {keyof InviteLinkParams}*/ (paramName)]) {
      throw new MissingInviteURLParameter({ paramName })
    }
  }
  // @ts-ignore
  return opts
}
