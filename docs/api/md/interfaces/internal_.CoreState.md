[API](../README.md) / [\<internal\>](../modules/internal_.md) / CoreState

# Interface: CoreState\<\>

[\<internal\>](../modules/internal_.md).CoreState

## Table of contents

### Properties

- [have](internal_.CoreState.md#have)
- [missing](internal_.CoreState.md#missing)
- [want](internal_.CoreState.md#want)
- [wanted](internal_.CoreState.md#wanted)

## Properties

### have

• **have**: `number`

blocks the peer has locally

#### Defined in

[src/sync/core-sync-state.js:22](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L22)

___

### missing

• **missing**: `number`

blocks the peer wants but no peer has

#### Defined in

[src/sync/core-sync-state.js:25](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L25)

___

### want

• **want**: `number`

blocks the peer wants, and at least one peer has

#### Defined in

[src/sync/core-sync-state.js:23](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L23)

___

### wanted

• **wanted**: `number`

blocks the peer has that at least one peer wants

#### Defined in

[src/sync/core-sync-state.js:24](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/core-sync-state.js#L24)
