[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Protomux

# Class: Protomux\<TStream\>

## Type Parameters

• **TStream** *extends* `Duplex` \| `NodeDuplex` = `Duplex`

## Constructors

### new Protomux()

> **new Protomux**\<`TStream`\>(`stream`): [`Protomux`](Protomux.md)\<`TStream`\>

#### Parameters

• **stream**: `TStream`

#### Returns

[`Protomux`](Protomux.md)\<`TStream`\>

## Properties

### isProtomux

> **isProtomux**: `true`

***

### stream

> **stream**: `TStream`

## Methods

### \[iterator\]()

> **\[iterator\]**(): `IterableIterator`\<[`Channel`](../interfaces/Channel.md), `any`, `any`\>

#### Returns

`IterableIterator`\<[`Channel`](../interfaces/Channel.md), `any`, `any`\>

***

### cork()

> **cork**(): `void`

#### Returns

`void`

***

### createChannel()

> **createChannel**(`opts`): [`Channel`](../interfaces/Channel.md)

#### Parameters

• **opts**

• **opts.aliases?**: `string`[]

• **opts.handshake?**: `any`

• **opts.id?**: `null` \| `Buffer`

• **opts.messages**: `Partial`\<`Pick`\<[`Message`](../interfaces/Message.md), `"onmessage"` \| `"encoding"`\>\>[]

• **opts.protocol**: `string`

• **opts.unique?**: `boolean`

• **opts.userData?**: `any`

• **opts.onclose?**

• **opts.ondestroy?**

• **opts.onopen?**

#### Returns

[`Channel`](../interfaces/Channel.md)

***

### destroy()

> **destroy**(`err`): `void`

#### Parameters

• **err**: `Error`

#### Returns

`void`

***

### opened()

> **opened**(`opts`): `boolean`

#### Parameters

• **opts**

• **opts.id?**: `null` \| `Buffer`

• **opts.protocol**: `string`

#### Returns

`boolean`

***

### pair()

> **pair**(`opts`, `notify`): `void`

#### Parameters

• **opts**

• **opts.id?**: `null` \| `Buffer`

• **opts.protocol**: `string`

• **notify**

#### Returns

`void`

***

### uncork()

> **uncork**(): `void`

#### Returns

`void`

***

### unpair()

> **unpair**(`opts`): `void`

#### Parameters

• **opts**

• **opts.id?**: `null` \| `Buffer`

• **opts.protocol**: `string`

#### Returns

`void`

***

### from()

> `static` **from**(`stream`): [`Protomux`](Protomux.md)\<`TStream`\>

#### Parameters

• **stream**: `TStream`

#### Returns

[`Protomux`](Protomux.md)\<`TStream`\>

***

### isProtomux()

> `static` **isProtomux**(`mux`): `mux is Protomux<Duplex<any, any, any, any, true, true, DuplexEvents<any, any>>>`

#### Parameters

• **mux**: `unknown`

#### Returns

`mux is Protomux<Duplex<any, any, any, any, true, true, DuplexEvents<any, any>>>`
