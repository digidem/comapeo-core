[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / CoreSyncState

# Class: CoreSyncState

Track sync state for a core identified by `discoveryId`. Can start tracking
state before the core instance exists locally, via the "preHave" messages
received over the project creator core.

Because deriving the state is expensive (it iterates through the bitfields of
all peers), this is designed to be pull-based: the onUpdate event signals
that the state is updated, but does not pass the state. The consumer can
"pull" the state when it wants it via `coreSyncState.getState()`.

Each peer (including the local peer) has a state of:

1. `have` - number of blocks the peer has locally

2. `want` - number of blocks this peer wants. For local state, this is the
   number of unique blocks we want from anyone else. For remote peers, it is
   the number of blocks this peer wants from us.

3. `wanted` - number of blocks this peer has that's wanted by others. For
   local state, this is the number of unique blocks any of our peers want.
   For remote peers, it is the number of blocks we want from them.

## Constructors

### new CoreSyncState()

> **new CoreSyncState**(`opts`): [`CoreSyncState`](CoreSyncState.md)

#### Parameters

• **opts**

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.namespace**: `"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`

• **opts.onUpdate**

Called when a state update is available (via getState())

• **opts.peerSyncControllers**: `Map`\<`string`, [`PeerSyncController`](PeerSyncController.md)\>

#### Returns

[`CoreSyncState`](CoreSyncState.md)

## Methods

### addPeer()

> **addPeer**(`peerId`): `void`

#### Parameters

• **peerId**: `string`

#### Returns

`void`

***

### attachCore()

> **attachCore**(`core`): `void`

Attach a core. The sync state can be initialized without a core instance,
because we could receive peer want and have states via extension messages
before we have the core key that allows us to create a core instance.

#### Parameters

• **core**: `Hypercore`\<`"binary"`, `Buffer`\>

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

> **getState**(): [`DerivedState`](../namespaces/home_runner_work_comapeo-core_comapeo-core_src_sync_core-sync-state/interfaces/DerivedState.md)

#### Returns

[`DerivedState`](../namespaces/home_runner_work_comapeo-core_comapeo-core_src_sync_core-sync-state/interfaces/DerivedState.md)

***

### insertPreHaves()

> **insertPreHaves**(`peerId`, `start`, `bitfield`): `void`

Add a pre-emptive "have" bitfield for a peer. This is used when we receive
a peer "have" via extension message - it allows us to have a state for the
peer before the peer actually starts syncing this core

#### Parameters

• **peerId**: `string`

• **start**: `number`

• **bitfield**: `Uint32Array`

#### Returns

`void`

***

### setPeerWants()

> **setPeerWants**(`peerId`, `ranges`): `void`

Add a ranges of wanted blocks for a peer. By default a peer wants all
blocks in a core - calling this will change the peer to only want the
blocks/ranges that are added here

#### Parameters

• **peerId**: `string`

• **ranges**: `object`[]

#### Returns

`void`
