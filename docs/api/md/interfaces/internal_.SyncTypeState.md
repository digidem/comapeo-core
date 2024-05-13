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

___

### have

• **have**: `number`

Number of blocks we have locally

___

### missing

• **missing**: `number`

Number of blocks missing (we don't have them, but connected peers don't have them either)

___

### syncing

• **syncing**: `boolean`

Are we currently syncing?

___

### want

• **want**: `number`

Number of blocks we want from connected peers

___

### wanted

• **wanted**: `number`

Number of blocks that connected peers want from us
