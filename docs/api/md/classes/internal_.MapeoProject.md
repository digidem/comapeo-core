[API](../README.md) / [\<internal\>](../modules/internal_.md) / MapeoProject

# Class: MapeoProject

[\<internal\>](../modules/internal_.md).MapeoProject

## Hierarchy

- `TypedEmitter`

  ↳ **`MapeoProject`**

## Table of contents

### Constructors

- [constructor](internal_.MapeoProject.md#constructor)

### Properties

- [$blobs](internal_.MapeoProject.md#$blobs)
- [EMPTY\_PROJECT\_SETTINGS](internal_.MapeoProject.md#empty_project_settings)

### Accessors

- [$icons](internal_.MapeoProject.md#$icons)
- [$member](internal_.MapeoProject.md#$member)
- [$sync](internal_.MapeoProject.md#$sync)
- [$translation](internal_.MapeoProject.md#$translation)
- [[kBlobStore]](internal_.MapeoProject.md#[kblobstore])
- [[kCoreManager]](internal_.MapeoProject.md#[kcoremanager])
- [[kCoreOwnership]](internal_.MapeoProject.md#[kcoreownership])
- [[kDataTypes]](internal_.MapeoProject.md#[kdatatypes])
- [deviceId](internal_.MapeoProject.md#deviceid)
- [field](internal_.MapeoProject.md#field)
- [observation](internal_.MapeoProject.md#observation)
- [preset](internal_.MapeoProject.md#preset)
- [track](internal_.MapeoProject.md#track)

### Methods

- [$getOwnRole](internal_.MapeoProject.md#$getownrole)
- [$getProjectSettings](internal_.MapeoProject.md#$getprojectsettings)
- [$setProjectSettings](internal_.MapeoProject.md#$setprojectsettings)
- [[kProjectLeave]](internal_.MapeoProject.md#[kprojectleave])
- [[kProjectReplicate]](internal_.MapeoProject.md#[kprojectreplicate])
- [[kSetOwnDeviceInfo]](internal_.MapeoProject.md#[ksetowndeviceinfo])
- [close](internal_.MapeoProject.md#close)
- [importConfig](internal_.MapeoProject.md#importconfig)
- [ready](internal_.MapeoProject.md#ready)

## Constructors

### constructor

• **new MapeoProject**(`opts`): [`MapeoProject`](internal_.MapeoProject.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreStorage` | [`CoreStorage`](../modules/internal_.md#corestorage) | Folder to store all hypercore data |
| `opts.dbPath` | `string` | Path to store project sqlite db. Use `:memory:` for memory storage |
| `opts.encryptionKeys` | `EncryptionKeys` | Encryption keys for each namespace |
| `opts.getMediaBaseUrl` | (`mediaType`: ``"blobs"`` \| ``"icons"``) => `Promise`\<`string`\> |  |
| `opts.keyManager` | `KeyManager` | mapeo/crypto KeyManager instance |
| `opts.localPeers` | [`LocalPeers`](internal_.LocalPeers.md) |  |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |  |
| `opts.projectKey` | `Buffer` | 32-byte public key of the project creator core |
| `opts.projectMigrationsFolder` | `string` | path for drizzle migration folder for project |
| `opts.projectSecretKey` | `undefined` \| `Buffer` | 32-byte secret key of the project creator core |
| `opts.sharedDb` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> |  |
| `opts.sharedIndexWriter` | [`IndexWriter`](internal_.IndexWriter.md)\<[`MapeoDocTables`](../modules/internal_.md#mapeodoctables-1)\> |  |

#### Returns

[`MapeoProject`](internal_.MapeoProject.md)

#### Overrides

TypedEmitter.constructor

## Properties

### $blobs

• **$blobs**: [`BlobApi`](internal_.BlobApi.md)

___

### EMPTY\_PROJECT\_SETTINGS

▪ `Static` **EMPTY\_PROJECT\_SETTINGS**: `Readonly`\<{}\> = `EMPTY_PROJECT_SETTINGS`

## Accessors

### $icons

• `get` **$icons**(): [`IconApi`](internal_.IconApi.md)

#### Returns

[`IconApi`](internal_.IconApi.md)

___

### $member

• `get` **$member**(): [`MemberApi`](internal_.MemberApi.md)

#### Returns

[`MemberApi`](internal_.MemberApi.md)

___

### $sync

• `get` **$sync**(): [`SyncApi`](internal_.SyncApi.md)

#### Returns

[`SyncApi`](internal_.SyncApi.md)

___

### $translation

• `get` **$translation**(): [`default`](internal_.default.md)

#### Returns

[`default`](internal_.default.md)

___

### [kBlobStore]

• `get` **[kBlobStore]**(): [`BlobStore`](internal_.BlobStore.md)

#### Returns

[`BlobStore`](internal_.BlobStore.md)

___

### [kCoreManager]

• `get` **[kCoreManager]**(): [`CoreManager`](internal_.CoreManager.md)

CoreManager instance, used for tests

#### Returns

[`CoreManager`](internal_.CoreManager.md)

___

### [kCoreOwnership]

• `get` **[kCoreOwnership]**(): [`CoreOwnership`](internal_.CoreOwnership.md)

CoreOwnership instance, used for tests

#### Returns

[`CoreOwnership`](internal_.CoreOwnership.md)

___

### [kDataTypes]

• `get` **[kDataTypes]**(): `Object`

DataTypes object mappings, used for tests

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `coreOwnership` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"coreOwnership"``, {}, {}\> |
| `deviceInfo` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"deviceInfo"``, {}, {}\> |
| `field` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\> |
| `icon` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"icon"``, {}, {}\> |
| `observation` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\> |
| `preset` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\> |
| `projectSettings` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"projectSettings"``, {}, {}\> |
| `role` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"role"``, {}, {}\> |
| `track` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\> |
| `translation` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"translation"``, {}, {}\> |

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

___

### field

• `get` **field**(): [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\>

#### Returns

[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\>

___

### observation

• `get` **observation**(): [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\>

#### Returns

[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\>

___

### preset

• `get` **preset**(): [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\>

#### Returns

[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\>

___

### track

• `get` **track**(): [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\>

#### Returns

[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\>

## Methods

### $getOwnRole

▸ **$getOwnRole**(): `Promise`\<[`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

#### Returns

`Promise`\<[`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

___

### $getProjectSettings

▸ **$getProjectSettings**(): `Promise`\<[`EditableProjectSettings`](../modules/internal_.md#editableprojectsettings)\>

#### Returns

`Promise`\<[`EditableProjectSettings`](../modules/internal_.md#editableprojectsettings)\>

___

### $setProjectSettings

▸ **$setProjectSettings**(`settings`): `Promise`\<[`EditableProjectSettings`](../modules/internal_.md#editableprojectsettings)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `settings` | `Partial`\<[`EditableProjectSettings`](../modules/internal_.md#editableprojectsettings)\> |

#### Returns

`Promise`\<[`EditableProjectSettings`](../modules/internal_.md#editableprojectsettings)\>

___

### [kProjectLeave]

▸ **[kProjectLeave]**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

___

### [kProjectReplicate]

▸ **[kProjectReplicate]**(`stream`): `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> & {} & [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

Replicate a project to a @hyperswarm/secret-stream. Invites will not
function because the RPC channel is not connected for project replication,
and only this project will replicate (to replicate multiple projects you
need to replicate the manager instance via manager[kManagerReplicate])

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\> | A duplex stream, a @hyperswarm/secret-stream, or a Protomux instance |

#### Returns

`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> & {} & [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

___

### [kSetOwnDeviceInfo]

▸ **[kSetOwnDeviceInfo]**(`value`): `Promise`\<{}\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Pick`\<{}, ``"name"`` \| ``"deviceType"``\> |

#### Returns

`Promise`\<{}\>

___

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

___

### importConfig

▸ **importConfig**(`opts`): `Promise`\<`Error`[]\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.configPath` | `string` |

#### Returns

`Promise`\<`Error`[]\>

___

### ready

▸ **ready**(): `Promise`\<`void`\>

Resolves when hypercores have all loaded

#### Returns

`Promise`\<`void`\>
