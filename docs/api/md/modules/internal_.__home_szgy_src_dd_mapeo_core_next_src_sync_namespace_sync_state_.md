[API](../README.md) / [\<internal\>](internal_.md) / "/home/szgy/src/dd/mapeo-core-next/src/sync/namespace-sync-state"

# Namespace: "/home/szgy/src/dd/mapeo-core-next/src/sync/namespace-sync-state"

[\<internal\>](internal_.md)."/home/szgy/src/dd/mapeo-core-next/src/sync/namespace-sync-state"

## Table of contents

### Classes

- [NamespaceSyncState](../classes/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md)

### Type Aliases

- [SyncState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md#syncstate)

### Functions

- [createState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_namespace_sync_state_.md#createstate)

## Type Aliases

### SyncState

Ƭ **SyncState**\<\>: `Omit`\<[`"/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"`](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md), ``"coreLength"``\> & \{ `coreCount`: `number` ; `dataToSync`: `boolean`  }

#### Defined in

[src/sync/namespace-sync-state.js:5](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/namespace-sync-state.js#L5)

## Functions

### createState

▸ **createState**(): [`CoreState`](../interfaces/internal_.CoreState.md)

#### Returns

[`CoreState`](../interfaces/internal_.CoreState.md)

#### Defined in

[src/sync/namespace-sync-state.js:136](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/namespace-sync-state.js#L136)

▸ **createState**(`status`): [`PeerCoreState`](internal_.md#peercorestate)

#### Parameters

| Name | Type |
| :------ | :------ |
| `status` | ``"disconnected"`` \| ``"connecting"`` \| ``"connected"`` |

#### Returns

[`PeerCoreState`](internal_.md#peercorestate)

#### Defined in

[src/sync/namespace-sync-state.js:141](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/namespace-sync-state.js#L141)
