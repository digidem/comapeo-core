[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Downloader

# Class: Downloader

Like hyperdrive.download() but 'live', and for multiple drives.

Will emit an 'error' event for any unexpected errors. A consumer must attach
an error listener to avoid uncaught errors. Sources of errors include:

- If the entries stream emits an error
- If a drive referenced in an entry is not found
- If core.has() throws (e.g. if hypercore is closed)
- If core.download().done() throws, which should not happen according to
  current hypercore code.
- If the entries stream ends unexpectedly (it should be live and not end)

NB: unlike hyperdrive.download(), this will also download deleted and
previous versions of blobs - we don't currently support editing or deleting
of blobs, so this should not be an issue, and if we do in the future,
downloading deleted and previous versions may be desirable behavior anyway

## Extends

- `TypedEmitter`

## Constructors

### new Downloader()

> **new Downloader**(`driveIndex`, `options`?): [`Downloader`](Downloader.md)

#### Parameters

• **driveIndex**: [`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

• **options?** = `{}`

• **options.filter?**: `undefined` \| `null` \| [`BlobFilter`](../type-aliases/BlobFilter.md)

Filter blobs of specific types and/or sizes to download

#### Returns

[`Downloader`](Downloader.md)

#### Overrides

`TypedEmitter.constructor`

## Methods

### destroy()

> **destroy**(): `void`

Cancel the downloads and clean up resources.

#### Returns

`void`
