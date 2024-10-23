[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / PeerSyncController

# Class: PeerSyncController

## Constructors

### new PeerSyncController()

> **new PeerSyncController**(`opts`): [`PeerSyncController`](PeerSyncController.md)

#### Parameters

• **opts**

• **opts.coreManager**: [`CoreManager`](CoreManager.md)

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.protomux**: [`Protomux`](Protomux.md)\<[`OpenedNoiseStream`](../type-aliases/OpenedNoiseStream.md)\>

• **opts.roles**: [`Roles`](Roles.md)

• **opts.syncState**: [`SyncState`](SyncState.md)

#### Returns

[`PeerSyncController`](PeerSyncController.md)

## Accessors

### peerId

> `get` **peerId**(): `string`

#### Returns

`string`

***

### peerKey

> `get` **peerKey**(): `Buffer`

#### Returns

`Buffer`

***

### syncCapability

> `get` **syncCapability**(): `Record`\<`"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`, [`SyncCapability`](../type-aliases/SyncCapability.md)\>

#### Returns

`Record`\<`"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`, [`SyncCapability`](../type-aliases/SyncCapability.md)\>

## Methods

### handleDiscoveryKey()

> **handleDiscoveryKey**(`discoveryKey`): `void`

#### Parameters

• **discoveryKey**: `Buffer`

#### Returns

`void`

***

### setSyncEnabledState()

> **setSyncEnabledState**(`syncEnabledState`): `void`

#### Parameters

• **syncEnabledState**: [`SyncEnabledState`](../type-aliases/SyncEnabledState.md)

#### Returns

`void`
