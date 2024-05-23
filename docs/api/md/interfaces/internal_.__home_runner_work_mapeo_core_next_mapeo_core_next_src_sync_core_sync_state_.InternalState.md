[API](../README.md) / [\<internal\>](../modules/internal_.md) / ["/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/core-sync-state"](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.md) / InternalState

# Interface: InternalState\<\>

[\<internal\>](../modules/internal_.md).["/home/runner/work/mapeo-core-next/mapeo-core-next/src/sync/core-sync-state"](../modules/internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.md).InternalState

## Table of contents

### Properties

- [length](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#length)
- [localState](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#localstate)
- [namespace](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#namespace)
- [peerSyncControllers](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#peersynccontrollers)
- [remoteStates](internal_.__home_runner_work_mapeo_core_next_mapeo_core_next_src_sync_core_sync_state_.InternalState.md#remotestates)

## Properties

### length

• **length**: `undefined` \| `number`

Core length, e.g. how many blocks in the core (including blocks that are not downloaded)

___

### localState

• **localState**: `PeerState`

___

### namespace

• **namespace**: ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``

___

### peerSyncControllers

• **peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](../classes/internal_.PeerSyncController.md)\>

___

### remoteStates

• **remoteStates**: `Map`\<`string`, `PeerState`\>
