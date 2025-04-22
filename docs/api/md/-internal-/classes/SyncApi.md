[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / SyncApi

# Class: SyncApi

## Extends

- `TypedEmitter`

## Constructors

### new SyncApi()

> **new SyncApi**(`opts`): [`SyncApi`](SyncApi.md)

#### Parameters

• **opts**

• **opts.blobStore**: [`BlobStore`](BlobStore.md)

• **opts.coreManager**: [`CoreManager`](CoreManager.md)

• **opts.coreOwnership**: [`CoreOwnership`](CoreOwnership.md)

• **opts.getReplicationStream**

• **opts.getServerWebsocketUrls**

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.makeWebsocket**: `undefined` \| (`url`) => `WebSocket` = `...`

• **opts.roles**: [`Roles`](Roles.md)

• **opts.throttleMs**: `undefined` \| `number` = `200`

#### Returns

[`SyncApi`](SyncApi.md)

#### Overrides

`TypedEmitter.constructor`

## Properties

### \[kSyncState\]

> **\[kSyncState\]**: [`SyncState`](SyncState.md)

## Methods

### \[kHandleDiscoveryKey\]()

> **\[kHandleDiscoveryKey\]**(`discoveryKey`, `protomux`): `void`

#### Parameters

• **discoveryKey**: `Buffer`

• **protomux**: [`Protomux`](Protomux.md)\<`NoiseSecretStream`\<`Duplex`\<`any`, `any`, `any`, `any`, `true`, `true`, `DuplexEvents`\<`any`, `any`\>\>\>\>

#### Returns

`void`

***

### \[kRequestFullStop\]()

> **\[kRequestFullStop\]**(): `void`

Request a graceful stop to all sync.

#### Returns

`void`

***

### \[kRescindFullStopRequest\]()

> **\[kRescindFullStopRequest\]**(): `void`

Rescind any requests for a full stop.

#### Returns

`void`

***

### \[kWaitForInitialSyncWithPeer\]()

> **\[kWaitForInitialSyncWithPeer\]**(`deviceId`, `abortSignal`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **abortSignal**: `AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### connectServers()

> **connectServers**(): `void`

#### Returns

`void`

***

### disconnectServers()

> **disconnectServers**(): `void`

#### Returns

`void`

***

### getState()

> **getState**(): [`State`](../interfaces/State.md)

Get the current sync state (initial and full). Also emitted via the 'sync-state' event

#### Returns

[`State`](../interfaces/State.md)

***

### setAutostopDataSyncTimeout()

> **setAutostopDataSyncTimeout**(`autostopDataSyncAfter`): `void`

#### Parameters

• **autostopDataSyncAfter**: `null` \| `number`

#### Returns

`void`

***

### start()

> **start**(`options`?): `void`

Start syncing data cores.

If the app is backgrounded and sync has already completed, this will do
nothing until the app is foregrounded.

#### Parameters

• **options?** = `{}`

• **options.autostopDataSyncAfter?**: `undefined` \| `null` \| `number`

If no data sync
happens after this duration in milliseconds, sync will be automatically
stopped as if [stop](SyncApi.md#stop) was called.

#### Returns

`void`

***

### stop()

> **stop**(): `void`

Stop syncing data cores.

Pre-sync cores will continue syncing unless the app is backgrounded.

#### Returns

`void`

***

### waitForSync()

> **waitForSync**(`type`): `Promise`\<`void`\>

#### Parameters

• **type**: [`SyncType`](../type-aliases/SyncType.md)

#### Returns

`Promise`\<`void`\>
