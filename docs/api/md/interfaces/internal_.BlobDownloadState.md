[API](../README.md) / [\<internal\>](../modules/internal_.md) / BlobDownloadState

# Interface: BlobDownloadState\<\>

[\<internal\>](../modules/internal_.md).BlobDownloadState

## Table of contents

### Properties

- [error](internal_.BlobDownloadState.md#error)
- [haveBytes](internal_.BlobDownloadState.md#havebytes)
- [haveCount](internal_.BlobDownloadState.md#havecount)
- [status](internal_.BlobDownloadState.md#status)
- [wantBytes](internal_.BlobDownloadState.md#wantbytes)
- [wantCount](internal_.BlobDownloadState.md#wantcount)

## Properties

### error

• **error**: ``null``

If status = 'error' then this will be an Error object

___

### haveBytes

• **haveBytes**: `number`

The bytes already downloaded

___

### haveCount

• **haveCount**: `number`

The number of files already downloaded

___

### status

• **status**: ``"checking"`` \| ``"downloading"`` \| ``"downloaded"`` \| ``"aborted"``

___

### wantBytes

• **wantBytes**: `number`

The bytes pending download

___

### wantCount

• **wantCount**: `number`

The number of files pending download
