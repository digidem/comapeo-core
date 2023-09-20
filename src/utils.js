import b4a from 'b4a'
import { projectKeyToPublicId as keyToPublicId } from '@mapeo/crypto'

/**
 * @param {String|Buffer} id
 * @returns {Buffer | Uint8Array}
 */
export function idToKey(id) {
  if (b4a.isBuffer(id)) {
    return /** @type {Buffer} */ (id)
  }

  return b4a.from(/** @type {String} */ (id), 'hex')
}

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
 * @param {String} version
 * @returns {{coreId: String, blockIndex: Number}}
 */
export function parseVersion(version) {
  const [coreId, blockIndex] = version.split('@')
  return {
    coreId,
    blockIndex: Number(blockIndex),
  }
}

/**
 * Truncate a key or id to a string with a given length with a default of 3 characters.
 * @param {String|Buffer} keyOrId
 */
export function truncateId(keyOrId, length = 3) {
  return keyToId(keyOrId).slice(0, length)
}

/** @typedef {import('@hyperswarm/secret-stream')} NoiseStream */
/** @typedef {NoiseStream & { destroyed: true }} DestroyedNoiseStream */
/** @typedef {NoiseStream & { publicKey: Buffer, remotePublicKey: Buffer, handshake: Buffer }} OpenedNoiseStream */

/**
 * Utility to await a NoiseSecretStream to open, that returns a stream with the
 * correct types for publicKey and remotePublicKey (which can be null before
 * stream is opened)
 *
 * @param {NoiseStream} stream
 * @returns {Promise<OpenedNoiseStream | DestroyedNoiseStream>}
 */
export async function openedNoiseSecretStream(stream) {
  await stream.opened
  return /** @type {OpenedNoiseStream | DestroyedNoiseStream} */ (stream)
}

/**
 * When reading from SQLite, any optional properties are set to `null`. This
 * converts `null` back to `undefined` to match the input types (e.g. the types
 * defined in @mapeo/schema)
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
 * @template {import('@mapeo/schema').MapeoDoc & { forks: string[] }} T
 * @param {T} doc
 * @returns {Omit<T, 'docId' | 'versionId' | 'links' | 'forks' | 'createdAt' | 'updatedAt' | 'createdBy'>}
 */
export function valueOf(doc) {
  /* eslint-disable no-unused-vars */
  const {
    docId,
    versionId,
    links,
    forks,
    createdAt,
    updatedAt,
    createdBy,
    ...rest
  } = doc
  /* eslint-enable no-unused-vars */
  return rest
}

/**
 * Create an internal ID from a project key
 * @param {Buffer} projectKey
 * @returns {import('./types.js').ProjectId}
 */
export function projectKeyToId(projectKey) {
  return /** @type {import('./types.js').ProjectId} */ (
    projectKey.toString('hex')
  )
}

/**
 * Create a public ID from a project key
 * @param {Buffer} projectKey
 * @returns {import('./types.js').ProjectPublicId}
 */
export function projectKeyToPublicId(projectKey) {
  return /** @type {import('./types.js').ProjectPublicId} */ (
    keyToPublicId(projectKey)
  )
}

/**
 * @param {import('./types.js').ProjectId} projectId
 * @returns {Buffer} 24-byte nonce (same length as sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)
 */
export function projectIdToNonce(projectId) {
  return Buffer.from(projectId, 'hex').subarray(0, 24)
}
