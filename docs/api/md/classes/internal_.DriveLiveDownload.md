[API](../README.md) / [\<internal\>](../modules/internal_.md) / DriveLiveDownload

# Class: DriveLiveDownload

[\<internal\>](../modules/internal_.md).DriveLiveDownload

LiveDownload class

## Hierarchy

- `TypedEmitter`

  ↳ **`DriveLiveDownload`**

## Table of contents

### Constructors

- [constructor](internal_.DriveLiveDownload.md#constructor)

### Accessors

- [state](internal_.DriveLiveDownload.md#state)

## Constructors

### constructor

• **new DriveLiveDownload**(`drive`, `options?`): [`DriveLiveDownload`](internal_.DriveLiveDownload.md)

Like drive.download() but 'live',

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `drive` | [`Hyperdrive`](internal_.Hyperdrive-1.md) |  |
| `options` | `Object` |  |
| `options.filter` | `undefined` \| [`BlobFilter`](../modules/internal_.md#blobfilter) | Filter blobs of specific types and/or sizes to download |
| `options.signal` | `undefined` \| `AbortSignal` |  |

#### Returns

[`DriveLiveDownload`](internal_.DriveLiveDownload.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/blob-store/live-download.js:107](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L107)

## Accessors

### state

• `get` **state**(): [`BlobDownloadState`](../interfaces/internal_.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/internal_.md#blobdownloadstateerror)

#### Returns

[`BlobDownloadState`](../interfaces/internal_.BlobDownloadState.md) \| [`BlobDownloadStateError`](../modules/internal_.md#blobdownloadstateerror)

#### Defined in

[src/blob-store/live-download.js:129](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/blob-store/live-download.js#L129)
