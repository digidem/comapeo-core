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

#### Defined in

[types/quickbit-universal.d.ts:33](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L33)

## Properties

### byteLength

• `Readonly` **byteLength**: `number`

#### Inherited from

[Index](internal_.Index.md).[byteLength](internal_.Index.md#bytelength)

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

#### Inherited from

[Index](internal_.Index.md).[skipFirst](internal_.Index.md#skipfirst)

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

#### Inherited from

[Index](internal_.Index.md).[skipLast](internal_.Index.md#skiplast)

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

#### Overrides

[Index](internal_.Index.md).[update](internal_.Index.md#update)

#### Defined in

[types/quickbit-universal.d.ts:34](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L34)

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

#### Inherited from

[Index](internal_.Index.md).[from](internal_.Index.md#from)

#### Defined in

[types/quickbit-universal.d.ts:47](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/quickbit-universal.d.ts#L47)
