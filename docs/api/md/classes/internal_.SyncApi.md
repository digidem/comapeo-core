[API](../README.md) / [\<internal\>](../modules/internal_.md) / SyncApi

# Class: SyncApi

[\<internal\>](../modules/internal_.md).SyncApi

## Hierarchy

- `TypedEmitter`

  ↳ **`SyncApi`**

## Table of contents

### Constructors

- [constructor](internal_.SyncApi.md#constructor)

### Properties

- [[kSyncState]](internal_.SyncApi.md#[ksyncstate])

### Methods

- [[kHandleDiscoveryKey]](internal_.SyncApi.md#[khandlediscoverykey])
- [getState](internal_.SyncApi.md#getstate)
- [start](internal_.SyncApi.md#start)
- [stop](internal_.SyncApi.md#stop)
- [waitForSync](internal_.SyncApi.md#waitforsync)

## Constructors

### constructor

• **new SyncApi**(`opts`): [`SyncApi`](internal_.SyncApi.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `Object` | `undefined` |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) | `undefined` |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) | `undefined` |
| `opts.roles` | [`Roles`](internal_.Roles.md) | `undefined` |
| `opts.throttleMs` | `undefined` \| `number` | `200` |

#### Returns

[`SyncApi`](internal_.SyncApi.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/sync/sync-api.js:66](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L66)

## Properties

### [kSyncState]

• **[kSyncState]**: [`SyncState`](internal_.SyncState.md)

#### Defined in

[src/sync/sync-api.js:71](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L71)

## Methods

### [kHandleDiscoveryKey]

▸ **[kHandleDiscoveryKey]**(`discoveryKey`, `protomux`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |
| `protomux` | [`Protomux`](internal_.Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:87](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L87)

___

### getState

▸ **getState**(): [`State`](../interfaces/internal_.State.md)

Get the current sync state (initial and full). Also emitted via the 'sync-state' event

#### Returns

[`State`](../interfaces/internal_.State.md)

#### Defined in

[src/sync/sync-api.js:118](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L118)

___

### start

▸ **start**(): `void`

Start syncing data cores

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:135](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L135)

___

### stop

▸ **stop**(): `void`

Stop syncing data cores (metadata cores will continue syncing in the background)

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:148](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L148)

___

### waitForSync

▸ **waitForSync**(`type`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | [`SyncType`](../modules/internal_.md#synctype) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/sync/sync-api.js:162](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L162)
