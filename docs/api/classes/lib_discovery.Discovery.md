[API](../README.md) / [lib/discovery](../modules/lib_discovery.md) / Discovery

# Class: Discovery

[lib/discovery](../modules/lib_discovery.md).Discovery

The `Discovery` class provides an abstraction layer that allows peer discovery using either a distributed hash table (DHT) or Multicast DNS (mDNS).
It extends Node's native Event Emitter and can emit the following events:

- `connection`: Emitted when a connection with another peer is established. Callback accepts two arguments: `connection` and `info`.
- `topicStatus`: Emitted when the connection status for a topic is updated. Callback accepts one argument: `topicStatus`.
- `peerStatus`: Emitted when a peer status is updated. Callback accepts one argument: `peerStatus`.
- `error`: Emitted when an error occurs. Callback accepts one argument: `error`.

## Hierarchy

- `TypedEmitter`

  ↳ **`Discovery`**

## Table of contents

### Constructors

- [constructor](lib_discovery.Discovery.md#constructor)

### Properties

- [dht](lib_discovery.Discovery.md#dht)
- [dhtActive](lib_discovery.Discovery.md#dhtactive)
- [dhtOptions](lib_discovery.Discovery.md#dhtoptions)
- [host](lib_discovery.Discovery.md#host)
- [mdns](lib_discovery.Discovery.md#mdns)
- [mdnsActive](lib_discovery.Discovery.md#mdnsactive)
- [port](lib_discovery.Discovery.md#port)

### Accessors

- [identityPublicKey](lib_discovery.Discovery.md#identitypublickey)
- [peers](lib_discovery.Discovery.md#peers)
- [topics](lib_discovery.Discovery.md#topics)

### Methods

- [destroy](lib_discovery.Discovery.md#destroy)
- [getPeersByTopic](lib_discovery.Discovery.md#getpeersbytopic)
- [join](lib_discovery.Discovery.md#join)
- [leave](lib_discovery.Discovery.md#leave)
- [leavePeer](lib_discovery.Discovery.md#leavepeer)
- [ready](lib_discovery.Discovery.md#ready)

## Constructors

### constructor

• **new Discovery**(`options`)

**`Example`**

Creating the discovery instance

```js
import { KeyManager } from '@mapeo/crypto'

// Create the discovery instance
const discover = new Discovery({
  identityKeyPair: new KeyManager(
    KeyManager.generateIdentityKey()
  ).getIdentityKeypair(),
  mdns: true,
  dht: true,
})
```

#### Parameters

| Name                      | Type                                                                              | Description                                                                                                                                           |
| :------------------------ | :-------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`                 | `Object`                                                                          |                                                                                                                                                       |
| `options.dht`             | `undefined` \| `boolean` \| [`DhtOptions`](../interfaces/lib_types.DhtOptions.md) | Either a boolean that determines whether to use hyperswarm to find peers or an object that provides options that are passed to hyperswarm constructor |
| `options.identityKeyPair` | [`KeyPair`](../interfaces/lib_types.KeyPair.md)                                   |                                                                                                                                                       |
| `options.mdns`            | `undefined` \| `boolean`                                                          | Boolean that determines whether to use multicast dnssd to find peers                                                                                  |

#### Overrides

TypedEmitter.constructor

#### Defined in

[lib/discovery/index.js:60](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L60)

## Properties

### dht

• **dht**: `any`

#### Defined in

[lib/discovery/index.js:78](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L78)

[lib/discovery/index.js:409](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L409)

---

### dhtActive

• **dhtActive**: `boolean`

#### Defined in

[lib/discovery/index.js:68](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L68)

---

### dhtOptions

• **dhtOptions**: [`DhtOptions`](../interfaces/lib_types.DhtOptions.md)

#### Defined in

[lib/discovery/index.js:69](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L69)

---

### host

• **host**: `undefined` \| `string`

#### Defined in

[lib/discovery/index.js:220](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L220)

---

### mdns

• **mdns**: `undefined` \| `boolean`

#### Defined in

[lib/discovery/index.js:74](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L74)

---

### mdnsActive

• **mdnsActive**: `boolean`

#### Defined in

[lib/discovery/index.js:67](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L67)

---

### port

• **port**: `undefined` \| `number`

#### Defined in

[lib/discovery/index.js:219](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L219)

## Accessors

### identityPublicKey

• `get` **identityPublicKey**(): `string`

Return the public key for the identity used for discovery

**`Example`**

```js
import { KeyManager } from '@mapeo/crypto'

// Create discovery instance
const discover = new Discovery({
  identityKeyPair: new KeyManager(
    KeyManager.generateIdentityKey()
  ).getIdentityKeypair(),
})

console.log(discover.identityPublicKey) // Some hex-encoded string
```

#### Returns

`string`

#### Defined in

[lib/discovery/index.js:102](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L102)

---

### peers

• `get` **peers**(): [`PeerInfo`](lib_discovery.PeerInfo.md)[]

Returns the list of peers that have been connected to

**`Example`**

```js
// Create identity keypairs `identityKeyPair1` and `identityKeyPair2`... (see footnote 1)

// Create discovery instances
const discover1 = new Discovery({
  identityKeyPair: identityKeyPair1,
  mdns: true,
  dht: false,
})

const discover2 = new Discovery({
  identityKeyPair: identityKeypair2,
  mdns: true,
  dht: false,
})

// Bootstrap discovery instances
await discover1.ready()
await discover2.ready()

console.log(discover2.peers) // Prints `[]`

// Add event listener for when a new connection is made
discover2.once('connection', (_connection, peer) => {
  console.log(discover2.peers) // Prints `[Peer]`, where `Peer` has peer info for `identity1`
  console.log(discover2.peers[0].identityPublicKey === peer.identityPublicKey) // Prints `true`
})

// Create a shared topic name (see footnote 2)
const topic = Buffer.alloc(32).fill('peers-example')

// Tell discovery instances to join the same topic
await discover1.join(topic, { dht: false })
await discover2.join(topic, { dht: false })
```

Footnotes:

1. To create an identity keypair, refer to `KeyManager`, `generateRootKey` and `getIdentityKeypair` in the [`@mapeo/crypto`](https://github.codigidem/mapeo-crypto) docs.

2. To create a secure topic name, refer to `KeyManager`, `createIdentityKeys`, and `getHypercoreKeypair` in the [`@mapeo/crypto`](https://github.codigidem/mapeo-crypto) docs.

#### Returns

[`PeerInfo`](lib_discovery.PeerInfo.md)[]

#### Defined in

[lib/discovery/index.js:189](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L189)

---

### topics

• `get` **topics**(): [`Topic`](lib_discovery.Topic.md)[]

Return the list of subscribed topics

**`Example`**

```js
import { KeyManager } from '@mapeo/crypto'

const discover = new Discover({
  identityKeyPair: new KeyManager(
    KeyManager.generateIdentityKey()
  ).getIdentityKeypair(),
})

await discover.ready()

// Create topic name (as a 32 byte buffer) to be joined (see footnote 1)
const topic = Buffer.alloc(32).fill('topics-example')

discover.join(topic)

console.log(discover.topics) // prints out `['746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069']`
```

Footnotes:

1. To create a secure topic name, refer to `KeyManager`, `createIdentityKeys`, and `getHypercoreKeypair` in the [`@mapeo/crypto`](https://github.com/digidem/mapeo-crypto) docs.

#### Returns

[`Topic`](lib_discovery.Topic.md)[]

#### Defined in

[lib/discovery/index.js:136](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L136)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

'
Destroy the discovery instance

**`Example`**

```js
const topic = Buffer.alloc(32).fill('destroy-example')

await discover.ready()
await discover.join(topic)

setTimeout(() => {
  console.log('Destroying discover instance...')

  discover.destroy().then(() => {
    console.log('Discover instance destroyed')
  })
}, 1000)
```

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/discovery/index.js:719](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L719)

---

### getPeersByTopic

▸ **getPeersByTopic**(`topic`): [`PeerInfo`](lib_discovery.PeerInfo.md)[]

Return a list of connected peers discovered through the specified topic

**`Example`**

```js
const topic = Buffer.alloc(32).fill('getPeersByTopic-example')

discover.on('connection', (connection, peer) => {
  // The topic name is most likely represented as a hex-encoded string value
  const topicHexString = topic.toString('hex')
  console.log(discovery.getPeersByTopic(topicHexString)) // Prints `[Peer, ...]` with each `peer` that has been connected to
})

await discover.ready()
await discover.join(topic)
```

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `topic` | `string` |

#### Returns

[`PeerInfo`](lib_discovery.PeerInfo.md)[]

#### Defined in

[lib/discovery/index.js:586](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L586)

---

### join

▸ **join**(`topicBuffer`, `options?`): `Promise`<`undefined` \| [`Topic`](lib_discovery.Topic.md)\>

Join a topic to broadcast to and listen for connections from.

**`Example`**

Basic usage

```js
const topic = Buffer.alloc(32).fill('join-example')
await discover.join(topic, { mdns: true, dht: true })
```

**`Example`**

Providing specific DHT options

```js
const topic = Buffer.alloc(32).fill('join-example')

await discover.join(topic, {
  // Pass in specific Hyperswarm DHT options (see footnote 1)
  dht: {
    // Options go here...
  },
})
```

Footnotes:

1. Refer to docs for [`hyperswarm`](https://github.com/hyperswarm/hyperswarm).

#### Parameters

| Name           | Type                                                                              | Description                                                                                                                                                                                           |
| :------------- | :-------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `topicBuffer`  | `Buffer`                                                                          |                                                                                                                                                                                                       |
| `options`      | `Object`                                                                          |                                                                                                                                                                                                       |
| `options.dht`  | `undefined` \| `boolean` \| [`DhtOptions`](../interfaces/lib_types.DhtOptions.md) | Either a boolean that determines whether to use hyperswarm to find peers or an object that provides options that are passed to hyperswarm constructor. Uses dht settings from constructor by default. |
| `options.mdns` | `undefined` \| `boolean`                                                          | Boolean that determines whether to use multicast-service-discovery to find peers. Uses mdns settings from constructor by default.                                                                     |

#### Returns

`Promise`<`undefined` \| [`Topic`](lib_discovery.Topic.md)\>

#### Defined in

[lib/discovery/index.js:400](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L400)

---

### leave

▸ **leave**(`topicBuffer`): `Promise`<`void`\>

Leave a topic

**`Example`**

```js
const topic = Buffer.alloc(32).fill('leave-example')

await discover.join(topic)

// The discovery instance will no longer receive connections from
// or connect to this topic after this call
await discover.leave(topic)
```

#### Parameters

| Name          | Type     |
| :------------ | :------- |
| `topicBuffer` | `Buffer` |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/discovery/index.js:632](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L632)

---

### leavePeer

▸ **leavePeer**(`identityPublicKey`): `Promise`<`void`\>

Disconnect from a connected peer

**`Example`**

```js
const topic = Buffer.alloc(32).fill('leavePeer-example')

discover.on('connection', (connection, peer) => {
  console.log(discover.peers) // Prints `[Peer]` with newly connected `peer`

  setTimeout(() => {
    discover.leavePeer(peer.identityPublicKey).then(() => {
      console.log(discover.peers) // Prints `[]`
    })
  }, 3000)
})

await discover.ready()
await discover.join(topic)
```

#### Parameters

| Name                | Type                 |
| :------------------ | :------------------- |
| `identityPublicKey` | `string` \| `Buffer` |

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/discovery/index.js:681](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L681)

---

### ready

▸ **ready**(): `Promise`<`void`\>

Set up listeners for connections

**`Example`**

```js
import { KeyManager } from '@mapeo/crypto'

// Create discovery instance
const discover = new Discover({
  identityKeyPair: new KeyManager(
    KeyManager.generateIdentityKey()
  ).getIdentityKeypair(),
})

// Wait for base listeners to initialize
await discover.ready()

// Add any other listeners on discovery instance...
```

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/discovery/index.js:216](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L216)
