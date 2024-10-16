[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / BlobIdBase

# Type Alias: BlobIdBase\<T\>

> **BlobIdBase**\<`T`\>: `object`

## Type Parameters

• **T** *extends* [`BlobType`](BlobType.md)

## Type declaration

### driveId

> **driveId**: `string`

discovery key as hex string of hyperdrive where blob is stored

### name

> **name**: `string`

unique identifier for blob (e.g. hash of content)

### type

> **type**: `T`

Type of blob

### variant

> **variant**: [`BlobVariant`](BlobVariant.md)\<`T`\>

Blob variant (some blob types have smaller previews and thumbnails available)
