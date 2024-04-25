[API](../README.md) / [sync/sync-api](../modules/sync_sync_api.md) / SyncTypeState

# Interface: SyncTypeState\<\>

[sync/sync-api](../modules/sync_sync_api.md).SyncTypeState

## Table of contents

### Properties

- [dataToSync](sync_sync_api.SyncTypeState.md#datatosync)
- [have](sync_sync_api.SyncTypeState.md#have)
- [missing](sync_sync_api.SyncTypeState.md#missing)
- [syncing](sync_sync_api.SyncTypeState.md#syncing)
- [want](sync_sync_api.SyncTypeState.md#want)
- [wanted](sync_sync_api.SyncTypeState.md#wanted)

## Properties

### dataToSync

• **dataToSync**: `boolean`

Is there data available to sync? (want > 0 || wanted > 0)

#### Defined in

[src/sync/sync-api.js:25](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L25)

___

### have

• **have**: `number`

Number of blocks we have locally

#### Defined in

[src/sync/sync-api.js:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L21)

___

### missing

• **missing**: `number`

Number of blocks missing (we don't have them, but connected peers don't have them either)

#### Defined in

[src/sync/sync-api.js:24](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L24)

___

### syncing

• **syncing**: `boolean`

Are we currently syncing?

#### Defined in

[src/sync/sync-api.js:26](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L26)

___

### want

• **want**: `number`

Number of blocks we want from connected peers

#### Defined in

[src/sync/sync-api.js:22](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L22)

___

### wanted

• **wanted**: `number`

Number of blocks that connected peers want from us

#### Defined in

[src/sync/sync-api.js:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-api.js#L23)
