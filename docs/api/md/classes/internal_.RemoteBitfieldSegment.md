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

## Properties

### index

• **index**: `number`

___

### offset

• **offset**: `number`

___

### pages

• **pages**: `any`[]

___

### pagesLength

• **pagesLength**: `number`

___

### tree

• **tree**: [`SparseIndex`](internal_.SparseIndex.md)

## Accessors

### chunks

• `get` **chunks**(): [`Chunk`](../modules/internal_.md#chunk)[]

#### Returns

[`Chunk`](../modules/internal_.md#chunk)[]

## Methods

### add

▸ **add**(`page`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `page` | [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md) |

#### Returns

`void`

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

___

### refresh

▸ **refresh**(): `void`

#### Returns

`void`
