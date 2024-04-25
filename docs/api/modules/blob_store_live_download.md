[API](../README.md) / blob-store/live-download

# Module: blob-store/live-download

## Table of contents

### Classes

- [DriveLiveDownload](../classes/blob_store_live_download.DriveLiveDownload.md)
- [LiveDownload](../classes/blob_store_live_download.LiveDownload.md)

### Interfaces

- [BlobDownloadEvents](../interfaces/blob_store_live_download.BlobDownloadEvents.md)
- [BlobDownloadState](../interfaces/blob_store_live_download.BlobDownloadState.md)

### Type Aliases

- [BlobDownloadStateError](blob_store_live_download.md#blobdownloadstateerror)

### Functions

- [combineStates](blob_store_live_download.md#combinestates)

## Type Aliases

### BlobDownloadStateError

Ƭ **BlobDownloadStateError**\<\>: `Omit`\<[`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md), ``"error"`` \| ``"status"``\> & \{ `error`: `Error` ; `status`: ``"error"``  }

#### Defined in

[src/blob-store/live-download.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L18)

## Functions

### combineStates

▸ **combineStates**(`liveDownloads`, `options?`): [`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](blob_store_live_download.md#blobdownloadstateerror)

Reduce multiple states into one. Factored out for unit testing because I
don't trust my coding. Probably a smarter way to do this, but this works.

#### Parameters

| Name | Type |
| :------ | :------ |
| `liveDownloads` | `Iterable`\<\{ `state`: [`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](blob_store_live_download.md#blobdownloadstateerror)  }\> |
| `options` | `Object` |
| `options.signal?` | `AbortSignal` |

#### Returns

[`BlobDownloadState`](../interfaces/blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](blob_store_live_download.md#blobdownloadstateerror)

#### Defined in

[src/blob-store/live-download.js:296](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L296)
