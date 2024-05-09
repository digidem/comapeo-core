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

#### Defined in

[types/quickbit-universal.d.ts:49](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L49)

## Properties

### byteLength

• `Readonly` **byteLength**: `number`

#### Defined in

[types/quickbit-universal.d.ts:51](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L51)

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

#### Defined in

[types/quickbit-universal.d.ts:55](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L55)

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

#### Defined in

[types/quickbit-universal.d.ts:57](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L57)

___

### update

▸ **update**(`bit`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bit` | `number` |

#### Returns

`boolean`

#### Defined in

[types/quickbit-universal.d.ts:53](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L53)

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

#### Defined in

[types/quickbit-universal.d.ts:46](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L46)

▸ **from**(`chunks`, `byteLength`): [`SparseIndex`](internal_.SparseIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `chunks` | [`Chunk`](../modules/internal_.md#chunk)[] |
| `byteLength` | `number` |

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)

#### Defined in

[types/quickbit-universal.d.ts:47](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L47)
