[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Index

# Class: Index

## Extended by

- [`SparseIndex`](SparseIndex.md)
- [`DenseIndex`](DenseIndex.md)

## Constructors

### new Index()

> **new Index**(`byteLength`): [`Index`](Index.md)

#### Parameters

• **byteLength**: `number`

#### Returns

[`Index`](Index.md)

## Properties

### byteLength

> `readonly` **byteLength**: `number`

## Methods

### skipFirst()

> **skipFirst**(`value`, `position`?): `number`

#### Parameters

• **value**: `boolean`

• **position?**: `number`

#### Returns

`number`

***

### skipLast()

> **skipLast**(`value`, `position`?): `number`

#### Parameters

• **value**: `boolean`

• **position?**: `number`

#### Returns

`number`

***

### update()

> **update**(`bit`): `boolean`

#### Parameters

• **bit**: `number`

#### Returns

`boolean`

***

### from()

#### from(field, byteLength)

> `static` **from**(`field`, `byteLength`): [`DenseIndex`](DenseIndex.md)

##### Parameters

• **field**: `TypedArray`

• **byteLength**: `number`

##### Returns

[`DenseIndex`](DenseIndex.md)

#### from(chunks, byteLength)

> `static` **from**(`chunks`, `byteLength`): [`SparseIndex`](SparseIndex.md)

##### Parameters

• **chunks**: [`Chunk`](../type-aliases/Chunk.md)[]

• **byteLength**: `number`

##### Returns

[`SparseIndex`](SparseIndex.md)
