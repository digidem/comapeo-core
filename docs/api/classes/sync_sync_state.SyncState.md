[API](../README.md) / [sync/sync-state](../modules/sync_sync_state.md) / SyncState

# Class: SyncState

[sync/sync-state](../modules/sync_sync_state.md).SyncState

Emit sync state when it changes

## Hierarchy

- `TypedEmitter`

  ↳ **`SyncState`**

## Table of contents

### Constructors

- [constructor](sync_sync_state.SyncState.md#constructor)

### Methods

- [addPeer](sync_sync_state.SyncState.md#addpeer)
- [getState](sync_sync_state.SyncState.md#getstate)

## Constructors

### constructor

• **new SyncState**(`opts`): [`SyncState`](sync_sync_state.SyncState.md)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `opts` | `Object` | `undefined` |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) | `undefined` |
| `opts.peerSyncControllers` | `Map`\<`string`, [`PeerSyncController`](sync_peer_sync_controller.PeerSyncController.md)\> | `undefined` |
| `opts.throttleMs` | `undefined` \| `number` | `200` |

#### Returns

[`SyncState`](sync_sync_state.SyncState.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/sync/sync-state.js:33](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-state.js#L33)

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

[src/sync/sync-state.js:53](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-state.js#L53)

___

### getState

▸ **getState**(): [`State`](../modules/sync_sync_state.md#state)

#### Returns

[`State`](../modules/sync_sync_state.md#state)

#### Defined in

[src/sync/sync-state.js:62](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/sync-state.js#L62)
