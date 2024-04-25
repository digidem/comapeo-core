[API](../README.md) / sync/core-sync-state

# Module: sync/core-sync-state

## Table of contents

### Classes

- [CoreSyncState](../classes/sync_core_sync_state.CoreSyncState.md)

### Interfaces

- [CoreState](../interfaces/sync_core_sync_state.CoreState.md)
- [DerivedState](../interfaces/sync_core_sync_state.DerivedState.md)
- [InternalState](../interfaces/sync_core_sync_state.InternalState.md)

### Type Aliases

- [Bitfield](sync_core_sync_state.md#bitfield)
- [PeerCoreState](sync_core_sync_state.md#peercorestate)
- [PeerId](sync_core_sync_state.md#peerid)

### Functions

- [bitCount32](sync_core_sync_state.md#bitcount32)

## Type Aliases

### Bitfield

Ƭ **Bitfield**\<\>: [`default`](../classes/core_manager_remote_bitfield.default.md)

#### Defined in

[src/sync/core-sync-state.js:7](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L7)

___

### PeerCoreState

Ƭ **PeerCoreState**\<\>: [`CoreState`](../interfaces/sync_core_sync_state.CoreState.md) & \{ `status`: ``"disconnected"`` \| ``"connecting"`` \| ``"connected"``  }

#### Defined in

[src/sync/core-sync-state.js:28](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L28)

___

### PeerId

Ƭ **PeerId**\<\>: `string`

#### Defined in

[src/sync/core-sync-state.js:10](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L10)

## Functions

### bitCount32

▸ **bitCount32**(`n`): `number`

Apologies for the obscure code. From
https://stackoverflow.com/a/109025/903300

#### Parameters

| Name | Type |
| :------ | :------ |
| `n` | `number` |

#### Returns

`number`

#### Defined in

[src/sync/core-sync-state.js:431](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/sync/core-sync-state.js#L431)
