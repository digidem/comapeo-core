[API](../README.md) / [blob-api](../modules/blob_api.md) / BlobApi

# Class: BlobApi

[blob-api](../modules/blob_api.md).BlobApi

## Table of contents

### Constructors

- [constructor](blob_api.BlobApi.md#constructor)

### Methods

- [create](blob_api.BlobApi.md#create)
- [getUrl](blob_api.BlobApi.md#geturl)

## Constructors

### constructor

• **new BlobApi**(`options`): [`BlobApi`](blob_api.BlobApi.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.blobStore` | [`BlobStore`](blob_store.BlobStore.md) |
| `options.getMediaBaseUrl` | () => `Promise`\<`string`\> |

#### Returns

[`BlobApi`](blob_api.BlobApi.md)

#### Defined in

[src/blob-api.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-api.js#L18)

## Methods

### create

▸ **create**(`filepaths`, `metadata`): `Promise`\<\{ `driveId`: `string` ; `hash`: `string` ; `name`: `string` ; `type`: ``"photo"`` \| ``"audio"`` \| ``"video"``  }\>

Write blobs for provided variants of a file

#### Parameters

| Name | Type |
| :------ | :------ |
| `filepaths` | `Object` |
| `filepaths.original` | `string` |
| `filepaths.preview?` | `string` |
| `filepaths.thumbnail?` | `string` |
| `metadata` | `Object` |
| `metadata.mimeType` | `string` |

#### Returns

`Promise`\<\{ `driveId`: `string` ; `hash`: `string` ; `name`: `string` ; `type`: ``"photo"`` \| ``"audio"`` \| ``"video"``  }\>

#### Defined in

[src/blob-api.js:46](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-api.js#L46)

___

### getUrl

▸ **getUrl**(`blobId`): `Promise`\<`string`\>

Get a url for a blob based on its BlobId

#### Parameters

| Name | Type |
| :------ | :------ |
| `blobId` | [`BlobId`](../modules/blob_api.md#blobid) |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/blob-api.js:28](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-api.js#L28)
