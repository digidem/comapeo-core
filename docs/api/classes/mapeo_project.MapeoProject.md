[API](../README.md) / [mapeo-project](../modules/mapeo_project.md) / MapeoProject

# Class: MapeoProject

[mapeo-project](../modules/mapeo_project.md).MapeoProject

## Hierarchy

- `TypedEmitter`

  ↳ **`MapeoProject`**

## Table of contents

### Constructors

- [constructor](mapeo_project.MapeoProject.md#constructor)

### Properties

- [$blobs](mapeo_project.MapeoProject.md#$blobs)
- [EMPTY\_PROJECT\_SETTINGS](mapeo_project.MapeoProject.md#empty_project_settings)

### Accessors

- [$icons](mapeo_project.MapeoProject.md#$icons)
- [$member](mapeo_project.MapeoProject.md#$member)
- [$sync](mapeo_project.MapeoProject.md#$sync)
- [[kBlobStore]](mapeo_project.MapeoProject.md#[kblobstore])
- [[kCoreManager]](mapeo_project.MapeoProject.md#[kcoremanager])
- [[kCoreOwnership]](mapeo_project.MapeoProject.md#[kcoreownership])
- [[kDataTypes]](mapeo_project.MapeoProject.md#[kdatatypes])
- [deviceId](mapeo_project.MapeoProject.md#deviceid)
- [field](mapeo_project.MapeoProject.md#field)
- [observation](mapeo_project.MapeoProject.md#observation)
- [preset](mapeo_project.MapeoProject.md#preset)
- [track](mapeo_project.MapeoProject.md#track)

### Methods

- [$getOwnRole](mapeo_project.MapeoProject.md#$getownrole)
- [$getProjectSettings](mapeo_project.MapeoProject.md#$getprojectsettings)
- [$setProjectSettings](mapeo_project.MapeoProject.md#$setprojectsettings)
- [[kProjectLeave]](mapeo_project.MapeoProject.md#[kprojectleave])
- [[kProjectReplicate]](mapeo_project.MapeoProject.md#[kprojectreplicate])
- [[kSetOwnDeviceInfo]](mapeo_project.MapeoProject.md#[ksetowndeviceinfo])
- [close](mapeo_project.MapeoProject.md#close)
- [importConfig](mapeo_project.MapeoProject.md#importconfig)
- [ready](mapeo_project.MapeoProject.md#ready)

## Constructors

### constructor

• **new MapeoProject**(`opts`): [`MapeoProject`](mapeo_project.MapeoProject.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreStorage` | [`CoreStorage`](../modules/types.md#corestorage) | Folder to store all hypercore data |
| `opts.dbPath` | `string` | Path to store project sqlite db. Use `:memory:` for memory storage |
| `opts.encryptionKeys` | [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md) | Encryption keys for each namespace |
| `opts.getMediaBaseUrl` | (`mediaType`: ``"blobs"`` \| ``"icons"``) => `Promise`\<`string`\> |  |
| `opts.keyManager` | `KeyManager` | mapeo/crypto KeyManager instance |
| `opts.localPeers` | [`LocalPeers`](local_peers.LocalPeers.md) |  |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) |  |
| `opts.projectKey` | `Buffer` | 32-byte public key of the project creator core |
| `opts.projectMigrationsFolder` | `string` | path for drizzle migration folder for project |
| `opts.projectSecretKey` | `undefined` \| `Buffer` | 32-byte secret key of the project creator core |
| `opts.sharedDb` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> |  |
| `opts.sharedIndexWriter` | [`IndexWriter`](index_writer.IndexWriter.md)\<[`MapeoDocTables`](../modules/index_writer.md#mapeodoctables)\> |  |

#### Returns

[`MapeoProject`](mapeo_project.MapeoProject.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/mapeo-project.js:103](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L103)

## Properties

### $blobs

• **$blobs**: [`BlobApi`](blob_api.BlobApi.md)

#### Defined in

[src/mapeo-project.js:284](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L284)

___

### EMPTY\_PROJECT\_SETTINGS

▪ `Static` **EMPTY\_PROJECT\_SETTINGS**: `Readonly`\<{}\> = `EMPTY_PROJECT_SETTINGS`

#### Defined in

[src/mapeo-project.js:85](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L85)

## Accessors

### $icons

• `get` **$icons**(): [`IconApi`](icon_api.IconApi.md)

#### Returns

[`IconApi`](icon_api.IconApi.md)

#### Defined in

[src/mapeo-project.js:566](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L566)

___

### $member

• `get` **$member**(): [`MemberApi`](member_api.MemberApi.md)

#### Returns

[`MemberApi`](member_api.MemberApi.md)

#### Defined in

[src/mapeo-project.js:453](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L453)

___

### $sync

• `get` **$sync**(): [`SyncApi`](sync_sync_api.SyncApi.md)

#### Returns

[`SyncApi`](sync_sync_api.SyncApi.md)

#### Defined in

[src/mapeo-project.js:457](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L457)

___

### [kBlobStore]

• `get` **[kBlobStore]**(): [`BlobStore`](blob_store.BlobStore.md)

#### Returns

[`BlobStore`](blob_store.BlobStore.md)

#### Defined in

[src/mapeo-project.js:373](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L373)

___

### [kCoreManager]

• `get` **[kCoreManager]**(): [`CoreManager`](core_manager.CoreManager.md)

CoreManager instance, used for tests

#### Returns

[`CoreManager`](core_manager.CoreManager.md)

#### Defined in

[src/mapeo-project.js:355](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L355)

___

### [kCoreOwnership]

• `get` **[kCoreOwnership]**(): [`CoreOwnership`](core_ownership.CoreOwnership.md)

CoreOwnership instance, used for tests

#### Returns

[`CoreOwnership`](core_ownership.CoreOwnership.md)

#### Defined in

[src/mapeo-project.js:362](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L362)

___

### [kDataTypes]

• `get` **[kDataTypes]**(): `Object`

DataTypes object mappings, used for tests

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `coreOwnership` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"coreOwnership"``, {}, {}\> |
| `deviceInfo` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"deviceInfo"``, {}, {}\> |
| `field` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\> |
| `icon` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"icon"``, {}, {}\> |
| `observation` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\> |
| `preset` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\> |
| `projectSettings` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"projectSettings"``, {}, {}\> |
| `role` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"role"``, {}, {}\> |
| `track` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\> |

#### Defined in

[src/mapeo-project.js:369](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L369)

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

#### Defined in

[src/mapeo-project.js:377](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L377)

___

### field

• `get` **field**(): [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\>

#### Returns

[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"field"``, {}, {}\>

#### Defined in

[src/mapeo-project.js:449](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L449)

___

### observation

• `get` **observation**(): [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\>

#### Returns

[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"observation"``, {}, {}\>

#### Defined in

[src/mapeo-project.js:440](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L440)

___

### preset

• `get` **preset**(): [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\>

#### Returns

[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"preset"``, {}, {}\>

#### Defined in

[src/mapeo-project.js:446](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L446)

___

### track

• `get` **track**(): [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\>

#### Returns

[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"data"``, ``"track"`` \| ``"observation"``\>, `SQLiteTableWithColumns`\<{}\>, ``"track"``, {}, {}\>

#### Defined in

[src/mapeo-project.js:443](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L443)

## Methods

### $getOwnRole

▸ **$getOwnRole**(): `Promise`\<[`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

#### Returns

`Promise`\<[`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

#### Defined in

[src/mapeo-project.js:508](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L508)

___

### $getProjectSettings

▸ **$getProjectSettings**(): `Promise`\<[`EditableProjectSettings`](../modules/mapeo_project.md#editableprojectsettings)\>

#### Returns

`Promise`\<[`EditableProjectSettings`](../modules/mapeo_project.md#editableprojectsettings)\>

#### Defined in

[src/mapeo-project.js:497](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L497)

___

### $setProjectSettings

▸ **$setProjectSettings**(`settings`): `Promise`\<[`EditableProjectSettings`](../modules/mapeo_project.md#editableprojectsettings)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `settings` | `Partial`\<[`EditableProjectSettings`](../modules/mapeo_project.md#editableprojectsettings)\> |

#### Returns

`Promise`\<[`EditableProjectSettings`](../modules/mapeo_project.md#editableprojectsettings)\>

#### Defined in

[src/mapeo-project.js:465](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L465)

___

### [kProjectLeave]

▸ **[kProjectLeave]**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-project.js:570](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L570)

___

### [kProjectReplicate]

▸ **[kProjectReplicate]**(`stream`): `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> & {} & `Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

Replicate a project to a @hyperswarm/secret-stream. Invites will not
function because the RPC channel is not connected for project replication,
and only this project will replicate (to replicate multiple projects you
need to replicate the manager instance via manager[kManagerReplicate])

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `stream` | `Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\> | A duplex stream, a @hyperswarm/secret-stream, or a Protomux instance |

#### Returns

`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> & {} & `Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

#### Defined in

[src/mapeo-project.js:521](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L521)

___

### [kSetOwnDeviceInfo]

▸ **[kSetOwnDeviceInfo]**(`value`): `Promise`\<{}\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `Pick`\<{}, ``"name"`` \| ``"deviceType"``\> |

#### Returns

`Promise`\<{}\>

#### Defined in

[src/mapeo-project.js:540](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L540)

___

### close

▸ **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-project.js:390](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L390)

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

#### Defined in

[src/mapeo-project.js:651](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L651)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

Resolves when hypercores have all loaded

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/mapeo-project.js:384](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/mapeo-project.js#L384)
