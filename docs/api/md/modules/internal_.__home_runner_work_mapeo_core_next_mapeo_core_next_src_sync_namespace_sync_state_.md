[API](../README.md) / [\<internal\>](internal_.md) / "/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/namespace-sync-state"

# Namespace: "/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/namespace-sync-state"

[\<internal\>](internal_.md)."/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/namespace-sync-state"

## Table of contents

### Classes

- [NamespaceSyncState](../classes/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_namespace_sync_state_.NamespaceSyncState.md)

### Type Aliases

- [SyncState](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_namespace_sync_state_.md#syncstate)

### Functions

- [createState](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_namespace_sync_state_.md#createstate)

## Type Aliases

### SyncState

Ƭ **SyncState**\<\>: `Omit`\<[`"/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/core-sync-state"`](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.md), ``"coreLength"``\> & \{ `coreCount`: `number` ; `dataToSync`: `boolean`  }

## Functions

### createState

▸ **createState**(): [`CoreState`](../interfaces/internal_.CoreState.md)

#### Returns

[`CoreState`](../interfaces/internal_.CoreState.md)

▸ **createState**(`status`): [`PeerCoreState`](internal_.md#peercorestate)

#### Parameters

| Name | Type |
| :------ | :------ |
| `status` | ``"disconnected"`` \| ``"connecting"`` \| ``"connected"`` |

#### Returns

[`PeerCoreState`](internal_.md#peercorestate)
