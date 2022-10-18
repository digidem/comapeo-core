/**
 * @typedef {Object} KeyPair
 * @property {PublicKey} publicKey
 * @property {SecretKey} secretKey
 */

/**
 * @typedef {Buffer} PublicKey 32 byte buffer
 */

/**
 * @typedef {Buffer} SecretKey 32 byte buffer
 */

/**
 * @typedef {string} PublicKeyString hex string representation of `PublicKey` Buffer
 */

/**
 * @typedef {KeyPair} IdentityKeyPair
 */

/**
 * @typedef {PublicKey} IdentityPublicKey
 */

/**
 * @typedef {SecretKey} IdentitySecretKey
 */

/**
 * @typedef {PublicKeyString} IdentityPublicKeyString hex string representation of `IdentityPublicKey` Buffer
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
 * @typedef {Object<string, any>} Doc
 */

/**
 * @typedef {Buffer} Block
 */

// TODO: Figure out where those extra fields come from and find more elegant way to represent this
/**
 * @typedef {import('streamx').Duplex & {remoteAddress: string, remotePort:number}} RawDhtConnectionStream
 */

/**
 * @typedef {import('net').Socket | RawDhtConnectionStream} RawConnectionStream
 */

/**
 * @typedef {Object} DhtNode
 *
 * @property {string} host
 * @property {number} port
 */

/**
 * @typedef {Object} DhtOptions
 * @property {Boolean} server
 * @property {Boolean} client
 * @property {DhtNode[]} [bootstrap] Array of {host, port} objects provided by https://github.com/hyperswarm/testnet
 * @property {IdentityKeyPair} [keyPair]
 */

/**
 * @typedef {Object} MdnsOptions
 * @property {IdentityKeyPair} identityKeyPair
 * @property {Number} port
 * @property {String} name
 */
