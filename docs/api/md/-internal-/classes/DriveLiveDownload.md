[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / DriveLiveDownload

# Class: DriveLiveDownload

LiveDownload class

## Extends

- `TypedEmitter`

## Constructors

### new DriveLiveDownload()

> **new DriveLiveDownload**(`drive`, `options`): [`DriveLiveDownload`](DriveLiveDownload.md)

Like drive.download() but 'live',

#### Parameters

• **drive**: [`Hyperdrive`](Hyperdrive.md)

• **options** = `{}`

• **options.filter**: `undefined` \| [`BlobFilter`](../type-aliases/BlobFilter.md)

Filter blobs of specific types and/or sizes to download

• **options.signal**: `undefined` \| `AbortSignal`

#### Returns

[`DriveLiveDownload`](DriveLiveDownload.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### state

> `get` **state**(): [`BlobDownloadState`](../interfaces/BlobDownloadState.md) \| [`BlobDownloadStateError`](../type-aliases/BlobDownloadStateError.md)

#### Returns

[`BlobDownloadState`](../interfaces/BlobDownloadState.md) \| [`BlobDownloadStateError`](../type-aliases/BlobDownloadStateError.md)
