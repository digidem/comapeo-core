/**
 * @typedef {Object} KeyPair
 * @property {PublicKey} publicKey
 * @property {SecretKey} secretKey
 */

/**
 * @typedef {Object} RoleDetails
 * @property {string} name
 * @property {string[]} capabilities
 */

/**
 * @typedef {RoleDetails[]} AvailableRoles
 */

/**
 * @typedef {Object} Statement
 * @property {String} id
 * @property {String} type
 * @property {String} version
 * @property {String} signature
 * @property {String} action
 * @property {String} authorId
 * @property {Number} authorIndex
 * @property {Number} deviceIndex
 * @property {String} created
 * @property {String} timestamp
 * @property {String[]} links
 * @property {String[]} forks
 */

/**
 * @typedef {Statement & { coreId: String }} CoreOwnershipStatement
 */

/**
 * @typedef {Statement & { role: String }} RoleStatement
 */

/**
 * @typedef {Statement} DeviceStatement
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
 * @typedef {Object} Doc
 * @property {String} [id]
 * @property {String} type
 * @property {String} version
 * @property {String} authorId
 * @property {String} created
 * @property {String} timestamp
 * @property {String[]} [links]
 * @property {String[]} [forks]
 */

/**
 * @typedef {Buffer} Block
 */

/**
 * @typedef {String} BlockPrefix
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

// TODO: export from multi-core-indexer
/**
 * @typedef {Object} Entry
 * @property {Number} index
 * @property {Buffer} key
 * @property {Block} block
 */

// TODO: replace with real hypercore/corestore types
/**
 * @typedef {import('corestore')<T>} Corestore
 */

/**
 * @typedef {import('hypercore')<T>} Core
 */
