[API](../README.md) / [sync/sync-api](../modules/sync_sync_api.md) / SyncApi

# Class: SyncApi

[sync/sync-api](../modules/sync_sync_api.md).SyncApi

## Hierarchy

- `TypedEmitter`

  ↳ **`SyncApi`**

## Table of contents

### Constructors

- [constructor](sync_sync_api.SyncApi.md#constructor)

### Properties

- [[kSyncState]](sync_sync_api.SyncApi.md#[ksyncstate])

### Methods

- [[kHandleDiscoveryKey]](sync_sync_api.SyncApi.md#[khandlediscoverykey])
- [getState](sync_sync_api.SyncApi.md#getstate)
- [start](sync_sync_api.SyncApi.md#start)
- [stop](sync_sync_api.SyncApi.md#stop)
- [waitForSync](sync_sync_api.SyncApi.md#waitforsync)

## Constructors

### constructor

• **new SyncApi**(`opts`): [`SyncApi`](sync_sync_api.SyncApi.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `Object` | `undefined` |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) | `undefined` |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) | `undefined` |
| `opts.roles` | [`Roles`](roles.Roles.md) | `undefined` |
| `opts.throttleMs` | `undefined` \| `number` | `200` |

#### Returns

[`SyncApi`](sync_sync_api.SyncApi.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/sync/sync-api.js:67](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L67)

## Properties

### [kSyncState]

• **[kSyncState]**: [`SyncState`](sync_sync_state.SyncState.md)

#### Defined in

[src/sync/sync-api.js:72](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L72)

## Methods

### [kHandleDiscoveryKey]

▸ **[kHandleDiscoveryKey]**(`discoveryKey`, `protomux`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |
| `protomux` | `Protomux`\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:88](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L88)

___

### getState

▸ **getState**(): [`State`](../interfaces/sync_sync_api.State.md)

Get the current sync state (initial and full). Also emitted via the 'sync-state' event

#### Returns

[`State`](../interfaces/sync_sync_api.State.md)

#### Defined in

[src/sync/sync-api.js:119](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L119)

___

### start

▸ **start**(): `void`

Start syncing data cores

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:136](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L136)

___

### stop

▸ **stop**(): `void`

Stop syncing data cores (metadata cores will continue syncing in the background)

#### Returns

`void`

#### Defined in

[src/sync/sync-api.js:149](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L149)

___

### waitForSync

▸ **waitForSync**(`type`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | [`SyncType`](../modules/sync_sync_api.md#synctype) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/sync/sync-api.js:163](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L163)
