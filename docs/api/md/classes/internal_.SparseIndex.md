[API](../README.md) / [\<internal\>](../modules/internal_.md) / SparseIndex

# Class: SparseIndex

[\<internal\>](../modules/internal_.md).SparseIndex

## Hierarchy

- [`Index`](internal_.Index.md)

  ↳ **`SparseIndex`**

## Table of contents

### Constructors

- [constructor](internal_.SparseIndex.md#constructor)

### Properties

- [byteLength](internal_.SparseIndex.md#bytelength)
- [chunks](internal_.SparseIndex.md#chunks)

### Methods

- [skipFirst](internal_.SparseIndex.md#skipfirst)
- [skipLast](internal_.SparseIndex.md#skiplast)
- [update](internal_.SparseIndex.md#update)
- [from](internal_.SparseIndex.md#from)

## Constructors

### constructor

• **new SparseIndex**(`chunks`, `byteLength`): [`SparseIndex`](internal_.SparseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | [`Chunk`](../modules/internal_.md#chunk)[] |
| `byteLength` | `number` |

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)

#### Overrides

[Index](internal_.Index.md).[constructor](internal_.Index.md#constructor)

## Properties

### byteLength

• `Readonly` **byteLength**: `number`

#### Inherited from

[Index](internal_.Index.md).[byteLength](internal_.Index.md#bytelength)

___

### chunks

• `Readonly` **chunks**: [`Chunk`](../modules/internal_.md#chunk)[]

## Methods

### skipFirst

▸ **skipFirst**(`value`, `position?`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |
| `position?` | `number` |

#### Returns

`number`

#### Inherited from

[Index](internal_.Index.md).[skipFirst](internal_.Index.md#skipfirst)

___

### skipLast

▸ **skipLast**(`value`, `position?`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `boolean` |
| `position?` | `number` |

#### Returns

`number`

#### Inherited from

[Index](internal_.Index.md).[skipLast](internal_.Index.md#skiplast)

___

### update

▸ **update**(`bit`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bit` | `number` |

#### Returns

`boolean`

#### Overrides

[Index](internal_.Index.md).[update](internal_.Index.md#update)

___

### from

▸ **from**(`field`, `byteLength`): [`DenseIndex`](internal_.DenseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `field` | `TypedArray` |
| `byteLength` | `number` |

#### Returns

[`DenseIndex`](internal_.DenseIndex.md)

#### Inherited from

[Index](internal_.Index.md).[from](internal_.Index.md#from)

▸ **from**(`chunks`, `byteLength`): [`SparseIndex`](internal_.SparseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | [`Chunk`](../modules/internal_.md#chunk)[] |
| `byteLength` | `number` |

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)

#### Inherited from

[Index](internal_.Index.md).[from](internal_.Index.md#from)
