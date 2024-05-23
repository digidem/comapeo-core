[API](../README.md) / [\<internal\>](../modules/internal_.md) / BlobApi

# Class: BlobApi

[\<internal\>](../modules/internal_.md).BlobApi

## Table of contents

### Constructors

- [constructor](internal_.BlobApi.md#constructor)

### Methods

- [create](internal_.BlobApi.md#create)
- [getUrl](internal_.BlobApi.md#geturl)

## Constructors

### constructor

• **new BlobApi**(`options`): [`BlobApi`](internal_.BlobApi.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.blobStore` | [`BlobStore`](internal_.BlobStore.md) |
| `options.getMediaBaseUrl` | () => `Promise`\<`string`\> |

#### Returns

[`BlobApi`](internal_.BlobApi.md)

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

___

### getUrl

▸ **getUrl**(`blobId`): `Promise`\<`string`\>

Get a url for a blob based on its BlobId

#### Parameters

| Name | Type |
| :------ | :------ |
| `blobId` | [`BlobId`](../modules/internal_.md#blobid-1) |

#### Returns

`Promise`\<`string`\>
