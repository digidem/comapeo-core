[API](../README.md) / [\<internal\>](internal_.md) / "/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"

# Namespace: "/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"

[\<internal\>](internal_.md)."/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"

## Table of contents

### References

- [CoreState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#corestate)
- [CoreSyncState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#coresyncstate)
- [PeerCoreState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#peercorestate)

### Interfaces

- [DerivedState](../interfaces/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.DerivedState.md)
- [InternalState](../interfaces/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md)

### Type Aliases

- [Bitfield](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#bitfield)
- [PeerId](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#peerid)

### Functions

- [bitCount32](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md#bitcount32)

## References

### CoreState

Re-exports [CoreState](../interfaces/internal_.CoreState.md)

___

### CoreSyncState

Re-exports [CoreSyncState](../classes/internal_.CoreSyncState.md)

___

### PeerCoreState

Re-exports [PeerCoreState](internal_.md#peercorestate)

## Type Aliases

### Bitfield

Ƭ **Bitfield**\<\>: [`default`](../classes/internal_.default-2.md)

#### Defined in

[src/sync/core-sync-state.js:7](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L7)

___

### PeerId

Ƭ **PeerId**\<\>: `string`

#### Defined in

[src/sync/core-sync-state.js:10](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L10)

## Functions

### bitCount32

▸ **bitCount32**(`n`): `number`

Apologies for the obscure code. From
https://stackoverflow.com/a/109025/903300

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`number`

#### Defined in

[src/sync/core-sync-state.js:431](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L431)
