[API](../README.md) / [sync/core-sync-state](../modules/sync_core_sync_state.md) / CoreState

# Interface: CoreState\<\>

[sync/core-sync-state](../modules/sync_core_sync_state.md).CoreState

## Table of contents

### Properties

- [have](sync_core_sync_state.CoreState.md#have)
- [missing](sync_core_sync_state.CoreState.md#missing)
- [want](sync_core_sync_state.CoreState.md#want)
- [wanted](sync_core_sync_state.CoreState.md#wanted)

## Properties

### have

• **have**: `number`

blocks the peer has locally

#### Defined in

[src/sync/core-sync-state.js:22](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L22)

___

### missing

• **missing**: `number`

blocks the peer wants but no peer has

#### Defined in

[src/sync/core-sync-state.js:25](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L25)

___

### want

• **want**: `number`

blocks the peer wants, and at least one peer has

#### Defined in

[src/sync/core-sync-state.js:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L23)

___

### wanted

• **wanted**: `number`

blocks the peer has that at least one peer wants

#### Defined in

[src/sync/core-sync-state.js:24](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L24)
