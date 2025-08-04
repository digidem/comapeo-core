[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / BlobStore

# Class: BlobStore

## Extends

- `TypedEmitter`

## Constructors

### new BlobStore()

> **new BlobStore**(`options`): [`BlobStore`](BlobStore.md)

#### Parameters

• **options**

• **options.coreManager**: [`CoreManager`](CoreManager.md)

• **options.isArchiveDevice**: `undefined` \| `boolean` = `true`

Set to `true` if this is an archive device which should download all blobs, or just a selection of blobs

• **options.logger**: `undefined` \| [`Logger`](Logger.md)

#### Returns

[`BlobStore`](BlobStore.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### isArchiveDevice

> `get` **isArchiveDevice**(): `boolean`

#### Returns

`boolean`

***

### writerDriveId

> `get` **writerDriveId**(): `string`

#### Returns

`string`

## Methods

### clear()

> **clear**(`blobId`, `options`?): `Promise`\<`null` \| `object`\>

#### Parameters

• **blobId**: [`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md)

• **options?** = `{}`

• **options.diff?**: `undefined` \| `boolean`

Enable to return an object with a `block` property with number of bytes removed

#### Returns

`Promise`\<`null` \| `object`\>

***

### close()

> **close**(): `void`

#### Returns

`void`

***

### createEntriesReadStream()

> **createEntriesReadStream**(`opts`): [`BlobStoreEntriesStream`](../type-aliases/BlobStoreEntriesStream.md)

This is a low-level method to create a stream of entries from all drives.
It includes entries for unknown blob types and variants.

#### Parameters

• **opts** = `{}`

• **opts.filter**: `undefined` \| `null` \| [`GenericBlobFilter`](../type-aliases/GenericBlobFilter.md)

Filter blob types and/or variants in returned entries. Filter is { [BlobType]: BlobVariants[] }.

• **opts.live**: `undefined` \| `boolean` = `false`

Set to `true` to get a live stream of entries

#### Returns

[`BlobStoreEntriesStream`](../type-aliases/BlobStoreEntriesStream.md)

***

### createReadStream()

> **createReadStream**(`blobId`, `options`?): [`Readable`](../type-aliases/Readable.md)

#### Parameters

• **blobId**: [`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md)

• **options?** = `...`

• **options.timeout?**: `undefined` \| `number`

Optional timeout to wait for a blob to download

• **options.wait?**: `undefined` \| `boolean`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

[`Readable`](../type-aliases/Readable.md)

***

### createReadStreamFromEntry()

> **createReadStreamFromEntry**(`driveId`, `entry`, `options`?): `Promise`\<[`Readable`](../type-aliases/Readable.md)\>

Optimization for creating the blobs read stream when you have
previously read the entry from Hyperdrive using `drive.entry`

#### Parameters

• **driveId**: `string`

Hyperdrive drive discovery id

• **entry**: [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)

Hyperdrive entry

• **options?** = `...`

• **options.wait?**: `undefined` \| `boolean`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

`Promise`\<[`Readable`](../type-aliases/Readable.md)\>

***

### createWriteStream()

> **createWriteStream**(`blobId`, `options`?): `Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\> & `object`

#### Parameters

• **blobId**: `Omit`\<[`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md), `"driveId"`\>

• **options?**

• **options.metadata?**: `undefined` \| `JsonObject`

Metadata to store with the blob

#### Returns

`Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\> & `object`

***

### entry()

> **entry**(`blobId`, `options`?): `Promise`\<`null` \| [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)\>

#### Parameters

• **blobId**: [`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md)

• **options?** = `...`

• **options.follow?**: `undefined` \| `boolean`

Set to `true` to follow symlinks (16 max or throws an error)

• **options.timeout?**: `undefined`

Optional timeout to wait for a blob to download

• **options.wait?**: `undefined` \| `false`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

`Promise`\<`null` \| [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)\>

***

### get()

> **get**(`blobId`, `opts`): `Promise`\<`Uint8Array`\>

#### Parameters

• **blobId**: [`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md)

• **opts** = `{}`

• **opts.timeout**: `undefined`

Optional timeout to wait for a blob to download

• **opts.wait**: `undefined` \| `false` = `false`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

`Promise`\<`Uint8Array`\>

***

### getBlobFilter()

> **getBlobFilter**(`peerId`): `null` \| [`GenericBlobFilter`](../type-aliases/GenericBlobFilter.md)

#### Parameters

• **peerId**: `string`

#### Returns

`null` \| [`GenericBlobFilter`](../type-aliases/GenericBlobFilter.md)

***

### getEntryBlob()

> **getEntryBlob**(`driveId`, `entry`, `opts`?): `Promise`\<`null` \| `Buffer`\>

#### Parameters

• **driveId**: `string`

Hyperdrive drive id

• **entry**: [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)

Hyperdrive entry

• **opts?** = `{}`

• **opts.length?**: `undefined` \| `number`

#### Returns

`Promise`\<`null` \| `Buffer`\>

***

### put()

> **put**(`blobId`, `blob`, `options`?): `Promise`\<`string`\>

#### Parameters

• **blobId**: `Omit`\<[`BlobId`](../../namespaces/BlobApi/type-aliases/BlobId.md), `"driveId"`\>

• **blob**: `Buffer`

• **options?**

• **options.metadata?**: `undefined` \| `JsonObject`

Metadata to store with the blob

#### Returns

`Promise`\<`string`\>

discovery key as hex string of hyperdrive where blob is stored

***

### setIsArchiveDevice()

> **setIsArchiveDevice**(`isArchiveDevice`): `Promise`\<`void`\>

#### Parameters

• **isArchiveDevice**: `boolean`

#### Returns

`Promise`\<`void`\>
