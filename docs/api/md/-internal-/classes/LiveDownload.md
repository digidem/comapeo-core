[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / LiveDownload

# Class: LiveDownload

LiveDownload class

## Extends

- `TypedEmitter`

## Constructors

### new LiveDownload()

> **new LiveDownload**(`drives`, `emitter`, `options`): [`LiveDownload`](LiveDownload.md)

Like drive.download() but 'live', and for multiple drives

#### Parameters

• **drives**: `Iterable`\<[`Hyperdrive`](Hyperdrive.md), `any`, `any`\>

• **emitter**: [`InternalDriveEmitter`](../type-aliases/InternalDriveEmitter.md)

• **options**

• **options.filter**: `undefined` \| [`BlobFilter`](../type-aliases/BlobFilter.md)

Filter blobs of specific types and/or sizes to download

• **options.signal**: `undefined` \| `AbortSignal`

#### Returns

[`LiveDownload`](LiveDownload.md)

#### Overrides

`TypedEmitter.constructor`

## Accessors

### state

> `get` **state**(): [`BlobDownloadState`](../interfaces/BlobDownloadState.md) \| [`BlobDownloadStateError`](../type-aliases/BlobDownloadStateError.md)

#### Returns

[`BlobDownloadState`](../interfaces/BlobDownloadState.md) \| [`BlobDownloadStateError`](../type-aliases/BlobDownloadStateError.md)
