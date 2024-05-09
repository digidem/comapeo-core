[API](../README.md) / [\<internal\>](../modules/internal_.md) / Channel

# Interface: Channel

[\<internal\>](../modules/internal_.md).Channel

## Table of contents

### Properties

- [closed](internal_.Channel.md#closed)
- [destroyed](internal_.Channel.md#destroyed)
- [id](internal_.Channel.md#id)
- [messages](internal_.Channel.md#messages)
- [opened](internal_.Channel.md#opened)
- [protocol](internal_.Channel.md#protocol)
- [userData](internal_.Channel.md#userdata)

### Methods

- [addMessage](internal_.Channel.md#addmessage)
- [close](internal_.Channel.md#close)
- [cork](internal_.Channel.md#cork)
- [open](internal_.Channel.md#open)
- [uncork](internal_.Channel.md#uncork)

## Properties

### closed

• **closed**: `boolean`

#### Defined in

[types/protomux.d.ts:39](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L39)

___

### destroyed

• **destroyed**: `boolean`

#### Defined in

[types/protomux.d.ts:40](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L40)

___

### id

• **id**: `Buffer`

#### Defined in

[types/protomux.d.ts:36](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L36)

___

### messages

• **messages**: [`Message`](internal_.Message.md)[]

#### Defined in

[types/protomux.d.ts:37](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L37)

___

### opened

• **opened**: `boolean`

#### Defined in

[types/protomux.d.ts:38](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L38)

___

### protocol

• **protocol**: `string`

#### Defined in

[types/protomux.d.ts:35](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L35)

___

### userData

• **userData**: `any`

#### Defined in

[types/protomux.d.ts:34](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L34)

## Methods

### addMessage

▸ **addMessage**(`opts?`): [`Message`](internal_.Message.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Partial`\<`Pick`\<[`Message`](internal_.Message.md), ``"onmessage"`` \| ``"encoding"``\>\> |

#### Returns

[`Message`](internal_.Message.md)

#### Defined in

[types/protomux.d.ts:44](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L44)

___

### close

▸ **close**(): `void`

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:43](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L43)

___

### cork

▸ **cork**(): `void`

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:41](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L41)

___

### open

▸ **open**(`handshake?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `handshake?` | `any` |

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:33](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L33)

___

### uncork

▸ **uncork**(): `void`

#### Returns

`void`

#### Defined in

[types/protomux.d.ts:42](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/protomux.d.ts#L42)
