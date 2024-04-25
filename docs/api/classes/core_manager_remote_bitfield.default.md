[API](../README.md) / [core-manager/remote-bitfield](../modules/core_manager_remote_bitfield.md) / default

# Class: default

[core-manager/remote-bitfield](../modules/core_manager_remote_bitfield.md).default

## Table of contents

### Constructors

- [constructor](core_manager_remote_bitfield.default.md#constructor)

### Properties

- [\_maxSegments](core_manager_remote_bitfield.default.md#_maxsegments)
- [\_pages](core_manager_remote_bitfield.default.md#_pages)
- [\_segments](core_manager_remote_bitfield.default.md#_segments)

### Methods

- [findFirst](core_manager_remote_bitfield.default.md#findfirst)
- [findLast](core_manager_remote_bitfield.default.md#findlast)
- [firstSet](core_manager_remote_bitfield.default.md#firstset)
- [firstUnset](core_manager_remote_bitfield.default.md#firstunset)
- [get](core_manager_remote_bitfield.default.md#get)
- [getBitfield](core_manager_remote_bitfield.default.md#getbitfield)
- [insert](core_manager_remote_bitfield.default.md#insert)
- [lastSet](core_manager_remote_bitfield.default.md#lastset)
- [lastUnset](core_manager_remote_bitfield.default.md#lastunset)
- [set](core_manager_remote_bitfield.default.md#set)
- [setRange](core_manager_remote_bitfield.default.md#setrange)

## Constructors

### constructor

• **new default**(): [`default`](core_manager_remote_bitfield.default.md)

#### Returns

[`default`](core_manager_remote_bitfield.default.md)

#### Defined in

[src/core-manager/remote-bitfield.js:207](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L207)

## Properties

### \_maxSegments

• **\_maxSegments**: `number`

#### Defined in

[src/core-manager/remote-bitfield.js:212](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L212)

[src/core-manager/remote-bitfield.js:253](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L253)

[src/core-manager/remote-bitfield.js:281](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L281)

[src/core-manager/remote-bitfield.js:394](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L394)

___

### \_pages

• **\_pages**: `BigSparseArray`\<`RemoteBitfieldPage`\>

#### Defined in

[src/core-manager/remote-bitfield.js:209](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L209)

___

### \_segments

• **\_segments**: `BigSparseArray`\<`RemoteBitfieldSegment`\>

#### Defined in

[src/core-manager/remote-bitfield.js:211](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L211)

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

[src/core-manager/remote-bitfield.js:304](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L304)

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

[src/core-manager/remote-bitfield.js:340](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L340)

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

[src/core-manager/remote-bitfield.js:327](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L327)

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

[src/core-manager/remote-bitfield.js:333](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L333)

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

[src/core-manager/remote-bitfield.js:218](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L218)

___

### getBitfield

▸ **getBitfield**(`index`): ``null`` \| `RemoteBitfieldPage`

#### Parameters

| Name | Type |
| :------ | :------ |
| `index` | `number` |

#### Returns

``null`` \| `RemoteBitfieldPage`

#### Defined in

[src/core-manager/remote-bitfield.js:230](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L230)

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

[src/core-manager/remote-bitfield.js:378](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L378)

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

[src/core-manager/remote-bitfield.js:364](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L364)

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

[src/core-manager/remote-bitfield.js:370](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L370)

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

[src/core-manager/remote-bitfield.js:242](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L242)

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

[src/core-manager/remote-bitfield.js:269](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/remote-bitfield.js#L269)
