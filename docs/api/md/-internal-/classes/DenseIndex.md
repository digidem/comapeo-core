[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / DenseIndex

# Class: DenseIndex

## Extends

- [`Index`](Index.md)

## Constructors

### new DenseIndex()

> **new DenseIndex**(`field`, `byteLength`): [`DenseIndex`](DenseIndex.md)

#### Parameters

• **field**: `TypedArray`

• **byteLength**: `number`

#### Returns

[`DenseIndex`](DenseIndex.md)

#### Overrides

[`Index`](Index.md).[`constructor`](Index.md#constructors)

## Properties

### byteLength

> `readonly` **byteLength**: `number`

#### Inherited from

[`Index`](Index.md).[`byteLength`](Index.md#bytelength)

## Methods

### skipFirst()

> **skipFirst**(`value`, `position`?): `number`

#### Parameters

• **value**: `boolean`

• **position?**: `number`

#### Returns

`number`

#### Inherited from

[`Index`](Index.md).[`skipFirst`](Index.md#skipfirst)

***

### skipLast()

> **skipLast**(`value`, `position`?): `number`

#### Parameters

• **value**: `boolean`

• **position?**: `number`

#### Returns

`number`

#### Inherited from

[`Index`](Index.md).[`skipLast`](Index.md#skiplast)

***

### update()

> **update**(`bit`): `boolean`

#### Parameters

• **bit**: `number`

#### Returns

`boolean`

#### Overrides

[`Index`](Index.md).[`update`](Index.md#update)

***

### from()

#### from(field, byteLength)

> `static` **from**(`field`, `byteLength`): [`DenseIndex`](DenseIndex.md)

##### Parameters

• **field**: `TypedArray`

• **byteLength**: `number`

##### Returns

[`DenseIndex`](DenseIndex.md)

##### Inherited from

[`Index`](Index.md).[`from`](Index.md#from)

#### from(chunks, byteLength)

> `static` **from**(`chunks`, `byteLength`): [`SparseIndex`](SparseIndex.md)

##### Parameters

• **chunks**: [`Chunk`](../type-aliases/Chunk.md)[]

• **byteLength**: `number`

##### Returns

[`SparseIndex`](SparseIndex.md)

##### Inherited from

[`Index`](Index.md).[`from`](Index.md#from)
