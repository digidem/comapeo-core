[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Hyperdrive

# Class: Hyperdrive

## Extends

- `TypedEmitter`\<[`HyperdriveEvents`](../interfaces/HyperdriveEvents.md)\>

## Constructors

### new Hyperdrive()

> **new Hyperdrive**(`corestore`, `key`?, `opts`?): [`Hyperdrive`](Hyperdrive.md)

#### Parameters

• **corestore**: [`Corestore`](Corestore.md)

• **key?**: `null` \| `Buffer`

• **opts?**: [`HyperdriveOptions`](../interfaces/HyperdriveOptions.md)

#### Returns

[`Hyperdrive`](Hyperdrive.md)

#### Overrides

`TypedEmitter<HyperdriveEvents>.constructor`

### new Hyperdrive()

> **new Hyperdrive**(`corestore`, `opts`?): [`Hyperdrive`](Hyperdrive.md)

#### Parameters

• **corestore**: [`Corestore`](Corestore.md)

• **opts?**: [`HyperdriveOptions`](../interfaces/HyperdriveOptions.md)

#### Returns

[`Hyperdrive`](Hyperdrive.md)

#### Overrides

`TypedEmitter<HyperdriveEvents>.constructor`

## Properties

### blobs

> `readonly` **blobs**: `null` \| [`Hyperblobs`](Hyperblobs.md)

***

### contentKey

> `readonly` **contentKey**: `null` \| `Buffer`

***

### core

> `readonly` **core**: `Hypercore`\<`"binary"`, `undefined`\>

***

### db

> `readonly` **db**: [`Hyperbee`](Hyperbee.md)\<`any`\>

***

### discoveryKey

> `readonly` **discoveryKey**: `null` \| `Buffer`

***

### id

> `readonly` **id**: `null` \| `string`

***

### key

> `readonly` **key**: `null` \| `Buffer`

***

### version

> `readonly` **version**: `number`

## Methods

### batch()

> **batch**(): `any`

#### Returns

`any`

***

### checkout()

> **checkout**(`version`): [`Hyperdrive`](Hyperdrive.md)

#### Parameters

• **version**: `number`

#### Returns

[`Hyperdrive`](Hyperdrive.md)

***

### clear()

> **clear**(`path`, `opts`?): `Promise`\<`null` \| `object`\>

#### Parameters

• **path**: `string`

• **opts?**

• **opts.diff?**: `boolean`

#### Returns

`Promise`\<`null` \| `object`\>

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createReadStream()

> **createReadStream**(`path`, `opts`?): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **path**: `string`

• **opts?**

• **opts.core?**: `Hypercore`\<`"binary"`, `undefined`\>

• **opts.end?**: `number`

• **opts.length?**: `number`

• **opts.start?**: `number`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createWriteStream()

> **createWriteStream**(`path`, `opts`?): `Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\>

#### Parameters

• **path**: `string`

• **opts?**

• **opts.executable?**: `boolean`

• **opts.metadata?**: `any`

#### Returns

`Writable`\<`any`, `any`, `any`, `false`, `true`, `WritableEvents`\<`any`\>\>

***

### del()

> **del**(`path`): `Promise`\<`void`\>

#### Parameters

• **path**: `string`

#### Returns

`Promise`\<`void`\>

***

### diff()

> **diff**(`version`, `folder`, `opts`?): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **version**: `number`

• **folder**: `string`

• **opts?**: `any`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### download()

> **download**(`folder`?, `opts`?): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **folder?**: `string`

• **opts?**

• **opts.recursive?**: `boolean`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### downloadDiff()

> **downloadDiff**(`version`, `folder`, `opts`?): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **version**: `number`

• **folder**: `string`

• **opts?**: `any`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### downloadRange()

> **downloadRange**(`dbRanges`, `blobRanges`): `object`

#### Parameters

• **dbRanges**: [`Range`](../type-aliases/Range.md)

• **blobRanges**: [`Range`](../type-aliases/Range.md)

#### Returns

`object`

##### destroy()

> **destroy**: () => `void`

###### Returns

`void`

##### done

> **done**: `Promise`\<`void`\>

***

### entries()

> **entries**(`opts`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **opts**: `any`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### entry()

> **entry**(`path`, `opts`?): `Promise`\<`null` \| [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)\>

#### Parameters

• **path**: `string`

• **opts?**: [`HyperdriveGetOpts`](../interfaces/HyperdriveGetOpts.md)

#### Returns

`Promise`\<`null` \| [`HyperdriveEntry`](../namespaces/Hyperdrive/interfaces/HyperdriveEntry.md)\>

***

### get()

> **get**(`path`, `opts`?): `Promise`\<`null` \| `Buffer`\>

#### Parameters

• **path**: `string`

• **opts?**: `object` & [`HyperdriveGetOpts`](../interfaces/HyperdriveGetOpts.md)

#### Returns

`Promise`\<`null` \| `Buffer`\>

***

### getBlobs()

> **getBlobs**(): `Promise`\<[`Hyperblobs`](Hyperblobs.md)\>

#### Returns

`Promise`\<[`Hyperblobs`](Hyperblobs.md)\>

***

### list()

> **list**(`folder`, `opts`?): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **folder**: `string`

• **opts?**

• **opts.recursive?**: `boolean`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### mirror()

> **mirror**(): `any`

#### Returns

`any`

***

### put()

> **put**(`path`, `blob`, `opts`?): `Promise`\<`void`\>

#### Parameters

• **path**: `string`

• **blob**: `Buffer`

• **opts?**

• **opts.executable?**: `boolean`

• **opts.metadata?**: `any`

#### Returns

`Promise`\<`void`\>

***

### readdir()

> **readdir**(`folder`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **folder**: `string`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### update()

> **update**(`options`?): `Promise`\<`Boolean`\>

#### Parameters

• **options?**

• **options.wait?**: `boolean`

#### Returns

`Promise`\<`Boolean`\>
