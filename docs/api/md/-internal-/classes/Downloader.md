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

- [`default`](default.md)

## Constructors

### new Downloader()

> **new Downloader**(`driveIndex`, `options`?): [`Downloader`](Downloader.md)

#### Parameters

• **driveIndex**: [`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

• **options?** = `{}`

• **options.filter?**: `undefined` \| `null` \| `_RequireAtLeastOne`\<`object`, `"photo"` \| `"video"` \| `"audio"`\>

Filter blobs of specific types and/or sizes to download

#### Returns

[`Downloader`](Downloader.md)

#### Overrides

[`default`](default.md).[`constructor`](default.md#constructors)

## Methods

### \_close()

> **\_close**(): `Promise`\<`void`\>

Cancel the downloads and clean up resources.

#### Returns

`Promise`\<`void`\>

#### Overrides

[`default`](default.md).[`_close`](default.md#_close)

***

### \_open()

> **\_open**(): `void` \| `Promise`\<`void`\>

Load any async resources here

#### Returns

`void` \| `Promise`\<`void`\>

#### Inherited from

[`default`](default.md).[`_open`](default.md#_open)

***

### close()

> **close**(): `Promise`\<`void`\>

Resolves when this resource has closed any dependencies.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`default`](default.md).[`close`](default.md#close)

***

### ready()

> **ready**(): `Promise`\<`void`\>

Resolves when this resource is initialized.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`default`](default.md).[`ready`](default.md#ready)
