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

#### Defined in

[src/blob-store/live-download.js:14](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L14)

___

### haveBytes

• **haveBytes**: `number`

The bytes already downloaded

#### Defined in

[src/blob-store/live-download.js:11](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L11)

___

### haveCount

• **haveCount**: `number`

The number of files already downloaded

#### Defined in

[src/blob-store/live-download.js:10](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L10)

___

### status

• **status**: ``"checking"`` \| ``"downloading"`` \| ``"downloaded"`` \| ``"aborted"``

#### Defined in

[src/blob-store/live-download.js:15](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L15)

___

### wantBytes

• **wantBytes**: `number`

The bytes pending download

#### Defined in

[src/blob-store/live-download.js:13](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L13)

___

### wantCount

• **wantCount**: `number`

The number of files pending download

#### Defined in

[src/blob-store/live-download.js:12](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L12)
