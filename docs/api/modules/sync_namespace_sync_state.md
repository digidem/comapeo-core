[API](../README.md) / sync/namespace-sync-state

# Module: sync/namespace-sync-state

## Table of contents

### Classes

- [NamespaceSyncState](../classes/sync_namespace_sync_state.NamespaceSyncState.md)

### Type Aliases

- [SyncState](sync_namespace_sync_state.md#syncstate)

### Functions

- [createState](sync_namespace_sync_state.md#createstate)

## Type Aliases

### SyncState

Ƭ **SyncState**\<\>: `Omit`\<[`sync/core-sync-state`](sync_core_sync_state.md), ``"coreLength"``\> & \{ `coreCount`: `number` ; `dataToSync`: `boolean`  }

#### Defined in

[src/sync/namespace-sync-state.js:5](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L5)

## Functions

### createState

▸ **createState**(): [`CoreState`](../interfaces/sync_core_sync_state.CoreState.md)

#### Returns

[`CoreState`](../interfaces/sync_core_sync_state.CoreState.md)

#### Defined in

[src/sync/namespace-sync-state.js:136](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L136)

▸ **createState**(`status`): [`PeerCoreState`](sync_core_sync_state.md#peercorestate)

#### Parameters

| Name | Type |
| :------ | :------ |
| `status` | ``"disconnected"`` \| ``"connecting"`` \| ``"connected"`` |

#### Returns

[`PeerCoreState`](sync_core_sync_state.md#peercorestate)

#### Defined in

[src/sync/namespace-sync-state.js:141](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/namespace-sync-state.js#L141)
