[API](../README.md) / [\<internal\>](../modules/internal_.md) / PeerSyncController

# Class: PeerSyncController

[\<internal\>](../modules/internal_.md).PeerSyncController

## Table of contents

### Constructors

- [constructor](internal_.PeerSyncController.md#constructor)

### Accessors

- [peerId](internal_.PeerSyncController.md#peerid)
- [peerKey](internal_.PeerSyncController.md#peerkey)
- [syncCapability](internal_.PeerSyncController.md#synccapability)

### Methods

- [disableDataSync](internal_.PeerSyncController.md#disabledatasync)
- [enableDataSync](internal_.PeerSyncController.md#enabledatasync)
- [handleDiscoveryKey](internal_.PeerSyncController.md#handlediscoverykey)

## Constructors

### constructor

• **new PeerSyncController**(`opts`): [`PeerSyncController`](internal_.PeerSyncController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |
| `opts.protomux` | [`Protomux`](internal_.Protomux.md)\<[`OpenedNoiseStream`](../modules/internal_.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |
| `opts.roles` | [`Roles`](internal_.Roles.md) |
| `opts.syncState` | [`SyncState`](internal_.SyncState.md) |

#### Returns

[`PeerSyncController`](internal_.PeerSyncController.md)

## Accessors

### peerId

• `get` **peerId**(): `string`

#### Returns

`string`

___

### peerKey

• `get` **peerKey**(): `Buffer`

#### Returns

`Buffer`

___

### syncCapability

• `get` **syncCapability**(): `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`SyncCapability`](../modules/internal_.md#synccapability)\>

#### Returns

`Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`SyncCapability`](../modules/internal_.md#synccapability)\>

## Methods

### disableDataSync

▸ **disableDataSync**(): `void`

Disable syncing of data (in the data and blob namespaces).

Syncing of metadata (auth, config and blobIndex namespaces) will continue
in the background without user interaction.

#### Returns

`void`

___

### enableDataSync

▸ **enableDataSync**(): `void`

Enable syncing of data (in the data and blob namespaces)

#### Returns

`void`

___

### handleDiscoveryKey

▸ **handleDiscoveryKey**(`discoveryKey`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`void`
