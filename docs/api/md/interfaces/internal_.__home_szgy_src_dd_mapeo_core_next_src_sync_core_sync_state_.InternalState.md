[API](../README.md) / [\<internal\>](../modules/internal_.md) / ["/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md) / InternalState

# Interface: InternalState\<\>

[\<internal\>](../modules/internal_.md).["/home/szgy/src/dd/mapeo-core-next/src/sync/core-sync-state"](../modules/internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.md).InternalState

## Table of contents

### Properties

- [length](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#length)
- [localState](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#localstate)
- [namespace](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#namespace)
- [peerSyncControllers](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#peersynccontrollers)
- [remoteStates](internal_.__home_szgy_src_dd_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#remotestates)

## Properties

### length

• **length**: `undefined` \| `number`

Core length, e.g. how many blocks in the core (including blocks that are not downloaded)

#### Defined in

[src/sync/core-sync-state.js:14](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L14)

___

### localState

• **localState**: `PeerState`

#### Defined in

[src/sync/core-sync-state.js:15](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L15)

___

### namespace

• **namespace**: ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``

#### Defined in

[src/sync/core-sync-state.js:18](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L18)

___

### peerSyncControllers

• **peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](../classes/internal_.PeerSyncController.md)\>

#### Defined in

[src/sync/core-sync-state.js:17](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L17)

___

### remoteStates

• **remoteStates**: `Map`\<`string`, `PeerState`\>

#### Defined in

[src/sync/core-sync-state.js:16](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L16)
