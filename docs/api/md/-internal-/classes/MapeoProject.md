[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / MapeoProject

# Class: MapeoProject

## Extends

- `TypedEmitter`

## Constructors

### new MapeoProject()

> **new MapeoProject**(`opts`): [`MapeoProject`](MapeoProject.md)

#### Parameters

• **opts**

• **opts.coreStorage**: [`CoreStorage`](../type-aliases/CoreStorage.md)

Folder to store all hypercore data

• **opts.dbPath**: `string`

Path to store project sqlite db. Use `:memory:` for memory storage

• **opts.encryptionKeys**: `EncryptionKeys`

Encryption keys for each namespace

• **opts.getMediaBaseUrl**

• **opts.isArchiveDevice**: `boolean`

Whether this device is an archive device

• **opts.keyManager**: `KeyManager`

mapeo/crypto KeyManager instance

• **opts.localPeers**: [`LocalPeers`](LocalPeers.md)

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.makeWebsocket**: `undefined` \| (`url`) => `WebSocket` = `...`

• **opts.projectKey**: `Buffer`

32-byte public key of the project creator core

• **opts.projectMigrationsFolder**: `string`

path for drizzle migration folder for project

• **opts.projectSecretKey**: `undefined` \| `Buffer`

32-byte secret key of the project creator core

• **opts.sharedDb**: `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\>

• **opts.sharedIndexWriter**: [`IndexWriter`](IndexWriter.md)\<[`MapeoDocTables`](../type-aliases/MapeoDocTables.md)\>

#### Returns

[`MapeoProject`](MapeoProject.md)

#### Overrides

`TypedEmitter.constructor`

## Properties

### $blobs

> **$blobs**: [`BlobApi`](BlobApi.md)

***

### EMPTY\_PROJECT\_SETTINGS

> `static` **EMPTY\_PROJECT\_SETTINGS**: `Readonly`\<`object`\>

## Accessors

### \[kBlobStore\]

> `get` **\[kBlobStore\]**(): [`BlobStore`](BlobStore.md)

#### Returns

[`BlobStore`](BlobStore.md)

***

### \[kCoreManager\]

> `get` **\[kCoreManager\]**(): [`CoreManager`](CoreManager.md)

CoreManager instance, used for tests

#### Returns

[`CoreManager`](CoreManager.md)

***

### \[kCoreOwnership\]

> `get` **\[kCoreOwnership\]**(): [`CoreOwnership`](CoreOwnership.md)

CoreOwnership instance, used for tests

#### Returns

[`CoreOwnership`](CoreOwnership.md)

***

### \[kDataTypes\]

> `get` **\[kDataTypes\]**(): `object`

DataTypes object mappings, used for tests

#### Returns

`object`

##### coreOwnership

> **coreOwnership**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"role"` \| `"coreOwnership"`\>, `SQLiteTableWithColumns`\<`object`\>, `"coreOwnership"`, `object`, `object`\>

##### deviceInfo

> **deviceInfo**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"deviceInfo"`, `object`, `object`\>

##### field

> **field**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

##### icon

> **icon**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"icon"`, `object`, `object`\>

##### observation

> **observation**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

##### preset

> **preset**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

##### projectSettings

> **projectSettings**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"projectSettings"`, `object`, `object`\>

##### remoteDetectionAlert

> **remoteDetectionAlert**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

##### role

> **role**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"role"` \| `"coreOwnership"`\>, `SQLiteTableWithColumns`\<`object`\>, `"role"`, `object`, `object`\>

##### track

> **track**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

##### translation

> **translation**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"translation"`, `object`, `object`\>

***

### \[kIsArchiveDevice\]

> `get` **\[kIsArchiveDevice\]**(): `boolean`

#### Returns

`boolean`

***

### $icons

> `get` **$icons**(): [`IconApi`](IconApi.md)

#### Returns

[`IconApi`](IconApi.md)

***

### $member

> `get` **$member**(): [`MemberApi`](MemberApi.md)

#### Returns

[`MemberApi`](MemberApi.md)

***

### $sync

> `get` **$sync**(): [`SyncApi`](SyncApi.md)

#### Returns

[`SyncApi`](SyncApi.md)

***

### $translation

> `get` **$translation**(): [`default`](default.md)

#### Returns

[`default`](default.md)

***

### deviceId

> `get` **deviceId**(): `string`

#### Returns

`string`

***

### field

> `get` **field**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

***

### observation

> `get` **observation**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

***

### preset

> `get` **preset**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"projectSettings"` \| `"preset"` \| `"icon"` \| `"field"` \| `"deviceInfo"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

***

### remoteDetectionAlert

> `get` **remoteDetectionAlert**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

***

### track

> `get` **track**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"track"` \| `"remoteDetectionAlert"` \| `"observation"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

## Methods

### \[kClearDataIfLeft\]()

> **\[kClearDataIfLeft\]**(): `Promise`\<`void`\>

Clear data if we've left the project. No-op if you're still in the project.

#### Returns

`Promise`\<`void`\>

***

### \[kExportGeoJSONStream\]()

> **\[kExportGeoJSONStream\]**(`options`?): `Readable`\<`Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `true`, `false`, `ReadableEvents`\<`Uint8Array` \| `Buffer`\>\>

Export observations and or tracks as a stream of GeoJSON data

#### Parameters

• **options?** = `{}`

• **options.lang?**: `undefined` \| `string`

• **options.observations?**: `undefined` \| `boolean` = `true`

Whether observations should be exported

• **options.seenAttachments?**: `undefined` \| [`SeenAttachments`](../type-aliases/SeenAttachments.md) = `...`

• **options.tracks?**: `undefined` \| `boolean` = `true`

Whether all tracks and their observations should be exported

#### Returns

`Readable`\<`Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `true`, `false`, `ReadableEvents`\<`Uint8Array` \| `Buffer`\>\>

***

### \[kExportZipStream\]()

> **\[kExportZipStream\]**(`options`?): `Readable`\<`Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `true`, `false`, `ReadableEvents`\<`Uint8Array` \| `Buffer`\>\>

Export observations, tracks, and or attachments as a zip file stream.

#### Parameters

• **options?** = `{}`

• **options.attachments?**: `undefined` \| `boolean` = `true`

Whether all attachments for observations should be exported

• **options.lang?**: `undefined` \| `string`

• **options.observations?**: `undefined` \| `boolean` = `true`

Whether observations should be exported

• **options.tracks?**: `undefined` \| `boolean` = `true`

Whether all tracks and their observations should be exported

#### Returns

`Readable`\<`Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `Uint8Array` \| `Buffer`, `true`, `false`, `ReadableEvents`\<`Uint8Array` \| `Buffer`\>\>

***

### \[kGeoJSONFileName\]()

> **\[kGeoJSONFileName\]**(`observations`, `tracks`): `Promise`\<`string`\>

#### Parameters

• **observations**: `boolean`

• **tracks**: `boolean`

#### Returns

`Promise`\<`string`\>

***

### \[kProjectLeave\]()

> **\[kProjectLeave\]**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### \[kProjectReplicate\]()

> **\[kProjectReplicate\]**(`isInitiatorOrStream`): [`ReplicationStream`](../type-aliases/ReplicationStream.md)

Replicate a project to a @hyperswarm/secret-stream. Invites will not
function because the RPC channel is not connected for project replication,
and only this project will replicate.

#### Parameters

• **isInitiatorOrStream**: `boolean` \| `Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, `true`, `true`, `DuplexEvents`\<`any`, `any`\>\>

#### Returns

[`ReplicationStream`](../type-aliases/ReplicationStream.md)

***

### \[kSetIsArchiveDevice\]()

> **\[kSetIsArchiveDevice\]**(`isArchiveDevice`): `Promise`\<`void`\>

#### Parameters

• **isArchiveDevice**: `boolean`

#### Returns

`Promise`\<`void`\>

***

### \[kSetOwnDeviceInfo\]()

> **\[kSetOwnDeviceInfo\]**(`value`): `Promise`\<`object`\>

#### Parameters

• **value**: `Pick`\<`object`, `"name"` \| `"deviceType"` \| `"selfHostedServerDetails"`\>

#### Returns

`Promise`\<`object`\>

***

### $getOwnRole()

> **$getOwnRole**(): `Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"a24eaca65ab5d5d0"` \| `"08e4251e36f6e7ed"`\>\>

#### Returns

`Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"a24eaca65ab5d5d0"` \| `"08e4251e36f6e7ed"`\>\>

***

### $getProjectSettings()

> **$getProjectSettings**(): `Promise`\<[`EditableProjectSettings`](../type-aliases/EditableProjectSettings.md)\>

#### Returns

`Promise`\<[`EditableProjectSettings`](../type-aliases/EditableProjectSettings.md)\>

***

### $originalVersionIdToDeviceId()

> **$originalVersionIdToDeviceId**(`originalVersionId`): `Promise`\<`string`\>

#### Parameters

• **originalVersionId**: `string`

The `originalVersionId` from a document.

#### Returns

`Promise`\<`string`\>

The device ID for this creator.

#### Throws

When device ID cannot be found.

***

### $setProjectSettings()

> **$setProjectSettings**(`settings`): `Promise`\<[`EditableProjectSettings`](../type-aliases/EditableProjectSettings.md)\>

#### Parameters

• **settings**: `Partial`\<[`EditableProjectSettings`](../type-aliases/EditableProjectSettings.md)\>

#### Returns

`Promise`\<[`EditableProjectSettings`](../type-aliases/EditableProjectSettings.md)\>

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### exportGeoJSONFile()

> **exportGeoJSONFile**(`exportFolder`, `options`?): `Promise`\<`string`\>

Export observations and or tracks as a GeoJSON file

#### Parameters

• **exportFolder**: `string`

Path to save the file. The file name is auto-generated

• **options?** = `{}`

• **options.lang?**: `undefined` \| `string`

• **options.observations?**: `undefined` \| `boolean` = `true`

Whether observations should be exported

• **options.tracks?**: `undefined` \| `boolean` = `true`

Whether all tracks and their observations should be exported

#### Returns

`Promise`\<`string`\>

The full path that the file was exported at

***

### exportZipFile()

> **exportZipFile**(`exportFolder`, `options`?): `Promise`\<`string`\>

Export observations, tracks, and or attachments as a zip file.

#### Parameters

• **exportFolder**: `string`

Path to save the file. The file name is auto-generated

• **options?** = `{}`

• **options.attachments?**: `undefined` \| `boolean` = `true`

Whether all attachments for observations should be exported

• **options.lang?**: `undefined` \| `string`

• **options.observations?**: `undefined` \| `boolean` = `true`

Whether observations should be exported

• **options.tracks?**: `undefined` \| `boolean` = `true`

Whether all tracks and their observations should be exported

#### Returns

`Promise`\<`string`\>

The full path that the file was exported at

***

### importConfig()

> **importConfig**(`opts`): `Promise`\<`Error`[]\>

#### Parameters

• **opts**

• **opts.configPath**: `string`

#### Returns

`Promise`\<`Error`[]\>

***

### ready()

> **ready**(): `Promise`\<`void`\>

Resolves when hypercores have all loaded

#### Returns

`Promise`\<`void`\>
