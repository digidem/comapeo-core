[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / BlobApi

# Class: BlobApi

## Constructors

### new BlobApi()

> **new BlobApi**(`options`): [`BlobApi`](BlobApi.md)

#### Parameters

• **options**

• **options.blobStore**: [`BlobStore`](BlobStore.md)

• **options.getMediaBaseUrl**

#### Returns

[`BlobApi`](BlobApi.md)

## Methods

### create()

> **create**(`filepaths`, `metadata`): `Promise`\<`object`\>

Write blobs for provided variants of a file

#### Parameters

• **filepaths**

• **filepaths.original**: `string`

• **filepaths.preview?**: `string`

• **filepaths.thumbnail?**: `string`

• **metadata**: [`Metadata`](../interfaces/Metadata.md)

#### Returns

`Promise`\<`object`\>

##### driveId

> **driveId**: `string`

##### hash

> **hash**: `string`

##### name

> **name**: `string`

##### type

> **type**: `"photo"` \| `"audio"` \| `"video"`

***

### getUrl()

> **getUrl**(`blobId`): `Promise`\<`string`\>

Get a url for a blob based on its BlobId

#### Parameters

• **blobId**: [`BlobId`](../type-aliases/BlobId.md)

#### Returns

`Promise`\<`string`\>
