[API](../README.md) / [blob-store](../modules/blob_store.md) / BlobStore

# Class: BlobStore

[blob-store](../modules/blob_store.md).BlobStore

## Table of contents

### Constructors

- [constructor](blob_store.BlobStore.md#constructor)

### Accessors

- [writerDriveId](blob_store.BlobStore.md#writerdriveid)

### Methods

- [clear](blob_store.BlobStore.md#clear)
- [createEntryReadStream](blob_store.BlobStore.md#createentryreadstream)
- [createReadStream](blob_store.BlobStore.md#createreadstream)
- [createWriteStream](blob_store.BlobStore.md#createwritestream)
- [download](blob_store.BlobStore.md#download)
- [entry](blob_store.BlobStore.md#entry)
- [get](blob_store.BlobStore.md#get)
- [getEntryBlob](blob_store.BlobStore.md#getentryblob)
- [put](blob_store.BlobStore.md#put)

## Constructors

### constructor

• **new BlobStore**(`options`): [`BlobStore`](blob_store.BlobStore.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.coreManager` | [`CoreManager`](core_manager.CoreManager.md) |

#### Returns

[`BlobStore`](blob_store.BlobStore.md)

#### Defined in

[src/blob-store/index.js:45](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L45)

## Accessors

### writerDriveId

• `get` **writerDriveId**(): `string`

#### Returns

`string`

#### Defined in

[src/blob-store/index.js:77](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L77)

## Methods

### clear

▸ **clear**(`blobId`, `options?`): `Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blobId` | [`BlobId`](../modules/blob_api.md#blobid) |  |
| `options?` | `Object` |  |
| `options.diff` | `undefined` \| `boolean` | Enable to return an object with a `block` property with number of bytes removed |

#### Returns

`Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Defined in

[src/blob-store/index.js:234](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L234)

___

### createEntryReadStream

▸ **createEntryReadStream**(`driveId`, `entry`, `options?`): `Promise`\<`BlobReadStream`\>

Optimization for creating the blobs read stream when you have
previously read the entry from Hyperdrive using `drive.entry`

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `driveId` | `string` | Hyperdrive drive discovery id |
| `entry` | `HyperdriveEntry` | Hyperdrive entry |
| `options?` | `Object` |  |
| `options.wait` | `undefined` \| `boolean` | Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally |

#### Returns

`Promise`\<`BlobReadStream`\>

#### Defined in

[src/blob-store/index.js:150](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L150)

___

### createReadStream

▸ **createReadStream**(`blobId`, `options?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blobId` | [`BlobId`](../modules/blob_api.md#blobid) |  |
| `options?` | `Object` |  |
| `options.timeout` | `undefined` \| `number` | Optional timeout to wait for a blob to download |
| `options.wait` | `undefined` \| `boolean` | Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[src/blob-store/index.js:130](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L130)

___

### createWriteStream

▸ **createWriteStream**(`blobId`, `options?`): `Writable`\<`any`, `any`, `any`, ``false``, ``true``, `WritableEvents`\<`any`\>\> & \{ `driveId`: `string`  }

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blobId` | `Omit`\<[`BlobId`](../modules/blob_api.md#blobid), ``"driveId"``\> |  |
| `options?` | `Object` |  |
| `options.metadata` | `undefined` \| \{ `mimeType`: `string`  } | Metadata to store with the blob |

#### Returns

`Writable`\<`any`, `any`, `any`, ``false``, ``true``, `WritableEvents`\<`any`\>\> & \{ `driveId`: `string`  }

#### Defined in

[src/blob-store/index.js:201](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L201)

___

### download

▸ **download**(`filter?`, `options?`): [`LiveDownload`](blob_store_live_download.LiveDownload.md)

Download blobs from all drives, optionally filtering particular blob types
or blob variants. Download will be 'live' and will continue downloading new
data as it becomes available from any replicating drive.

If no filter is specified, all blobs will be downloaded. If a filter is
specified, then _only_ blobs that match the filter will be downloaded.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `filter?` | [`BlobFilter`](../modules/types.md#blobfilter) | Filter blob types and/or variants to download. Filter is { [BlobType]: BlobVariants[] }. At least one blob variant must be specified for each blob type. |
| `options` | `Object` |  |
| `options.signal` | `undefined` \| `AbortSignal` | Optional AbortSignal to cancel in-progress download |

#### Returns

[`LiveDownload`](blob_store_live_download.LiveDownload.md)

EventEmitter with `.state` propery, emits `state` with new state when it updates

#### Defined in

[src/blob-store/index.js:117](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L117)

___

### entry

▸ **entry**(`blobId`, `options?`): `Promise`\<``null`` \| `HyperdriveEntry`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blobId` | [`BlobId`](../modules/blob_api.md#blobid) |  |
| `options?` | `Object` |  |
| `options.follow` | `undefined` \| `boolean` | Set to `true` to follow symlinks (16 max or throws an error) |
| `options.timeout` | `undefined` | Optional timeout to wait for a blob to download |
| `options.wait` | `undefined` \| ``false`` | Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally |

#### Returns

`Promise`\<``null`` \| `HyperdriveEntry`\>

#### Defined in

[src/blob-store/index.js:217](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L217)

___

### get

▸ **get**(`blobId`, `opts?`): `Promise`\<`Buffer`\>

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `blobId` | [`BlobId`](../modules/blob_api.md#blobid) | `undefined` |  |
| `opts` | `Object` | `{}` |  |
| `opts.timeout` | `undefined` | `undefined` | Optional timeout to wait for a blob to download |
| `opts.wait` | `undefined` \| ``false`` | `false` | Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally |

#### Returns

`Promise`\<`Buffer`\>

#### Defined in

[src/blob-store/index.js:96](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L96)

___

### getEntryBlob

▸ **getEntryBlob**(`driveId`, `entry`, `opts?`): `Promise`\<``null`` \| `Buffer`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `driveId` | `string` | Hyperdrive drive id |
| `entry` | `HyperdriveEntry` | Hyperdrive entry |
| `opts?` | `Object` |  |
| `opts.length` | `undefined` \| `number` |  |

#### Returns

`Promise`\<``null`` \| `Buffer`\>

#### Defined in

[src/blob-store/index.js:170](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L170)

___

### put

▸ **put**(`blobId`, `blob`, `options?`): `Promise`\<`string`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `blobId` | `Omit`\<[`BlobId`](../modules/blob_api.md#blobid), ``"driveId"``\> |  |
| `blob` | `Buffer` |  |
| `options?` | `Object` |  |
| `options.metadata` | `undefined` \| \{ `mimeType`: `string`  } | Metadata to store with the blob |

#### Returns

`Promise`\<`string`\>

discovery key as hex string of hyperdrive where blob is stored

#### Defined in

[src/blob-store/index.js:190](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L190)
