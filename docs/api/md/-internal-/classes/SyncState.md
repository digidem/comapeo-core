[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / SyncState

# Class: SyncState

Emit sync state when it changes

## Extends

- `TypedEmitter`

## Constructors

### new SyncState()

> **new SyncState**(`opts`): [`SyncState`](SyncState.md)

#### Parameters

• **opts**

• **opts.coreManager**: [`CoreManager`](CoreManager.md)

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](PeerSyncController.md)\>

• **opts.throttleMs**: `undefined` \| `number` = `200`

#### Returns

[`SyncState`](SyncState.md)

#### Overrides

`TypedEmitter.constructor`

## Methods

### addPeer()

> **addPeer**(`peerId`): `void`

#### Parameters

• **peerId**: `string`

#### Returns

`void`

***

### disconnectPeer()

> **disconnectPeer**(`peerId`): `void`

#### Parameters

• **peerId**: `string`

#### Returns

`void`

***

### getState()

> **getState**(): [`State`](../type-aliases/State.md)

#### Returns

[`State`](../type-aliases/State.md)
