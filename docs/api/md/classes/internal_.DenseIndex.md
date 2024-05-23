[API](../README.md) / [\<internal\>](../modules/internal_.md) / DenseIndex

# Class: DenseIndex

[\<internal\>](../modules/internal_.md).DenseIndex

## Hierarchy

- [`Index`](internal_.Index.md)

  ↳ **`DenseIndex`**

## Table of contents

### Constructors

- [constructor](internal_.DenseIndex.md#constructor)

### Properties

- [byteLength](internal_.DenseIndex.md#bytelength)

### Methods

- [skipFirst](internal_.DenseIndex.md#skipfirst)
- [skipLast](internal_.DenseIndex.md#skiplast)
- [update](internal_.DenseIndex.md#update)
- [from](internal_.DenseIndex.md#from)

## Constructors

### constructor

• **new DenseIndex**(`field`, `byteLength`): [`DenseIndex`](internal_.DenseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `field` | `TypedArray` |
| `byteLength` | `number` |

#### Returns

[`DenseIndex`](internal_.DenseIndex.md)

#### Overrides

[Index](internal_.Index.md).[constructor](internal_.Index.md#constructor)

## Properties

### byteLength

• `Readonly` **byteLength**: `number`

#### Inherited from

[Index](internal_.Index.md).[byteLength](internal_.Index.md#bytelength)

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
