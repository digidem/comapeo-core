[API](../README.md) / [\<internal\>](../modules/internal_.md) / Encoding

# Interface: Encoding

[\<internal\>](../modules/internal_.md).Encoding

## Table of contents

### Methods

- [decode](internal_.Encoding.md#decode)
- [encode](internal_.Encoding.md#encode)
- [preencode](internal_.Encoding.md#preencode)

## Methods

### decode

▸ **decode**(`state`): `any`

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | [`EncodingState`](internal_.EncodingState.md) |

#### Returns

`any`

#### Defined in

[types/protomux.d.ts:20](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L20)

___

### encode

▸ **encode**(`state`, `value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | [`EncodingState`](internal_.EncodingState.md) |
| `value` | `any` |

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:19](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L19)

___

### preencode

▸ **preencode**(`state`, `value`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `state` | [`PreEncodingState`](internal_.PreEncodingState.md) |
| `value` | `any` |

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:18](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L18)
