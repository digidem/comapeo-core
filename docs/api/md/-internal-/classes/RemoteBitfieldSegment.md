[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / RemoteBitfieldSegment

# Class: RemoteBitfieldSegment

## Constructors

### new RemoteBitfieldSegment()

> **new RemoteBitfieldSegment**(`index`): [`RemoteBitfieldSegment`](RemoteBitfieldSegment.md)

#### Parameters

• **index**: `number`

#### Returns

[`RemoteBitfieldSegment`](RemoteBitfieldSegment.md)

## Properties

### index

> **index**: `number`

***

### offset

> **offset**: `number`

***

### pages

> **pages**: `any`[]

***

### pagesLength

> **pagesLength**: `number`

***

### tree

> **tree**: [`SparseIndex`](SparseIndex.md)

## Accessors

### chunks

> `get` **chunks**(): [`Chunk`](../type-aliases/Chunk.md)[]

#### Returns

[`Chunk`](../type-aliases/Chunk.md)[]

## Methods

### add()

> **add**(`page`): `void`

#### Parameters

• **page**: [`RemoteBitfieldPage`](RemoteBitfieldPage.md)

#### Returns

`void`

***

### findFirst()

> **findFirst**(`val`, `position`): `number`

#### Parameters

• **val**: `boolean`

• **position**: `number`

#### Returns

`number`

***

### findLast()

> **findLast**(`val`, `position`): `number`

#### Parameters

• **val**: `boolean`

• **position**: `number`

#### Returns

`number`

***

### refresh()

> **refresh**(): `void`

#### Returns

`void`
