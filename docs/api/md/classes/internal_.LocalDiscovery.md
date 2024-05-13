[API](../README.md) / [\<internal\>](../modules/internal_.md) / LocalDiscovery

# Class: LocalDiscovery

[\<internal\>](../modules/internal_.md).LocalDiscovery

## Hierarchy

- `TypedEmitter`

  ↳ **`LocalDiscovery`**

## Table of contents

### Constructors

- [constructor](internal_.LocalDiscovery.md#constructor)

### Accessors

- [connections](internal_.LocalDiscovery.md#connections)
- [publicKey](internal_.LocalDiscovery.md#publickey)

### Methods

- [connectPeer](internal_.LocalDiscovery.md#connectpeer)
- [start](internal_.LocalDiscovery.md#start)
- [stop](internal_.LocalDiscovery.md#stop)

## Constructors

### constructor

• **new LocalDiscovery**(`opts`): [`LocalDiscovery`](internal_.LocalDiscovery.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.identityKeypair` | [`Keypair`](../modules/internal_.md#keypair-1) |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |

#### Returns

[`LocalDiscovery`](internal_.LocalDiscovery.md)

#### Overrides

TypedEmitter.constructor

## Accessors

### connections

• `get` **connections**(): `IterableIterator`\<[`OpenedNoiseStream`](../modules/internal_.md#openednoisestream-1)\>

#### Returns

`IterableIterator`\<[`OpenedNoiseStream`](../modules/internal_.md#openednoisestream-1)\>

___

### publicKey

• `get` **publicKey**(): `Buffer`

#### Returns

`Buffer`

## Methods

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

___

### start

▸ **start**(): `Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

#### Returns

`Promise`\<\{ `name`: `string` ; `port`: `number`  }\>

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
