[API](../README.md) / [\<internal\>](../modules/internal_.md) / default

# Class: default

[\<internal\>](../modules/internal_.md).default

## Table of contents

### Constructors

- [constructor](internal_.default-2.md#constructor)

### Properties

- [\_maxSegments](internal_.default-2.md#_maxsegments)
- [\_pages](internal_.default-2.md#_pages)
- [\_segments](internal_.default-2.md#_segments)

### Methods

- [findFirst](internal_.default-2.md#findfirst)
- [findLast](internal_.default-2.md#findlast)
- [firstSet](internal_.default-2.md#firstset)
- [firstUnset](internal_.default-2.md#firstunset)
- [get](internal_.default-2.md#get)
- [getBitfield](internal_.default-2.md#getbitfield)
- [insert](internal_.default-2.md#insert)
- [lastSet](internal_.default-2.md#lastset)
- [lastUnset](internal_.default-2.md#lastunset)
- [set](internal_.default-2.md#set)
- [setRange](internal_.default-2.md#setrange)

## Constructors

### constructor

• **new default**(): [`default`](internal_.default-2.md)

#### Returns

[`default`](internal_.default-2.md)

## Properties

### \_maxSegments

• **\_maxSegments**: `number`

___

### \_pages

• **\_pages**: [`BigSparseArray`](internal_.BigSparseArray.md)\<[`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)\>

___

### \_segments

• **\_segments**: [`BigSparseArray`](internal_.BigSparseArray.md)\<[`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)\>

## Methods

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

### firstSet

▸ **firstSet**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

___

### firstUnset

▸ **firstUnset**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

___

### get

▸ **get**(`index`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

`boolean`

___

### getBitfield

▸ **getBitfield**(`index`): ``null`` \| [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

``null`` \| [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

___

### insert

▸ **insert**(`start`, `bitfield`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `start` | `number` |
| `bitfield` | `Uint32Array` |

#### Returns

`boolean`

___

### lastSet

▸ **lastSet**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

___

### lastUnset

▸ **lastUnset**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

___

### set

▸ **set**(`index`, `val`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |
| `val` | `boolean` |

#### Returns

`void`

___

### setRange

▸ **setRange**(`start`, `length`, `val`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `start` | `number` |
| `length` | `number` |
| `val` | `boolean` |

#### Returns

`void`
