[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Hyperblobs

# Class: Hyperblobs

## Constructors

### new Hyperblobs()

> **new Hyperblobs**(`core`, `opts`?): [`Hyperblobs`](Hyperblobs.md)

#### Parameters

• **core**: `Hypercore`\<`"binary"`, `undefined`\>

• **opts?**

• **opts.blocksize?**: `number`

#### Returns

[`Hyperblobs`](Hyperblobs.md)

## Properties

### blockSize

> `readonly` **blockSize**: `number`

***

### core

> `readonly` **core**: `Hypercore`\<`"binary"`, `undefined`\>

## Accessors

### feed

> `get` **feed**(): `Hypercore`\<`"binary"`, `undefined`\>

#### Returns

`Hypercore`\<`"binary"`, `undefined`\>

***

### locked

> `get` **locked**(): `boolean`

#### Returns

`boolean`

## Methods

### clear()

> **clear**(`id`, `opts`?): `Promise`\<`null` \| `object`\>

#### Parameters

• **id**: [`BlobId`](../namespaces/Hyperblobs/interfaces/BlobId.md)

• **opts?**

• **opts.diff?**: `boolean`

#### Returns

`Promise`\<`null` \| `object`\>

***

### createReadStream()

> **createReadStream**(`id`, `opts`?): [`BlobReadStream`](BlobReadStream.md)

#### Parameters

• **id**: [`BlobId`](../namespaces/Hyperblobs/interfaces/BlobId.md)

• **opts?**: `any`

#### Returns

[`BlobReadStream`](BlobReadStream.md)

***

### createWriteStream()

> **createWriteStream**(`opts`?): [`BlobWriteStream`](BlobWriteStream.md)

#### Parameters

• **opts?**: `any`

#### Returns

[`BlobWriteStream`](BlobWriteStream.md)

***

### get()

> **get**(`id`, `opts`?): `Promise`\<`null` \| `Buffer`\>

#### Parameters

• **id**: [`BlobId`](../namespaces/Hyperblobs/interfaces/BlobId.md)

• **opts?**: `any`

#### Returns

`Promise`\<`null` \| `Buffer`\>

***

### put()

> **put**(`blob`, `opts`?): `Promise`\<[`BlobId`](../namespaces/Hyperblobs/interfaces/BlobId.md)\>

#### Parameters

• **blob**: `Buffer`

• **opts?**

• **opts.blockSize?**: `number`

• **opts.core?**: `Hypercore`\<`"binary"`, `undefined`\>

• **opts.end?**: `number`

• **opts.length?**: `number`

• **opts.start?**: `number`

#### Returns

`Promise`\<[`BlobId`](../namespaces/Hyperblobs/interfaces/BlobId.md)\>
