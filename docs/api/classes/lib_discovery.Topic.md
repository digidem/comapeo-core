[API](../README.md) / [lib/discovery](../modules/lib_discovery.md) / Topic

# Class: Topic

[lib/discovery](../modules/lib_discovery.md).Topic

The `Topic` class provides an abstraction represents a discovery topic.
It extends Node's native Event Emitter and can emit the following events:

- `status`: Emitted when the connection status for the topic is updated. Callback accepts one argument: `status`.
- `close`: Emitted when the connection for the topic is closed. Callback accepts no arguments.

## Hierarchy

- `TypedEmitter`

  ↳ **`Topic`**

## Table of contents

### Constructors

- [constructor](lib_discovery.Topic.md#constructor)

### Properties

- [base32String](lib_discovery.Topic.md#base32string)
- [dht](lib_discovery.Topic.md#dht)
- [dhtStatus](lib_discovery.Topic.md#dhtstatus)
- [hexString](lib_discovery.Topic.md#hexstring)
- [mdns](lib_discovery.Topic.md#mdns)
- [mdnsStatus](lib_discovery.Topic.md#mdnsstatus)
- [topicBuffer](lib_discovery.Topic.md#topicbuffer)

### Methods

- [destroy](lib_discovery.Topic.md#destroy)
- [status](lib_discovery.Topic.md#status)
- [toJSON](lib_discovery.Topic.md#tojson)
- [updateStatus](lib_discovery.Topic.md#updatestatus)

## Constructors

### constructor

• **new Topic**(`options`)

**`Example`**

```js
const topic = new Topic({
  topicBuffer: Buffer.alloc(32).fill('my-topic'),
  dhtStatus: 'joining',
  mdnsStatus: 'joining',
  // Pass a mDNS service discovery instance (see footnote 1)
  mdns: new MdnsDiscovery(),
  // Pass a Hyperswarm instance (see footnote 2)
  dht: new Hyperswarm({
    // Hyperswarm DHT options...
  }),
})
```

Footnotes:

1. Refer to docs for [`mdns-sd-discovery`](https://github.com/digidem/multicast-service-discovery)

2. Refer to docs for [`hyperswarm`](https://github.com/hyperswarm/hyperswarm)

#### Parameters

| Name                  | Type                                                                                |
| :-------------------- | :---------------------------------------------------------------------------------- |
| `options`             | `Object`                                                                            |
| `options.dht`         | `any`                                                                               |
| `options.dhtStatus`   | `undefined` \| [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |
| `options.mdns`        | `undefined` \| `MdnsDiscovery`                                                      |
| `options.mdnsStatus`  | `undefined` \| [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |
| `options.topicBuffer` | `Buffer`                                                                            |

#### Overrides

TypedEmitter.constructor

#### Defined in

[lib/discovery/index.js:1231](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1231)

## Properties

### base32String

• **base32String**: `string`

#### Defined in

[lib/discovery/index.js:1243](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1243)

---

### dht

• **dht**: `any`

#### Defined in

[lib/discovery/index.js:1246](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1246)

---

### dhtStatus

• **dhtStatus**: [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md)

#### Defined in

[lib/discovery/index.js:1249](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1249)

[lib/discovery/index.js:1338](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1338)

---

### hexString

• **hexString**: `string`

#### Defined in

[lib/discovery/index.js:1244](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1244)

---

### mdns

• **mdns**: `undefined` \| `MdnsDiscovery`

#### Defined in

[lib/discovery/index.js:1245](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1245)

---

### mdnsStatus

• **mdnsStatus**: [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md)

#### Defined in

[lib/discovery/index.js:1252](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1252)

[lib/discovery/index.js:1342](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1342)

---

### topicBuffer

• **topicBuffer**: `Buffer`

#### Defined in

[lib/discovery/index.js:1242](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1242)

## Methods

### destroy

▸ **destroy**(): `Promise`<`void`\>

Destroy the topic

**`Example`**

```js
const topic = new Topic({
  // For the sake of brevity, specify the rest of the contructor options here...
})

setTimeout(() => {
  console.log('Destroying topic instance...')

  topic.destroy().then(() => {
    console.log('Topic instance destroyed')
  })
}, 1000)
```

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/discovery/index.js:1405](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1405)

---

### status

▸ **status**(): `Required`<[`TopicStatus`](../interfaces/lib_discovery.TopicStatus.md)\>

Return the connection statuses for the topic

**`Example`**

```js
const topic = new Topic({
  dhtStatus: 'joined',
  mdnsStatus: 'closed',
  // For the sake of brevity, specify the rest of the contructor options here...
})

console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`
```

#### Returns

`Required`<[`TopicStatus`](../interfaces/lib_discovery.TopicStatus.md)\>

#### Defined in

[lib/discovery/index.js:1272](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1272)

---

### toJSON

▸ **toJSON**(): `TopicJson`

Return JSON-serializable information about the topic

**`Property`**

**`Property`**

**`Property`**

**`Example`**

```js
const topicBuffer = Buffer.from('toJSON-example')

const topic = new Topic({
  topicBuffer,
  dhtStatus: 'joined',
  mdnsStatus: 'closed',
  mdns: new MdnsDiscovery(),
  dht: new Hyperswarm(),
})

console.log(topic.toJSON()) // Prints `{ topic: '746f4a534f4e2d6578616d706c65', dhtStatus: 'joined', mdnsStatus: 'closed' }`
```

#### Returns

`TopicJson`

#### Defined in

[lib/discovery/index.js:1376](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1376)

---

### updateStatus

▸ **updateStatus**(`status`): `void`

Update the connection status for the topic

**`Example`**

Basic usage

```js
// Updates to the statuses are only possible if `mdns` or `dht` are specified.
// Otherwise  their respective statuses will always be `'deactivated'`.
const topic = new Topic({
  topicBuffer: Buffer.alloc(32).fill('updateStatus-example'),
  dhtStatus: 'joined',
  mdnsStatus: 'closed',
  mdns: new MdnsDiscovery(),
  dht: new Hyperswarm(),
})

console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`

topic.updateStatus({
  dht: 'leaving',
  mdns: 'joining',
})

console.log(topic.status()) // Prints `{ dht: 'leaving', mdns: 'joining' }`
```

**`Example`**

Listening to status changes using the 'status' event

```js
// Updates to the statuses are only possible if `mdns` or `dht` are specified.
// Otherwise  their respective statuses will always be `'deactivated'`.
const topic = new Topic({
  topicBuffer: Buffer.alloc(32).fill('updateStatus-example'),
  dhtStatus: 'joined',
  mdnsStatus: 'closed',
  mdns: new MdnsDiscovery(),
  dht: new Hyperswarm(),
})

console.log(topic.status()) // Prints `{ dht: 'joined', mdns: 'closed' }`

topic.on('status', console.log)

// Console will print `{ dht: 'leaving', mdns: 'joining' }` after this call
topic.updateStatus({
  dht: 'leaving',
  mdns: 'joining',
})
```

#### Parameters

| Name          | Type                                                                                |
| :------------ | :---------------------------------------------------------------------------------- |
| `status`      | `Object`                                                                            |
| `status.dht`  | `undefined` \| [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |
| `status.mdns` | `undefined` \| [`TopicServiceStatus`](../types/lib_discovery.TopicServiceStatus.md) |

#### Returns

`void`

#### Defined in

[lib/discovery/index.js:1336](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/discovery/index.js#L1336)
