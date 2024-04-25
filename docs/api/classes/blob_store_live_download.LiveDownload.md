[API](../README.md) / [blob-store/live-download](../modules/blob_store_live_download.md) / LiveDownload

# Class: LiveDownload

[blob-store/live-download](../modules/blob_store_live_download.md).LiveDownload

LiveDownload class

## Hierarchy

- `TypedEmitter`

  ↳ **`LiveDownload`**

## Table of contents

### Constructors

- [constructor](blob_store_live_download.LiveDownload.md#constructor)

### Accessors

- [state](blob_store_live_download.LiveDownload.md#state)

## Constructors

### constructor

• **new LiveDownload**(`drives`, `emitter`, `options`): [`LiveDownload`](blob_store_live_download.LiveDownload.md)

Like drive.download() but 'live', and for multiple drives

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `drives` | `Iterable`\<`Hyperdrive`\> |  |
| `emitter` | [`InternalDriveEmitter`](../modules/blob_store.md#internaldriveemitter) |  |
| `options` | `Object` |  |
| `options.filter` | `undefined` \| [`BlobFilter`](../modules/types.md#blobfilter) | Filter blobs of specific types and/or sizes to download |
| `options.signal` | `undefined` \| `AbortSignal` |  |

#### Returns

[`LiveDownload`](blob_store_live_download.LiveDownload.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/blob-store/live-download.js:42](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L42)

## Accessors

### state

• `get` **state**(): [`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror)

#### Returns

[`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror)

#### Defined in

[src/blob-store/live-download.js:78](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L78)
