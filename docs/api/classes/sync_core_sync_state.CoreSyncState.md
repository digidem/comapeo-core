[API](../README.md) / [sync/core-sync-state](../modules/sync_core_sync_state.md) / CoreSyncState

# Class: CoreSyncState

[sync/core-sync-state](../modules/sync_core_sync_state.md).CoreSyncState

Track sync state for a core identified by `discoveryId`. Can start tracking
state before the core instance exists locally, via the "preHave" messages
received over the project creator core.

Because deriving the state is expensive (it iterates through the bitfields of
all peers), this is designed to be pull-based: the onUpdate event signals
that the state is updated, but does not pass the state. The consumer can
"pull" the state when it wants it via `coreSyncState.getState()`.

Each peer (including the local peer) has a state of:
  1. `have` - number of blocks the peer has locally
  2. `want` - number of blocks the peer wants, and at least one peer has
  3. `wanted` - number of blocks the peer has that at least one peer wants
  4. `missing` - number of blocks the peer wants but no peer has

## Table of contents

### Constructors

- [constructor](sync_core_sync_state.CoreSyncState.md#constructor)

### Methods

- [addPeer](sync_core_sync_state.CoreSyncState.md#addpeer)
- [attachCore](sync_core_sync_state.CoreSyncState.md#attachcore)
- [getState](sync_core_sync_state.CoreSyncState.md#getstate)
- [insertPreHaves](sync_core_sync_state.CoreSyncState.md#insertprehaves)
- [setPeerWants](sync_core_sync_state.CoreSyncState.md#setpeerwants)

## Constructors

### constructor

• **new CoreSyncState**(`opts`): [`CoreSyncState`](sync_core_sync_state.CoreSyncState.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |  |
| `opts.onUpdate` | () => `void` | Called when a state update is available (via getState()) |
| `opts.peerSyncControllers` | `Map`\<`string`, [`PeerSyncController`](sync_peer_sync_controller.PeerSyncController.md)\> |  |

#### Returns

[`CoreSyncState`](sync_core_sync_state.CoreSyncState.md)

#### Defined in

[src/sync/core-sync-state.js:74](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L74)

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

[src/sync/core-sync-state.js:176](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L176)

___

### attachCore

▸ **attachCore**(`core`): `void`

Attach a core. The sync state can be initialized without a core instance,
because we could receive peer want and have states via extension messages
before we have the core key that allows us to create a core instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `core` | `Hypercore`\<``"binary"``, `Buffer`\> |

#### Returns

`void`

#### Defined in

[src/sync/core-sync-state.js:105](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L105)

___

### getState

▸ **getState**(): [`DerivedState`](../interfaces/sync_core_sync_state.DerivedState.md)

#### Returns

[`DerivedState`](../interfaces/sync_core_sync_state.DerivedState.md)

#### Defined in

[src/sync/core-sync-state.js:85](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L85)

___

### insertPreHaves

▸ **insertPreHaves**(`peerId`, `start`, `bitfield`): `void`

Add a pre-emptive "have" bitfield for a peer. This is used when we receive
a peer "have" via extension message - it allows us to have a state for the
peer before the peer actually starts syncing this core

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `start` | `number` |
| `bitfield` | `Uint32Array` |

#### Returns

`void`

#### Defined in

[src/sync/core-sync-state.js:147](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L147)

___

### setPeerWants

▸ **setPeerWants**(`peerId`, `ranges`): `void`

Add a ranges of wanted blocks for a peer. By default a peer wants all
blocks in a core - calling this will change the peer to only want the
blocks/ranges that are added here

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerId` | `string` |
| `ranges` | \{ `length`: `number` ; `start`: `number`  }[] |

#### Returns

`void`

#### Defined in

[src/sync/core-sync-state.js:165](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L165)
