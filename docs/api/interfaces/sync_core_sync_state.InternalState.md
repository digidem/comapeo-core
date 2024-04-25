[API](../README.md) / [sync/core-sync-state](../modules/sync_core_sync_state.md) / InternalState

# Interface: InternalState\<\>

[sync/core-sync-state](../modules/sync_core_sync_state.md).InternalState

## Table of contents

### Properties

- [length](sync_core_sync_state.InternalState.md#length)
- [localState](sync_core_sync_state.InternalState.md#localstate)
- [namespace](sync_core_sync_state.InternalState.md#namespace)
- [peerSyncControllers](sync_core_sync_state.InternalState.md#peersynccontrollers)
- [remoteStates](sync_core_sync_state.InternalState.md#remotestates)

## Properties

### length

• **length**: `undefined` \| `number`

Core length, e.g. how many blocks in the core (including blocks that are not downloaded)

#### Defined in

[src/sync/core-sync-state.js:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L14)

___

### localState

• **localState**: `PeerState`

#### Defined in

[src/sync/core-sync-state.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L15)

___

### namespace

• **namespace**: ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``

#### Defined in

[src/sync/core-sync-state.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L18)

___

### peerSyncControllers

• **peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](../classes/sync_peer_sync_controller.PeerSyncController.md)\>

#### Defined in

[src/sync/core-sync-state.js:17](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L17)

___

### remoteStates

• **remoteStates**: `Map`\<`string`, `PeerState`\>

#### Defined in

[src/sync/core-sync-state.js:16](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L16)
