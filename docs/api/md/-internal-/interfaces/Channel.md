[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Channel

# Interface: Channel

## Properties

### closed

> **closed**: `boolean`

***

### destroyed

> **destroyed**: `boolean`

***

### id

> **id**: `Buffer`

***

### messages

> **messages**: [`Message`](Message.md)[]

***

### opened

> **opened**: `boolean`

***

### protocol

> **protocol**: `string`

***

### userData

> **userData**: `any`

## Methods

### addMessage()

> **addMessage**(`opts`?): [`Message`](Message.md)

#### Parameters

• **opts?**: `Partial`\<`Pick`\<[`Message`](Message.md), `"onmessage"` \| `"encoding"`\>\>

#### Returns

[`Message`](Message.md)

***

### close()

> **close**(): `void`

#### Returns

`void`

***

### cork()

> **cork**(): `void`

#### Returns

`void`

***

### open()

> **open**(`handshake`?): `void`

#### Parameters

• **handshake?**: `any`

#### Returns

`void`

***

### uncork()

> **uncork**(): `void`

#### Returns

`void`
