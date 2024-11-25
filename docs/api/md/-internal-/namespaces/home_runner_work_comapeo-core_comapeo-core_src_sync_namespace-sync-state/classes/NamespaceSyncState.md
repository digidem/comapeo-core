[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / ["/home/runner/work/comapeo-core/comapeo-core/src/sync/namespace-sync-state"](../README.md) / NamespaceSyncState

# Class: NamespaceSyncState\<TNamespace\>

## Type Parameters

• **TNamespace** = [`Namespace`](../../../type-aliases/Namespace.md)

## Constructors

### new NamespaceSyncState()

> **new NamespaceSyncState**\<`TNamespace`\>(`opts`): [`NamespaceSyncState`](NamespaceSyncState.md)\<`TNamespace`\>

#### Parameters

• **opts**

• **opts.coreManager**: [`CoreManager`](../../../classes/CoreManager.md)

• **opts.logger**: `undefined` \| [`Logger`](../../../classes/Logger.md)

• **opts.namespace**: `TNamespace`

• **opts.onUpdate**

Called when a state update is available (via getState())

• **opts.peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](../../../classes/PeerSyncController.md)\>

#### Returns

[`NamespaceSyncState`](NamespaceSyncState.md)\<`TNamespace`\>

## Accessors

### namespace

> `get` **namespace**(): `TNamespace`

#### Returns

`TNamespace`

## Methods

### addPeer()

> **addPeer**(`peerId`): `void`

#### Parameters

• **peerId**: `string`

#### Returns

`void`

***

### addWantRange()

> **addWantRange**(`peerId`, `start`, `length`): `void`

#### Parameters

• **peerId**: `string`

• **start**: `number`

• **length**: `number`

#### Returns

`void`

***

### clearWantRanges()

> **clearWantRanges**(`peerId`): `void`

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

> **getState**(): [`SyncState`](../type-aliases/SyncState.md)

#### Returns

[`SyncState`](../type-aliases/SyncState.md)
