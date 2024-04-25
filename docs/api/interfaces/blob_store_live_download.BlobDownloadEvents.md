[API](../README.md) / [blob-store/live-download](../modules/blob_store_live_download.md) / BlobDownloadEvents

# Interface: BlobDownloadEvents\<\>

[blob-store/live-download](../modules/blob_store_live_download.md).BlobDownloadEvents

## Table of contents

### Properties

- [state](blob_store_live_download.BlobDownloadEvents.md#state)

## Properties

### state

• **state**: (`state`: [`BlobDownloadState`](blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror)) => `void`

Emitted with the current download state whenever it changes (not emitted during initial 'checking' status)

#### Type declaration

▸ (`state`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `state` | [`BlobDownloadState`](blob_store_live_download.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/blob_store_live_download.md#blobdownloadstateerror) |

##### Returns

`void`

#### Defined in

[src/blob-store/live-download.js:22](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L22)
