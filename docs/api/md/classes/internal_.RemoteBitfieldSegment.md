[API](../README.md) / [\<internal\>](../modules/internal_.md) / RemoteBitfieldSegment

# Class: RemoteBitfieldSegment

[\<internal\>](../modules/internal_.md).RemoteBitfieldSegment

## Table of contents

### Constructors

- [constructor](internal_.RemoteBitfieldSegment.md#constructor)

### Properties

- [index](internal_.RemoteBitfieldSegment.md#index)
- [offset](internal_.RemoteBitfieldSegment.md#offset)
- [pages](internal_.RemoteBitfieldSegment.md#pages)
- [pagesLength](internal_.RemoteBitfieldSegment.md#pageslength)
- [tree](internal_.RemoteBitfieldSegment.md#tree)

### Accessors

- [chunks](internal_.RemoteBitfieldSegment.md#chunks)

### Methods

- [add](internal_.RemoteBitfieldSegment.md#add)
- [findFirst](internal_.RemoteBitfieldSegment.md#findfirst)
- [findLast](internal_.RemoteBitfieldSegment.md#findlast)
- [refresh](internal_.RemoteBitfieldSegment.md#refresh)

## Constructors

### constructor

• **new RemoteBitfieldSegment**(`index`): [`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

[`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)

#### Defined in

[src/core-manager/remote-bitfield.js:105](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L105)

## Properties

### index

• **index**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:106](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L106)

___

### offset

• **offset**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:107](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L107)

___

### pages

• **pages**: `any`[]

#### Defined in

[src/core-manager/remote-bitfield.js:111](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L111)

___

### pagesLength

• **pagesLength**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:112](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L112)

[src/core-manager/remote-bitfield.js:130](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L130)

___

### tree

• **tree**: [`SparseIndex`](internal_.SparseIndex.md)

#### Defined in

[src/core-manager/remote-bitfield.js:108](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L108)

[src/core-manager/remote-bitfield.js:120](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L120)

## Accessors

### chunks

• `get` **chunks**(): [`Chunk`](../modules/internal_.md#chunk)[]

#### Returns

[`Chunk`](../modules/internal_.md#chunk)[]

#### Defined in

[src/core-manager/remote-bitfield.js:115](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L115)

## Methods

### add

▸ **add**(`page`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `page` | [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md) |

#### Returns

`void`

#### Defined in

[src/core-manager/remote-bitfield.js:128](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L128)

___

### findFirst

▸ **findFirst**(`val`, `position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `boolean` |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:151](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L151)

___

### findLast

▸ **findLast**(`val`, `position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `val` | `boolean` |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:180](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L180)

___

### refresh

▸ **refresh**(): `void`

#### Returns

`void`

#### Defined in

[src/core-manager/remote-bitfield.js:119](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L119)
