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
 * @typedef {Buffer} TopicBuffer
 */

/**
 * @typedef {string} TopicString hex string representation of `Topic` Buffer
 */

/**
 * @typedef {string} MdnsTopicString 52 character base32 encoding of `Topic` Buffer
 */

/**
 * @typedef {Object} NoiseSecretStream
 * @property {Buffer} remotePublicKey
 * @property {number} remotePort
 * @property {string} remoteHost
 * @property {import('net').Socket} rawStream
 * @property {function} end
 */

/**
 * @typedef {import('streamx').Stream<any, false, false, ConnectionStreamEvents> & NoiseSecretStream} ConnectionStream
 */

/**
 * @typedef {Object} ConnectionStreamEvents
 * @property {(connect: void) => void} connect
 * @property {(close: void) => void} close
 * @property {(error: Error) => void} error
 */

/**
 * @typedef {Object} HyperswarmPeerInfoObject
 * @property {TopicBuffer[]} topics
 *
 * @typedef {import('events').EventEmitter & HyperswarmPeerInfoObject} HyperswarmPeerInfo
 */

/**
 * @typedef {Object} DhtOptions
 * @property {Boolean} server
 * @property {Boolean} client
 * @property {Object[]} [bootstrap] Array of {host, port} objects provided by https://github.com/hyperswarm/testnet
 * @property {IdentityKeyPair} [keyPair]
 */

/**
 * @typedef {Object} MdnsOptions
 * @property {IdentityKeyPair} identityKeyPair
 * @property {Number} port
 * @property {String} name
 */
