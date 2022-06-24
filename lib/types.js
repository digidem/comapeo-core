/**
 * @typedef {Object} IdentityKeyPair
 * @property {IdentityPublicKey} publicKey
 * @property {IdentitySecretKey} secretKey
 */

/**
 * @typedef {Buffer} IdentityPublicKey 32 byte buffer
 */

/**
 * @typedef {Buffer} IdentitySecretKey 32 byte buffer
 */

/**
 * @typedef {string} IdentityPublicKeyString hex string representation of `IdentityPublicKey` Buffer
 */

/**
 * @typedef {Buffer} Topic
 */

/**
 * @typedef {string} TopicString hex string representation of `Topic` Buffer
 */

/**
 * @typedef {Object} NoiseSecretStream
 * @property {Buffer} remotePublicKey
 * @property {number} remotePort
 * @property {string} remoteHost
 */

/**
 * @typedef {Object} HyperswarmPeerInfo
 * @property {Buffer[]} topics
 */

/**
 * @typedef {Object} DhtOptions
 * @property {IdentityKeyPair} keyPair
 * @property {boolean} server
 * @property {boolean} client
 */

/**
 * @typedef {Object} MdnsOptions
 * @property {IdentityKeyPair} identityKeyPair
 * @property {number} port
 * @property {string} name
 */
