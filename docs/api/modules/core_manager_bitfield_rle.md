[API](../README.md) / core-manager/bitfield-rle

# Module: core-manager/bitfield-rle

## Table of contents

### Functions

- [decode](core_manager_bitfield_rle.md#decode)
- [decodingLength](core_manager_bitfield_rle.md#decodinglength)
- [encode](core_manager_bitfield_rle.md#encode)
- [encodingLength](core_manager_bitfield_rle.md#encodinglength)

## Functions

### decode

▸ **decode**(`buffer`, `offset?`): `Uint32Array`

#### Parameters

| Name | Type |
| :------ | :------ |
| `buffer` | `Buffer` |
| `offset?` | `number` |

#### Returns

`Uint32Array`

#### Defined in

[src/core-manager/bitfield-rle.js:72](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/bitfield-rle.js#L72)

___

### decodingLength

▸ **decodingLength**(`buffer`, `offset`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `buffer` | `Buffer` |
| `offset` | `number` |

#### Returns

`number`

#### Defined in

[src/core-manager/bitfield-rle.js:111](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/bitfield-rle.js#L111)

___

### encode

▸ **encode**(`bitfield`, `buffer?`, `offset?`): `Buffer`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bitfield` | `Uint32Array` |
| `buffer?` | `Buffer` |
| `offset?` | `number` |

#### Returns

`Buffer`

#### Defined in

[src/core-manager/bitfield-rle.js:38](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/bitfield-rle.js#L38)

___

### encodingLength

▸ **encodingLength**(`bitfield`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `bitfield` | `Buffer` |

#### Returns

`number`

#### Defined in

[src/core-manager/bitfield-rle.js:60](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/bitfield-rle.js#L60)
