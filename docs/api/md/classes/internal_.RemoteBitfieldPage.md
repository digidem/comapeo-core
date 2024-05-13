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

## Properties

### bitfield

• **bitfield**: `Uint32Array`

___

### index

• **index**: `number`

___

### offset

• **offset**: `number`

___

### segment

• **segment**: [`RemoteBitfieldSegment`](internal_.RemoteBitfieldSegment.md)

## Accessors

### tree

• `get` **tree**(): [`SparseIndex`](internal_.SparseIndex.md)

#### Returns

[`SparseIndex`](internal_.SparseIndex.md)

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

### get

▸ **get**(`index`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

`boolean`

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
