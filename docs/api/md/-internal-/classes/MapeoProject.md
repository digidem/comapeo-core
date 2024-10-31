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

> **coreOwnership**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"coreOwnership"` \| `"role"`\>, `SQLiteTableWithColumns`\<`object`\>, `"coreOwnership"`, `object`, `object`\>

##### deviceInfo

> **deviceInfo**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"deviceInfo"`, `object`, `object`\>

##### field

> **field**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

##### icon

> **icon**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"icon"`, `object`, `object`\>

##### observation

> **observation**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

##### preset

> **preset**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

##### projectSettings

> **projectSettings**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"projectSettings"`, `object`, `object`\>

##### remoteDetectionAlert

> **remoteDetectionAlert**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

##### role

> **role**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"coreOwnership"` \| `"role"`\>, `SQLiteTableWithColumns`\<`object`\>, `"role"`, `object`, `object`\>

##### track

> **track**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

##### translation

> **translation**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"translation"`, `object`, `object`\>

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

> `get` **field**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"field"`, `object`, `object`\>

***

### observation

> `get` **observation**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"observation"`, `object`, `object`\>

***

### preset

> `get` **preset**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"config"`, `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"`\>, `SQLiteTableWithColumns`\<`object`\>, `"preset"`, `object`, `object`\>

***

### remoteDetectionAlert

> `get` **remoteDetectionAlert**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"remoteDetectionAlert"`, `object`, `object`\>

***

### track

> `get` **track**(): [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

#### Returns

[`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"data"`, `"observation"` \| `"track"` \| `"remoteDetectionAlert"`\>, `SQLiteTableWithColumns`\<`object`\>, `"track"`, `object`, `object`\>

## Methods

### \[kClearDataIfLeft\]()

> **\[kClearDataIfLeft\]**(): `Promise`\<`void`\>

Clear data if we've left the project. No-op if you're still in the project.

#### Returns

`Promise`\<`void`\>

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

> **$getOwnRole**(): `Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>

#### Returns

`Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>

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
