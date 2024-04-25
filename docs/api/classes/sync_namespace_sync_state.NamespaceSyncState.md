[API](../README.md) / [sync/namespace-sync-state](../modules/sync_namespace_sync_state.md) / NamespaceSyncState

# Class: NamespaceSyncState\<TNamespace\>

[sync/namespace-sync-state](../modules/sync_namespace_sync_state.md).NamespaceSyncState

## Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | [`core-manager`](../modules/core_manager.md) |

## Table of contents

### Constructors

- [constructor](sync_namespace_sync_state.NamespaceSyncState.md#constructor)

### Accessors

- [namespace](sync_namespace_sync_state.NamespaceSyncState.md#namespace)

### Methods

- [addPeer](sync_namespace_sync_state.NamespaceSyncState.md#addpeer)
- [getState](sync_namespace_sync_state.NamespaceSyncState.md#getstate)

## Constructors

### constructor

• **new NamespaceSyncState**\<`TNamespace`\>(`opts`): [`NamespaceSyncState`](sync_namespace_sync_state.NamespaceSyncState.md)\<`TNamespace`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | extends ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` = ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) |  |
| `opts.namespace` | `TNamespace` |  |
| `opts.onUpdate` | () => `void` | Called when a state update is available (via getState()) |
| `opts.peerSyncControllers` | `Map`\<`string`, [`PeerSyncController`](sync_peer_sync_controller.PeerSyncController.md)\> |  |

#### Returns

[`NamespaceSyncState`](sync_namespace_sync_state.NamespaceSyncState.md)\<`TNamespace`\>

#### Defined in

[src/sync/namespace-sync-state.js:28](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L28)

## Accessors

### namespace

• `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

#### Defined in

[src/sync/namespace-sync-state.js:53](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L53)

## Methods

### addPeer

▸ **addPeer**(`peerId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |

#### Returns

`void`

#### Defined in

[src/sync/namespace-sync-state.js:90](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L90)

___

### getState

▸ **getState**(): [`SyncState`](../modules/sync_namespace_sync_state.md#syncstate)

#### Returns

[`SyncState`](../modules/sync_namespace_sync_state.md#syncstate)

#### Defined in

[src/sync/namespace-sync-state.js:58](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L58)
