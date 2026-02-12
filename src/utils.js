import sodium from 'sodium-universal'
import { keyToPublicId } from '@mapeo/crypto'
import { createHash } from 'node:crypto'
import stableStringify from 'json-stable-stringify'
import { omit } from './lib/omit.js'
import {
  UnsupportedAttachmentTypeError,
  TimeoutError,
  ensureKnownError,
  InvalidMapShareError,
} from './errors.js'
import pTimeout, { TimeoutError as pTimeoutError } from 'p-timeout'

/** @import { MapShareExtension } from './generated/extensions.js' */
/** @import {Attachment, BlobId} from "./types.js" */

const PROJECT_INVITE_ID_SALT = Buffer.from('mapeo project invite id', 'ascii')

export const MAX_BOUNDS = [-180, -85.051129, 180, 85.051129]

/**
 *
 * @param {Buffer|String} key
 * @returns {String}
 */
export function keyToId(key) {
  if (typeof key === 'string') {
    return key
  }

  return key.toString('hex')
}

/**
 * @returns {void}
 */
export function noop() {}

/**
 * Return a function that itself returns whether a value is part of the set.
 *
 * Similar to binding `Set.prototype.has`, but (1) is shorter (2) refines the type.
 *
 * @template T
 * @param {Readonly<Set<T>>} set
 * @example
 * const mySet = new Set([1, 2, 3])
 * const isInMySet = setHas(mySet)
 *
 * console.log(isInMySet(2))
 * // => true
 */
export function setHas(set) {
  /**
   * @param {unknown} value
   * @returns {value is T}
   */
  return (value) => set.has(/** @type {*} */ (value))
}

/**
 * @template T
 * @param {undefined | T} value
 * @returns {value is T}
 */
export function isDefined(value) {
  return value !== undefined
}

/**
 * When reading from SQLite, any optional properties are set to `null`. This
 * converts `null` back to `undefined` to match the input types (e.g. the types
 * defined in @comapeo/schema)
 * @template {{}} T
 * @param {T} obj
 * @returns {import('./types.js').NullableToOptional<T>}
 */
export function deNullify(obj) {
  /** @type {Record<string, any>} */
  const objNoNulls = {}
  for (const [key, value] of Object.entries(obj)) {
    objNoNulls[key] = value === null ? undefined : value
  }
  return /** @type {import('./types.js').NullableToOptional<T>} */ (objNoNulls)
}

/**
 * __Mutating__
 * When reading from SQLite, any optional properties are set to `null`. This
 * converts `null` back to `undefined` to match the input types (e.g. the types
 * defined in @comapeo/schema)
 * @template {{}} T
 * @param {T} obj
 * @returns {import('./types.js').NullableToOptional<T>}
 */
export function mutatingDeNullify(obj) {
  for (const key of Object.keys(obj)) {
    // @ts-expect-error
    if (obj[key] === null) {
      // @ts-expect-error
      obj[key] = undefined
    }
  }
  return /** @type {import('./types.js').NullableToOptional<T>} */ (obj)
}

/**
 * @template {import('@comapeo/schema').MapeoDoc & { forks?: string[], createdBy?: string, updatedBy?: string }} T
 * @param {T} doc
 * @returns {Omit<T, 'docId' | 'versionId' | 'originalVersionId' | 'links' | 'forks' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'deleted' >}
 */
export function valueOf(doc) {
  return omit(doc, [
    'docId',
    'versionId',
    'originalVersionId',
    'links',
    'forks',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'deleted',
  ])
}

/**
 * Create an internal ID from a project key
 * @param {Buffer} projectKey
 * @returns {string}
 */
export function projectKeyToId(projectKey) {
  return projectKey.toString('hex')
}

/**
 * Create a public ID from a project key
 * @param {Buffer} projectKey
 * @returns {string}
 */
export function projectKeyToPublicId(projectKey) {
  return keyToPublicId(projectKey)
}

/**
 * Generate an invite ID from a project key
 * @param {Readonly<Buffer>} projectKey
 * @returns {Buffer}
 */
export function projectKeyToProjectInviteId(projectKey) {
  const result = Buffer.allocUnsafe(32)
  sodium.crypto_generichash(result, PROJECT_INVITE_ID_SALT, projectKey)
  return result
}

/**
 * @param {string} projectId Project internal ID
 * @returns {Buffer} 24-byte nonce (same length as sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
 */
export function projectIdToNonce(projectId) {
  return Buffer.from(projectId, 'hex').subarray(0, 24)
}

/**
 * @param {import('@mapeo/crypto').KeyManager} keyManager
 * @returns {string}
 */
export function getDeviceId(keyManager) {
  return keyManager.getIdentityKeypair().publicKey.toString('hex')
}

/**
 * Small helper to create a typed map
 *
 * @template {string} K
 * @template {any} V
 * @param {ReadonlyArray<K>} keys
 * @param {V} value
 * @returns {Record<K, V extends () => infer T ? T : V>} */
export function createMap(keys, value) {
  const map = /** @type {Record<K, V extends () => infer T ? T : V>} */ ({})
  for (const key of keys) {
    map[key] = typeof value === 'function' ? value() : value
  }
  return map
}

