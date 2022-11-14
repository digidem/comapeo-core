[API](../README.md) / [lib/discovery](../modules/lib_discovery.md) / PeerInfo

# Class: PeerInfo

[lib/discovery](../modules/lib_discovery.md).PeerInfo

The PeerInfo class provides an abstraction that represents a discovered peer.
It extends Node's native Event Emitter and can emit the following events:

- `status`: Emitted when the connection status for the peer is updated. Callback accepts one argument: `status`.
- `close`: Emitted when the connection to the peer is closed. Callback accepts no arguments.

## Hierarchy

- `TypedEmitter`

  ↳ **`PeerInfo`**

## Table of contents

### Constructors

- [constructor](lib_discovery.PeerInfo.md#constructor)

### Properties

- [connection](lib_discovery.PeerInfo.md#connection)
- [dhtPeerInfo](lib_discovery.PeerInfo.md#dhtpeerinfo)
- [discoveryType](lib_discovery.PeerInfo.md#discoverytype)
- [host](lib_discovery.PeerInfo.md#host)
- [identityPublicKey](lib_discovery.PeerInfo.md#identitypublickey)
- [port](lib_discovery.PeerInfo.md#port)
- [status](lib_discovery.PeerInfo.md#status)

### Accessors

- [topics](lib_discovery.PeerInfo.md#topics)

### Methods

- [addTopic](lib_discovery.PeerInfo.md#addtopic)
- [addTopics](lib_discovery.PeerInfo.md#addtopics)
- [destroy](lib_discovery.PeerInfo.md#destroy)
- [removeTopic](lib_discovery.PeerInfo.md#removetopic)
- [toJSON](lib_discovery.PeerInfo.md#tojson)
- [update](lib_discovery.PeerInfo.md#update)
- [updateStatus](lib_discovery.PeerInfo.md#updatestatus)

## Constructors

### constructor

• **new PeerInfo**(`options`)

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Example`**

````js
const topic = Buffer.alloc(32).fill('my-topic').toString('hex')
const pubKey = Buffer.alloc(32).fill('my-public-key').toString('hex')

const peer = new PeerInfo({
 topics: [topic],
 host: 'some.address.local.lan',
 port: 12345,
 discoveryType: 'mdns',
 identityPublicKey: pubKey,
 status: 'disconnected',
})

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `PeerInfoOptions` |

#### Overrides

TypedEmitter.constructor

#### Defined in

[lib/discovery/index.js:859](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L859)

## Properties

### connection

• **connection**: [`ConnectionStream`](../types/lib_types.ConnectionStream.md)

#### Defined in

[lib/discovery/index.js:873](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L873)

[lib/discovery/index.js:935](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L935)

___

### dhtPeerInfo

• **dhtPeerInfo**: `undefined` \| [`HyperswarmPeerInfo`](../types/lib_types.HyperswarmPeerInfo.md)

#### Defined in

[lib/discovery/index.js:874](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L874)

___

### discoveryType

• **discoveryType**: ``"dht"`` \| ``"mdns"``

#### Defined in

[lib/discovery/index.js:877](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L877)

[lib/discovery/index.js:947](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L947)

___

### host

• **host**: `undefined` \| `string`

#### Defined in

[lib/discovery/index.js:875](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L875)

[lib/discovery/index.js:939](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L939)

___

### identityPublicKey

• **identityPublicKey**: `string`

#### Defined in

[lib/discovery/index.js:878](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L878)

[lib/discovery/index.js:951](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L951)

___

### port

• **port**: `undefined` \| `number`

#### Defined in

[lib/discovery/index.js:876](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L876)

[lib/discovery/index.js:943](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L943)

___

### status

• **status**: [`PeerStatus`](../types/lib_discovery.PeerStatus.md)

#### Defined in

[lib/discovery/index.js:879](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L879)

[lib/discovery/index.js:955](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L955)

[lib/discovery/index.js:1112](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1112)

## Accessors

### topics

• `get` **topics**(): `string`[]

Get the list of topics associated with the peer

**`Example`**

```js
const peer = new PeerInfo({
 topics: [],
 // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(peer.topics) // Prints `[]`

const topic = Buffer.alloc(32).fill('topics-example').toString('hex') // '746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069'

peer.addTopic(topic)

console.log(peer.topics) // Prints `['746f706963732d6578616d706c65746f706963732d6578616d706c65746f7069']`
````

#### Returns

`string`[]

#### Defined in

[lib/discovery/index.js:1071](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1071)

## Methods

### addTopic

▸ **addTopic**(`topic`): `void`

Add a topic to the list of topics associated with the peer

**`Example`**

```js
const peer = new PeerInfo({
  topics: [],
  // For the sake of brevity, specify the rest of the contructor options here...
})

const topic = Buffer.alloc(32).fill('addTopic-example').toString('hex') // '616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65'

peer.addTopic(topic)

console.log(peer.topics) // Prints `['616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65']`

// Adding the same topic again is idempotent
peer.addTopic(topic)

console.log(peer.topics) // Still prints `['616464546f7069632d6578616d706c65616464546f7069632d6578616d706c65']`
```

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `topic` | `string` |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:985](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L985)

---

### addTopics

▸ **addTopics**(`topics`): `void`

Add a several topics to the list of topics associated with the peer

**`Example`**

```js
const peer = new PeerInfo({
  topics: [],
  // For the sake of brevity, specify the rest of the contructor options here...
})

const topicFoo = Buffer.alloc(32).fill('foo').toString('hex') // '666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f'
const topicBar = Buffer.alloc(32).fill('bar').toString('hex') // '6261726261726261726261726261726261726261726261726261726261726261'

peer.addTopics([topicFoo, topicBar])

console.log(peer.topics) // Prints `['666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f', '6261726261726261726261726261726261726261726261726261726261726261']`

// Adding the same topic(s) again is idempotent
peer.addTopics([topicBar, topicFoo])

console.log(peer.topics) // Still prints `['666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f6f666f', '6261726261726261726261726261726261726261726261726261726261726261']`
```

#### Parameters

| Name     | Type       |
| :------- | :--------- |
| `topics` | `string`[] |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:1016](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1016)

---

### destroy

▸ **destroy**(): `void`

Destroy the peer connection

**`Example`**

```js
const peer = new PeerInfo({
  // For the sake of brevity, specify the rest of the contructor options here...
})

// Add event listener for when the peer is destroyed
peer.on('close', () => {
  console.log('connection for peer destroyed')
})

peer.destroy()
```

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:1172](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1172)

---

### removeTopic

▸ **removeTopic**(`topic`): `void`

Remove a topic from the list of topics associated with the peer

**`Example`**

```js
const topic = Buffer.alloc(32).fill('removeTopic-example').toString('hex') // '72656d6f7665546f7069632d6578616d706c6572656d6f7665546f7069632d65'

const peer = new PeerInfo({
  topics: [topic],
  // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(peer.topics) // Prints `['72656d6f7665546f7069632d6578616d706c6572656d6f7665546f7069632d65']`

peer.removeTopic(topic)

console.log(peer.topics) // Prints `[]`
```

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `topic` | `string` |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:1045](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1045)

---

### toJSON

▸ **toJSON**(): `PeerInfoJson`

Return JSON-serializable information about the peer

**`Property`**

**`Property`**

**`Property`**

**`Property`**

**`Example`**

```js
const pubKey = Buffer.alloc(32).fill('my-public-key').toString('hex') // '6d792d7075626c69632d6b65796d792d7075626c69632d6b65796d792d707562'
const topic = Buffer.alloc(32).fill('toJSON-example').toString('hex') // '746f4a534f4e2d6578616d706c65746f4a534f4e2d6578616d706c65746f4a53'

const peer = new PeerInfo({
  identityPublicKey: pubKey,
  topics: [topic],
  host: 'some.address.lan.local',
  port: 12345,
  // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(peer.toJSON()) // Prints { topics: [ '746f4a534f4e2d6578616d706c65746f4a534f4e2d6578616d706c65746f4a53' ], identityPublicKey: '6d792d7075626c69632d6b65796d792d7075626c69632d6b65796d792d707562', host: 'some.address.lan.local', port: 12345 }
```

#### Returns

`PeerInfoJson`

#### Defined in

[lib/discovery/index.js:1143](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1143)

---

### update

▸ **update**(`options`): `void`

Update connection info associated with a discovered peer

**`Example`**

```js
const peer = new PeerInfo({
  host: 'some.address.lan.local',
  port: 12345,
  // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(peer.host) // Prints `'some.address.lan.local'`
console.log(peer.port) // Prints `12345`

peer.update({ host: 'another.address.lan.local', port: 54321 })

console.log(peer.host) // Prints `'another.address.lan.local'`
console.log(peer.port) // Prints `54321`
```

#### Parameters

| Name                        | Type                                                                            |
| :-------------------------- | :------------------------------------------------------------------------------ |
| `options`                   | `Object`                                                                        |
| `options.connection`        | `undefined` \| [`ConnectionStream`](../types/lib_types.ConnectionStream.md)     |
| `options.dhtPeerInfo`       | `undefined` \| [`HyperswarmPeerInfo`](../types/lib_types.HyperswarmPeerInfo.md) |
| `options.discoveryType`     | `undefined` \| `"dht"` \| `"mdns"`                                              |
| `options.host`              | `undefined` \| `string`                                                         |
| `options.identityPublicKey` | `undefined` \| `string`                                                         |
| `options.port`              | `undefined` \| `number`                                                         |
| `options.status`            | `undefined` \| [`PeerStatus`](../types/lib_discovery.PeerStatus.md)             |
| `options.topics`            | `undefined` \| `string`[]                                                       |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:919](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L919)

---

### updateStatus

▸ **updateStatus**(`status`): `void`

Update the connection status of the peer

**`Example`**

Basic usage

```js
const peer = new PeerInfo({
  status: 'connecting',
  // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(peer.status) // Prints `'connecting'`

peer.updateStatus('connected')

console.log(peer.status) // Prints `'connected'`
```

**`Example`**

Listening for status changes using the 'status' event

```js
const peer = new PeerInfo({
  status: 'connecting',
  // For the sake of brevity, specify the rest of the contructor options here...
})

// Add an event listener on the peer to react to status changes
peer.on('status', console.log)

// Console will print `'connected'` after this call
peer.updateStatus('connected')
```

#### Parameters

| Name     | Type                                                 |
| :------- | :--------------------------------------------------- |
| `status` | [`PeerStatus`](../types/lib_discovery.PeerStatus.md) |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:1111](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1111)
