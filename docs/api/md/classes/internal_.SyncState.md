[API](../README.md) / [\<internal\>](../modules/internal_.md) / SyncState

# Class: SyncState

[\<internal\>](../modules/internal_.md).SyncState

Emit sync state when it changes

## Hierarchy

- `TypedEmitter`

  ↳ **`SyncState`**

## Table of contents

### Constructors

- [constructor](internal_.SyncState.md#constructor)

### Methods

- [addPeer](internal_.SyncState.md#addpeer)
- [getState](internal_.SyncState.md#getstate)

## Constructors

### constructor

• **new SyncState**(`opts`): [`SyncState`](internal_.SyncState.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `Object` | `undefined` |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) | `undefined` |
| `opts.peerSyncControllers` | `Map`\<`string`, [`PeerSyncController`](internal_.PeerSyncController.md)\> | `undefined` |
| `opts.throttleMs` | `undefined` \| `number` | `200` |

#### Returns

[`SyncState`](internal_.SyncState.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/sync/sync-state.js:33](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-state.js#L33)

## Methods

### addPeer

▸ **addPeer**(`peerId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |

#### Returns

`void`

#### Defined in

[src/sync/sync-state.js:53](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-state.js#L53)

___

### getState

▸ **getState**(): [`State`](../modules/internal_.md#state)

#### Returns

[`State`](../modules/internal_.md#state)

#### Defined in

[src/sync/sync-state.js:62](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/sync/sync-state.js#L62)
