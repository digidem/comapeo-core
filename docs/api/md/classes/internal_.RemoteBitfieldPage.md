[API](../README.md) / [\<internal\>](../modules/internal_.md) / RemoteBitfieldPage

# Class: RemoteBitfieldPage

[\<internal\>](../modules/internal_.md).RemoteBitfieldPage

## Table of contents

### Constructors

- [constructor](internal_.RemoteBitfieldPage.md#constructor)

### Properties

- [bitfield](internal_.RemoteBitfieldPage.md#bitfield)
- [index](internal_.RemoteBitfieldPage.md#index)
- [offset](internal_.RemoteBitfieldPage.md#offset)
- [segment](internal_.RemoteBitfieldPage.md#segment)

### Accessors

- [tree](internal_.RemoteBitfieldPage.md#tree)

### Methods

- [findFirst](internal_.RemoteBitfieldPage.md#findfirst)
- [findLast](internal_.RemoteBitfieldPage.md#findlast)
- [get](internal_.RemoteBitfieldPage.md#get)
- [insert](internal_.RemoteBitfieldPage.md#insert)
- [set](internal_.RemoteBitfieldPage.md#set)
- [setRange](internal_.RemoteBitfieldPage.md#setrange)

## Constructors

### constructor

• **new RemoteBitfieldPage**(`index`, `bitfield`, `segment`): [`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |
| `bitfield` | `Uint32Array` |
| `segment` | [`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md) |

#### Returns

[`RemoteBitfieldPage`](internal_.RemoteBitfieldPage.md)

#### Defined in

[src/core-manager/remote-bitfield.js:22](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L22)

## Properties

### bitfield

• **bitfield**: `Uint32Array`

#### Defined in

[src/core-manager/remote-bitfield.js:28](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L28)

___

### index

• **index**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:24](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L24)

___

### offset

• **offset**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:26](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L26)

___

### segment

• **segment**: [`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)

#### Defined in

[src/core-manager/remote-bitfield.js:30](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L30)

## Accessors

### tree

• `get` **tree**(): [`SparseIndex`](internal_.SparseIndex.md)

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)

#### Defined in

[src/core-manager/remote-bitfield.js:35](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L35)

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

[src/core-manager/remote-bitfield.js:78](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L78)

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

[src/core-manager/remote-bitfield.js:85](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L85)

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

[src/core-manager/remote-bitfield.js:44](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L44)

___

### insert

▸ **insert**(`start`, `bitfield`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `start` | `number` |
| `bitfield` | `Uint32Array` |

#### Returns

`void`

#### Defined in

[src/core-manager/remote-bitfield.js:94](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L94)

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

[src/core-manager/remote-bitfield.js:53](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L53)

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

[src/core-manager/remote-bitfield.js:65](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/remote-bitfield.js#L65)
