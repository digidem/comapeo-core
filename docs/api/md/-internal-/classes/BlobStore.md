[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / BlobStore

# Class: BlobStore

## Constructors

### new BlobStore()

> **new BlobStore**(`options`): [`BlobStore`](BlobStore.md)

#### Parameters

• **options**

• **options.coreManager**: [`CoreManager`](CoreManager.md)

#### Returns

[`BlobStore`](BlobStore.md)

## Accessors

### writerDriveId

> `get` **writerDriveId**(): `string`

#### Returns

`string`

## Methods

### clear()

> **clear**(`blobId`, `options`?): `Promise`\<`null` \| `object`\>

#### Parameters

• **blobId**: [`BlobId`](../type-aliases/BlobId.md)

• **options?** = `{}`

• **options.diff?**: `undefined` \| `boolean`

Enable to return an object with a `block` property with number of bytes removed

#### Returns

`Promise`\<`null` \| `object`\>

***

### createEntryReadStream()

> **createEntryReadStream**(`driveId`, `entry`, `options`?): `Promise`\<[`Readable`](../type-aliases/Readable.md)\>

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

### createReadStream()

> **createReadStream**(`blobId`, `options`?): [`Readable`](../type-aliases/Readable.md)

#### Parameters

• **blobId**: [`BlobId`](../type-aliases/BlobId.md)

• **options?** = `...`

• **options.timeout?**: `undefined` \| `number`

Optional timeout to wait for a blob to download

• **options.wait?**: `undefined` \| `boolean`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

[`Readable`](../type-aliases/Readable.md)

***

### createWriteStream()

> **createWriteStream**(`blobId`, `options`?): `Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\> & `object`

#### Parameters

• **blobId**: `Omit`\<[`BlobId`](../type-aliases/BlobId.md), `"driveId"`\>

• **options?**

• **options.metadata?**: `undefined` \| `JsonObject`

Metadata to store with the blob

#### Returns

`Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\> & `object`

***

### download()

> **download**(`filter`?, `options`?): `TypedEmitter`\<[`BlobDownloadEvents`](../interfaces/BlobDownloadEvents.md)\>

Download blobs from all drives, optionally filtering particular blob types
or blob variants. Download will be 'live' and will continue downloading new
data as it becomes available from any replicating drive.

If no filter is specified, all blobs will be downloaded. If a filter is
specified, then _only_ blobs that match the filter will be downloaded.

#### Parameters

• **filter?**: [`BlobFilter`](../type-aliases/BlobFilter.md)

Filter blob types and/or variants to download. Filter is { [BlobType]: BlobVariants[] }. At least one blob variant must be specified for each blob type.

• **options?** = `{}`

• **options.signal?**: `undefined` \| `AbortSignal`

Optional AbortSignal to cancel in-progress download

#### Returns

`TypedEmitter`\<[`BlobDownloadEvents`](../interfaces/BlobDownloadEvents.md)\>

***

### entry()

> **entry**(`blobId`, `options`?): `Promise`\<`null` \| [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)\>

#### Parameters

• **blobId**: [`BlobId`](../type-aliases/BlobId.md)

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

• **blobId**: [`BlobId`](../type-aliases/BlobId.md)

• **opts** = `{}`

• **opts.timeout**: `undefined`

Optional timeout to wait for a blob to download

• **opts.wait**: `undefined` \| `false` = `false`

Set to `true` to wait for a blob to download, otherwise will throw if blob is not available locally

#### Returns

`Promise`\<`Uint8Array`\>

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

• **blobId**: `Omit`\<[`BlobId`](../type-aliases/BlobId.md), `"driveId"`\>

• **blob**: `Buffer`

• **options?**

• **options.metadata?**: `undefined` \| `JsonObject`

Metadata to store with the blob

#### Returns

`Promise`\<`string`\>

discovery key as hex string of hyperdrive where blob is stored
