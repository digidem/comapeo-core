[API](../README.md) / [\<internal\>](../modules/internal_.md) / SyncTypeState

# Interface: SyncTypeState\<\>

[\<internal\>](../modules/internal_.md).SyncTypeState

## Table of contents

### Properties

- [dataToSync](internal_.SyncTypeState.md#datatosync)
- [have](internal_.SyncTypeState.md#have)
- [missing](internal_.SyncTypeState.md#missing)
- [syncing](internal_.SyncTypeState.md#syncing)
- [want](internal_.SyncTypeState.md#want)
- [wanted](internal_.SyncTypeState.md#wanted)

## Properties

### dataToSync

• **dataToSync**: `boolean`

Is there data available to sync? (want > 0 || wanted > 0)

#### Defined in

[src/sync/sync-api.js:25](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L25)

___

### have

• **have**: `number`

Number of blocks we have locally

#### Defined in

[src/sync/sync-api.js:21](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L21)

___

### missing

• **missing**: `number`

Number of blocks missing (we don't have them, but connected peers don't have them either)

#### Defined in

[src/sync/sync-api.js:24](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L24)

___

### syncing

• **syncing**: `boolean`

Are we currently syncing?

#### Defined in

[src/sync/sync-api.js:26](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L26)

___

### want

• **want**: `number`

Number of blocks we want from connected peers

#### Defined in

[src/sync/sync-api.js:22](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L22)

___

### wanted

• **wanted**: `number`

Number of blocks that connected peers want from us

#### Defined in

[src/sync/sync-api.js:23](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-api.js#L23)
