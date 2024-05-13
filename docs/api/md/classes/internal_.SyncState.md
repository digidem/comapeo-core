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

## Methods

### addPeer

▸ **addPeer**(`peerId`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |

#### Returns

`void`

___

### getState

▸ **getState**(): [`State`](../modules/internal_.md#state)

#### Returns

[`State`](../modules/internal_.md#state)
