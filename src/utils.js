import sodium from 'sodium-universal'
import { keyToPublicId } from '@mapeo/crypto'
import { createHash } from 'node:crypto'
import stableStringify from 'json-stable-stringify'
import { omit } from './lib/omit.js'

/** @import {Attachment, BlobId} from "./types.js" */

const PROJECT_INVITE_ID_SALT = Buffer.from('mapeo project invite id', 'ascii')

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

export class ExhaustivenessError extends Error {
  /** @param {never} value */
  constructor(value) {
    super(`Exhaustiveness check failed. ${value} should be impossible`)
    this.name = 'ExhaustivenessError'
  }
}

/**
 * @returns {void}
 */
export function noop() {}

/**
 * @param {unknown} condition
 * @param {string | Error} messageOrError
 * @returns {asserts condition}
 */
export function assert(condition, messageOrError) {
  if (condition) return
  if (typeof messageOrError === 'string') {
    throw new Error(messageOrError)
  } else {
    throw messageOrError
  }
}

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
    throw new Error(`Cannot fetch URL for attachment type "${attachment.type}"`)
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
