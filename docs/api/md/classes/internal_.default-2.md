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

#### Defined in

[src/core-manager/remote-bitfield.js:207](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L207)

## Properties

### \_maxSegments

• **\_maxSegments**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:212](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L212)

[src/core-manager/remote-bitfield.js:253](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L253)

[src/core-manager/remote-bitfield.js:281](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L281)

[src/core-manager/remote-bitfield.js:394](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L394)

___

### \_pages

• **\_pages**: [`BigSparseArray`](internal_.BigSparseArray.md)\<[`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)\>

#### Defined in

[src/core-manager/remote-bitfield.js:209](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L209)

___

### \_segments

• **\_segments**: [`BigSparseArray`](internal_.BigSparseArray.md)\<[`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)\>

#### Defined in

[src/core-manager/remote-bitfield.js:211](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L211)

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

#### Defined in

[src/core-manager/remote-bitfield.js:304](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L304)

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

[src/core-manager/remote-bitfield.js:340](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L340)

___

### firstSet

▸ **firstSet**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:327](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L327)

___

### firstUnset

▸ **firstUnset**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:333](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L333)

___

### get

▸ **get**(`index`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

`boolean`

#### Defined in

[src/core-manager/remote-bitfield.js:218](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L218)

___

### getBitfield

▸ **getBitfield**(`index`): ``null`` \| [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

``null`` \| [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

#### Defined in

[src/core-manager/remote-bitfield.js:230](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L230)

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

#### Defined in

[src/core-manager/remote-bitfield.js:378](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L378)

___

### lastSet

▸ **lastSet**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:364](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L364)

___

### lastUnset

▸ **lastUnset**(`position`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `position` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/remote-bitfield.js:370](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L370)

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

#### Defined in

[src/core-manager/remote-bitfield.js:242](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L242)

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

#### Defined in

[src/core-manager/remote-bitfield.js:269](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L269)
