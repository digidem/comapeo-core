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

## Properties

### [kSyncState]

• **[kSyncState]**: [`SyncState`](internal_.SyncState.md)

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

___

### getState

▸ **getState**(): [`State`](../interfaces/internal_.State.md)

Get the current sync state (initial and full). Also emitted via the 'sync-state' event

#### Returns

[`State`](../interfaces/internal_.State.md)

___

### start

▸ **start**(): `void`

Start syncing data cores

#### Returns

`void`

___

### stop

▸ **stop**(): `void`

Stop syncing data cores (metadata cores will continue syncing in the background)

#### Returns

`void`

___

### waitForSync

▸ **waitForSync**(`type`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | [`SyncType`](../modules/internal_.md#synctype) |

#### Returns

`Promise`\<`void`\>