/**
 * create a sha256 hash of an object using json-stable-stringify for deterministic results
 * @param {Object} obj
 * @returns {String} hash of the object
 */
export function hashObject(obj) {
  return createHash('sha256')
    .update(stableStringify(obj))
    .digest()
    .toString('hex')
}

/**
 * Convert attachments to BlobIds for use in the BlobStore, adapted from comapeo-mobile
 * @param {Attachment} attachment
 * @param {'original' | 'thumbnail' | 'preview'} requestedVariant
 * @returns {BlobId}
 */
export function buildBlobId(attachment, requestedVariant) {
  if (
    attachment.type !== 'photo' &&
    attachment.type !== 'audio' &&
    attachment.type !== 'video'
  ) {
    throw new UnsupportedAttachmentTypeError(attachment.type)
  }

  if (attachment.type === 'photo') {
    return {
      type: 'photo',
      variant: requestedVariant,
      name: attachment.name,
      driveId: attachment.driveDiscoveryId,
    }
  }

  return {
    type: attachment.type,
    variant: 'original',
    name: attachment.name,
    driveId: attachment.driveDiscoveryId,
  }
}

/**
 * Get typed entries from an object. Use this only on objects that you are
 * certain have no extra properties - TS does not check for extra properties on
 * an object, which is why Object.entries is untyped by default.
 *
 * @template {Record<string, unknown>} T
 * @param {T} obj - The object to get entries from (must _not_ have extra properties)
 * @returns {import('type-fest').Entries<T>}
 */
export function typedEntries(obj) {
  return /** @type {import('type-fest').Entries<T>} */ (Object.entries(obj))
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} milliseconds
 * @param {() => Promise<T>|T} [fallback]
 * @returns {Promise<T>}
 */
export async function timeoutAfter(promise, milliseconds, fallback) {
  try {
    return await pTimeout(promise, { milliseconds })
  } catch (err) {
    if (err instanceof pTimeoutError) {
      if (fallback) return fallback()
      throw new TimeoutError()
    }
    throw ensureKnownError(err)
  }
}

/**
 * Validate map share extension messages to check that all their parameters make sense
 * Does not validate device ID or device name
 *
 * @param {MapShareExtension} mapShare
 * @returns {asserts mapShare is { [K in keyof MapShareExtension]: import('./mapeo-project.js').MapShare[K] }} - this validates the properties that MapShareExtension and MapShare have in common - bounds tuple and mapShareUrls
 */
export function validateMapShareExtension(mapShare) {
  const {
    mapShareUrls,
    receiverDeviceId,
    mapId,
    mapName,
    shareId,
    bounds,
    minzoom,
    maxzoom,
    estimatedSizeBytes,
    mapCreatedAt,
    mapShareCreatedAt,
  } = mapShare

  if (!receiverDeviceId.length) {
    throw new InvalidMapShareError('Receiver Device ID must not be empty')
  }
  if (!mapId.length) throw new InvalidMapShareError('Map ID must not be empty')
  if (!shareId.length) {
    throw new InvalidMapShareError('Share ID must not be empty')
  }
  if (!mapName.length) {
    throw new InvalidMapShareError('Map Name must not be empty')
  }
  if (!mapShareUrls.length) {
    throw new InvalidMapShareError('Map share URLs must not be empty')
  }
  if (!mapShareUrls.every((url) => URL.canParse(url))) {
    throw new InvalidMapShareError('Map share URLs must be valid URLs')
  }
  if (!mapCreatedAt) throw new InvalidMapShareError('mapCreatedAt must be set')
  if (!mapShareCreatedAt) {
    throw new InvalidMapShareError('mapShareCreatedAt must be set')
  }
  if (bounds.length !== 4) {
    throw new InvalidMapShareError('Bounds must be bounding box with 4 values')
  }
  if (bounds[0] < MAX_BOUNDS[0]) {
    throw new InvalidMapShareError(
      `Bounds at ${0} must be within max of spherical mercator projection ${MAX_BOUNDS}`
    )
  }
  if (bounds[1] < MAX_BOUNDS[1]) {
    throw new InvalidMapShareError(
      `Bounds at ${1} must be within max of spherical mercator projection ${MAX_BOUNDS}`
    )
  }
  if (bounds[2] > MAX_BOUNDS[2]) {
    throw new InvalidMapShareError(
      `Bounds at ${2} must be within max of spherical mercator projection ${MAX_BOUNDS}`
    )
  }
  if (bounds[3] > MAX_BOUNDS[3]) {
    throw new InvalidMapShareError(
      `Bounds at ${3} must be within max of spherical mercator projection ${MAX_BOUNDS}`
    )
  }
  if (maxzoom < minzoom) {
    throw new InvalidMapShareError(
      'Max zoom must be greater than or equal to min zoom'
    )
  }
  if (maxzoom < 0 || maxzoom > 22) {
    throw new InvalidMapShareError('Max zoom must be between 0 and 22')
  }
  if (minzoom < 0 || minzoom > 22) {
    throw new InvalidMapShareError('Min zoom must be between 0 and 22')
  }
  if (estimatedSizeBytes <= 0) {
    throw new InvalidMapShareError('Map size bytes must greater than zero')
  }
}
