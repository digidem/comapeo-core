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

#### Defined in

[src/blob-api.js:18](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-api.js#L18)

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

[src/blob-api.js:46](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-api.js#L46)

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

#### Defined in

[src/blob-api.js:28](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-api.js#L28)
