[API](../README.md) / [blob-store/live-download](../modules/blob_store_live_download.md) / BlobDownloadState

# Interface: BlobDownloadState\<\>

[blob-store/live-download](../modules/blob_store_live_download.md).BlobDownloadState

## Table of contents

### Properties

- [error](blob_store_live_download.BlobDownloadState.md#error)
- [haveBytes](blob_store_live_download.BlobDownloadState.md#havebytes)
- [haveCount](blob_store_live_download.BlobDownloadState.md#havecount)
- [status](blob_store_live_download.BlobDownloadState.md#status)
- [wantBytes](blob_store_live_download.BlobDownloadState.md#wantbytes)
- [wantCount](blob_store_live_download.BlobDownloadState.md#wantcount)

## Properties

### error

• **error**: ``null``

If status = 'error' then this will be an Error object

#### Defined in

[src/blob-store/live-download.js:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L14)

___

### haveBytes

• **haveBytes**: `number`

The bytes already downloaded

#### Defined in

[src/blob-store/live-download.js:11](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L11)

___

### haveCount

• **haveCount**: `number`

The number of files already downloaded

#### Defined in

[src/blob-store/live-download.js:10](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L10)

___

### status

• **status**: ``"checking"`` \| ``"downloading"`` \| ``"downloaded"`` \| ``"aborted"``

#### Defined in

[src/blob-store/live-download.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L15)

___

### wantBytes

• **wantBytes**: `number`

The bytes pending download

#### Defined in

[src/blob-store/live-download.js:13](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L13)

___

### wantCount

• **wantCount**: `number`

The number of files pending download

#### Defined in

[src/blob-store/live-download.js:12](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/live-download.js#L12)
