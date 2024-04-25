[API](../README.md) / [discovery/local-discovery](../modules/discovery_local_discovery.md) / LocalDiscovery

# Class: LocalDiscovery

[discovery/local-discovery](../modules/discovery_local_discovery.md).LocalDiscovery

## Hierarchy

- `TypedEmitter`

  ↳ **`LocalDiscovery`**

## Table of contents

### Constructors

- [constructor](discovery_local_discovery.LocalDiscovery.md#constructor)

### Accessors

- [connections](discovery_local_discovery.LocalDiscovery.md#connections)
- [publicKey](discovery_local_discovery.LocalDiscovery.md#publickey)

### Methods

- [address](discovery_local_discovery.LocalDiscovery.md#address)
- [connectPeer](discovery_local_discovery.LocalDiscovery.md#connectpeer)
- [start](discovery_local_discovery.LocalDiscovery.md#start)
- [stop](discovery_local_discovery.LocalDiscovery.md#stop)

## Constructors

### constructor

• **new LocalDiscovery**(`opts`): [`LocalDiscovery`](discovery_local_discovery.LocalDiscovery.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.identityKeypair` | [`Keypair`](../modules/discovery_local_discovery.md#keypair) |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) |

#### Returns

[`LocalDiscovery`](discovery_local_discovery.LocalDiscovery.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/discovery/local-discovery.js:43](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L43)

## Accessors

### connections

• `get` **connections**(): `IterableIterator`\<[`OpenedNoiseStream`](../modules/discovery_local_discovery.md#openednoisestream)\>

#### Returns

`IterableIterator`\<[`OpenedNoiseStream`](../modules/discovery_local_discovery.md#openednoisestream)\>

#### Defined in

[src/discovery/local-discovery.js:241](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L241)

___

### publicKey

• `get` **publicKey**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[src/discovery/local-discovery.js:61](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L61)

## Methods

### address

▸ **address**(): ``null`` \| `string` \| `AddressInfo`

#### Returns

``null`` \| `string` \| `AddressInfo`

#### Defined in

[src/discovery/local-discovery.js:65](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L65)

___

### connectPeer

▸ **connectPeer**(`peer`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peer` | `Object` |
| `peer.address` | `string` |
| `peer.name` | `string` |
| `peer.port` | `number` |

#### Returns

`void`

#### Defined in

[src/discovery/local-discovery.js:90](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L90)

___

### start

▸ **start**(): `Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Returns

`Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Defined in

[src/discovery/local-discovery.js:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L70)

___

### stop

▸ **stop**(`opts?`): `Promise`\<`void`\>

Close all servers and stop multicast advertising and browsing. Will wait
for open sockets to close unless opts.force=true in which case open sockets
are force-closed after opts.timeout milliseconds

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts?` | `Object` |  |
| `opts.force` | `undefined` \| `boolean` | Force-close open sockets after timeout milliseconds |
| `opts.timeout` | `undefined` \| `number` | Optional timeout when calling stop() with force=true |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/discovery/local-discovery.js:255](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/discovery/local-discovery.js#L255)
