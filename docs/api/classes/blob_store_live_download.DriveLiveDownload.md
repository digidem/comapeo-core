[API](../README.md) / [blob-store/live-download](../modules/blob_store_live_download.md) / DriveLiveDownload

# Class: DriveLiveDownload

[blob-store/live-download](../modules/blob_store_live_download.md).DriveLiveDownload

LiveDownload class

## Hierarchy

- `TypedEmitter`

  ↳ **`DriveLiveDownload`**

## Table of contents

### Constructors

- [constructor](blob_store_live_download.DriveLiveDownload.md#constructor)

### Accessors

- [state](blob_store_live_download.DriveLiveDownload.md#state)

## Constructors

### constructor

• **new DriveLiveDownload**(`drive`, `options?`): [`DriveLiveDownload`](blob_store_live_download.DriveLiveDownload.md)

Like drive.download() but 'live',

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `drive` | `Hyperdrive` |  |
| `options` | `Object` |  |
| `options.filter` | `undefined` \| [`BlobFilter`](../modules/types.md#blobfilter) | Filter blobs of specific types and/or sizes to download |
| `options.signal` | `undefined` \| `AbortSignal` |  |

#### Returns

[`DriveLiveDownload`](blob_store_live_download.DriveLiveDownload.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/blob-store/live-download.js:107](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L107)

## Accessors

### state

• `get` **state**(): [`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror)

#### Returns

[`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror)

#### Defined in

[src/blob-store/live-download.js:129](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L129)
