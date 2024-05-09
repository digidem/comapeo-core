[API](../README.md) / [\<internal\>](../modules/internal_.md) / Message

# Interface: Message

[\<internal\>](../modules/internal_.md).Message

## Table of contents

### Properties

- [encoding](internal_.Message.md#encoding)
- [onmessage](internal_.Message.md#onmessage)
- [type](internal_.Message.md#type)

### Methods

- [send](internal_.Message.md#send)

## Properties

### encoding

• **encoding**: [`Encoding`](internal_.Encoding.md)

#### Defined in

[types/protomux.d.ts:27](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L27)

___

### onmessage

• **onmessage**: (`message`: `any`) => `void`

#### Type declaration

▸ (`message`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

##### Returns

`void`

#### Defined in

[types/protomux.d.ts:26](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L26)

___

### type

• **type**: `number`

#### Defined in

[types/protomux.d.ts:24](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L24)

## Methods

### send

▸ **send**(`msg`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `any` |

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:25](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L25)
