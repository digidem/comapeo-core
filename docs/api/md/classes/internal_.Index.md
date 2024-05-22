[API](../README.md) / [\<internal\>](../modules/internal_.md) / Index

# Class: Index

[\<internal\>](../modules/internal_.md).Index

## Hierarchy

- **`Index`**

  ↳ [`SparseIndex`](internal_.SparseIndex.md)

  ↳ [`DenseIndex`](internal_.DenseIndex.md)

## Table of contents

### Constructors

- [constructor](internal_.Index.md#constructor)

### Properties

- [byteLength](internal_.Index.md#bytelength)

### Methods

- [skipFirst](internal_.Index.md#skipfirst)
- [skipLast](internal_.Index.md#skiplast)
- [update](internal_.Index.md#update)
- [from](internal_.Index.md#from)

## Constructors

### constructor

• **new Index**(`byteLength`): [`Index`](internal_.Index.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `byteLength` | `number` |

#### Returns

[`Index`](internal_.Index.md)

## Properties

### byteLength

• `Readonly` **byteLength**: `number`

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

___

### update

▸ **update**(`bit`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bit` | `number` |

#### Returns

`boolean`

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

▸ **from**(`chunks`, `byteLength`): [`SparseIndex`](internal_.SparseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | [`Chunk`](../modules/internal_.md#chunk)[] |
| `byteLength` | `number` |

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)
