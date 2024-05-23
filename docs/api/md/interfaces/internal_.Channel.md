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

___

### destroyed

• **destroyed**: `boolean`

___

### id

• **id**: `Buffer`

___

### messages

• **messages**: [`Message`](internal_.Message.md)[]

___

### opened

• **opened**: `boolean`

___

### protocol

• **protocol**: `string`

___

### userData

• **userData**: `any`

## Methods

### addMessage

▸ **addMessage**(`opts?`): [`Message`](internal_.Message.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `Partial`\<`Pick`\<[`Message`](internal_.Message.md), ``"onmessage"`` \| ``"encoding"``\>\> |

#### Returns

[`Message`](internal_.Message.md)

___

### close

▸ **close**(): `void`

#### Returns

`void`

___

### cork

▸ **cork**(): `void`

#### Returns

`void`

___

### open

▸ **open**(`handshake?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `handshake?` | `any` |

#### Returns

`void`

___

### uncork

▸ **uncork**(): `void`

#### Returns

`void`
