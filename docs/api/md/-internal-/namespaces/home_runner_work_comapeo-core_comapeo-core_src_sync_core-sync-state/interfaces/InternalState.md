[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / ["/home/runner/work/comapeo-core/comapeo-core/src/sync/core-sync-state"](../README.md) / InternalState

# Interface: InternalState

## Properties

### length

> **length**: `undefined` \| `number`

Core length, e.g. how many blocks in the core (including blocks that are not downloaded)

***

### localState

> **localState**: `PeerState`

***

### namespace

> **namespace**: `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`

***

### peerSyncControllers

> **peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](../../../classes/PeerSyncController.md)\>

***

### remoteStates

> **remoteStates**: `Map`\<`string`, `PeerState`\>
