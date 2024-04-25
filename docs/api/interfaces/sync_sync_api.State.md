[API](../README.md) / [sync/sync-api](../modules/sync_sync_api.md) / State

# Interface: State\<\>

[sync/sync-api](../modules/sync_sync_api.md).State

## Table of contents

### Properties

- [connectedPeers](sync_sync_api.State.md#connectedpeers)
- [data](sync_sync_api.State.md#data)
- [initial](sync_sync_api.State.md#initial)

## Properties

### connectedPeers

• **connectedPeers**: `number`

Number of connected peers

#### Defined in

[src/sync/sync-api.js:33](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L33)

___

### data

• **data**: [`SyncTypeState`](sync_sync_api.SyncTypeState.md)

State of data sync (observations, map data, photos, audio, video etc.)

#### Defined in

[src/sync/sync-api.js:32](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L32)

___

### initial

• **initial**: [`SyncTypeState`](sync_sync_api.SyncTypeState.md)

State of initial sync (sync of auth, metadata and project config)

#### Defined in

[src/sync/sync-api.js:31](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L31)
