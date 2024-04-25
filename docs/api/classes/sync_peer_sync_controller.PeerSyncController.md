[API](../README.md) / [sync/peer-sync-controller](../modules/sync_peer_sync_controller.md) / PeerSyncController

# Class: PeerSyncController

[sync/peer-sync-controller](../modules/sync_peer_sync_controller.md).PeerSyncController

## Table of contents

### Constructors

- [constructor](sync_peer_sync_controller.PeerSyncController.md#constructor)

### Accessors

- [peerId](sync_peer_sync_controller.PeerSyncController.md#peerid)
- [peerKey](sync_peer_sync_controller.PeerSyncController.md#peerkey)
- [syncCapability](sync_peer_sync_controller.PeerSyncController.md#synccapability)

### Methods

- [disableDataSync](sync_peer_sync_controller.PeerSyncController.md#disabledatasync)
- [enableDataSync](sync_peer_sync_controller.PeerSyncController.md#enabledatasync)
- [handleDiscoveryKey](sync_peer_sync_controller.PeerSyncController.md#handlediscoverykey)

## Constructors

### constructor

• **new PeerSyncController**(`opts`): [`PeerSyncController`](sync_peer_sync_controller.PeerSyncController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) |
| `opts.protomux` | `Protomux`\<[`OpenedNoiseStream`](../modules/utils.md#openednoisestream)\<`Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>\> |
| `opts.roles` | [`Roles`](roles.Roles.md) |
| `opts.syncState` | [`SyncState`](sync_sync_state.SyncState.md) |

#### Returns

[`PeerSyncController`](sync_peer_sync_controller.PeerSyncController.md)

#### Defined in

[src/sync/peer-sync-controller.js:47](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L47)

## Accessors

### peerId

• `get` **peerId**(): `string`

#### Returns

`string`

#### Defined in

[src/sync/peer-sync-controller.js:74](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L74)

___

### peerKey

• `get` **peerKey**(): `Buffer`

#### Returns

`Buffer`

#### Defined in

[src/sync/peer-sync-controller.js:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L70)

___

### syncCapability

• `get` **syncCapability**(): `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`SyncCapability`](../modules/sync_peer_sync_controller.md#synccapability)\>

#### Returns

`Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`SyncCapability`](../modules/sync_peer_sync_controller.md#synccapability)\>

#### Defined in

[src/sync/peer-sync-controller.js:78](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L78)

## Methods

### disableDataSync

▸ **disableDataSync**(): `void`

Disable syncing of data (in the data and blob namespaces).

Syncing of metadata (auth, config and blobIndex namespaces) will continue
in the background without user interaction.

#### Returns

`void`

#### Defined in

[src/sync/peer-sync-controller.js:96](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L96)

___

### enableDataSync

▸ **enableDataSync**(): `void`

Enable syncing of data (in the data and blob namespaces)

#### Returns

`void`

#### Defined in

[src/sync/peer-sync-controller.js:85](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L85)

___

### handleDiscoveryKey

▸ **handleDiscoveryKey**(`discoveryKey`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`void`

#### Defined in

[src/sync/peer-sync-controller.js:104](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/peer-sync-controller.js#L104)
