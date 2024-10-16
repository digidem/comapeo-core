[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / BlobDownloadState

# Interface: BlobDownloadState

## Properties

### error

> **error**: `null`

If status = 'error' then this will be an Error object

***

### haveBytes

> **haveBytes**: `number`

The bytes already downloaded

***

### haveCount

> **haveCount**: `number`

The number of files already downloaded

***

### status

> **status**: `"checking"` \| `"downloading"` \| `"downloaded"` \| `"aborted"`

***

### wantBytes

> **wantBytes**: `number`

The bytes pending download

***

### wantCount

> **wantCount**: `number`

The number of files pending download
