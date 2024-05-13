[API](../README.md) / [\<internal\>](../modules/internal_.md) / ["/home/szgy/src/dd/mapeo-core-next/src/sync/namespace-sync-state"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md) / NamespaceSyncState

# Class: NamespaceSyncState\<TNamespace\>

[\<internal\>](../modules/internal_.md).["/home/szgy/src/dd/mapeo-core-next/src/sync/namespace-sync-state"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md).NamespaceSyncState

## Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | [`"/home/szgy/src/dd/mapeo-core-next/src/core-manager/index"`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_core_manager_index_.md) |

## Table of contents

### Constructors

- [constructor](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md#constructor)

### Accessors

- [namespace](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md#namespace)

### Methods

- [addPeer](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md#addpeer)
- [getState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md#getstate)

## Constructors

### constructor

• **new NamespaceSyncState**\<`TNamespace`\>(`opts`): [`NamespaceSyncState`](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md)\<`TNamespace`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TNamespace` | extends ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` = ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) |  |
| `opts.namespace` | `TNamespace` |  |
| `opts.onUpdate` | () => `void` | Called when a state update is available (via getState()) |
| `opts.peerSyncControllers` | `Map`\<`string`, [`PeerSyncController`](internal_.PeerSyncController.md)\> |  |

#### Returns

[`NamespaceSyncState`](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md)\<`TNamespace`\>

## Accessors

### namespace

• `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

## Methods

### addPeer

▸ **addPeer**(`peerId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |

#### Returns

`void`

___

### getState

▸ **getState**(): [`SyncState`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md#syncstate)

#### Returns

[`SyncState`](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md#syncstate)
