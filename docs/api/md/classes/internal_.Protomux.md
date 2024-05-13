[API](../README.md) / [\<internal\>](../modules/internal_.md) / Protomux

# Class: Protomux\<TStream\>

[\<internal\>](../modules/internal_.md).Protomux

## Type parameters

| Name | Type |
| :------ | :------ |
| `TStream` | extends `Duplex` \| `NodeDuplex` = `Duplex` |

## Table of contents

### Constructors

- [constructor](internal_.Protomux.md#constructor)

### Properties

- [isProtomux](internal_.Protomux.md#isprotomux)
- [stream](internal_.Protomux.md#stream)

### Methods

- [cork](internal_.Protomux.md#cork)
- [createChannel](internal_.Protomux.md#createchannel)
- [destroy](internal_.Protomux.md#destroy)
- [opened](internal_.Protomux.md#opened)
- [pair](internal_.Protomux.md#pair)
- [uncork](internal_.Protomux.md#uncork)
- [unpair](internal_.Protomux.md#unpair)
- [from](internal_.Protomux.md#from)
- [isProtomux](internal_.Protomux.md#isprotomux-1)

## Constructors

### constructor

• **new Protomux**\<`TStream`\>(`stream`): [`Protomux`](internal_.Protomux.md)\<`TStream`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TStream` | extends `Duplex` \| `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> = `Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `TStream` |

#### Returns

[`Protomux`](internal_.Protomux.md)\<`TStream`\>

## Properties

### isProtomux

• **isProtomux**: ``true``

___

### stream

• **stream**: `TStream`

## Methods

### cork

▸ **cork**(): `void`

#### Returns

`void`

___

### createChannel

▸ **createChannel**(`opts`): [`Channel`](../interfaces/internal_.Channel.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.aliases?` | `string`[] |
| `opts.handshake?` | [`Encoding`](../interfaces/internal_.Encoding.md) |
| `opts.id?` | `Buffer` |
| `opts.messages` | `Partial`\<`Pick`\<[`Message`](../interfaces/internal_.Message.md), ``"onmessage"`` \| ``"encoding"``\>\>[] |
| `opts.protocol` | `string` |
| `opts.unique?` | `boolean` |
| `opts.userData?` | `any` |
| `opts.onclose?` | () => `void` \| `Promise`\<`void`\> |
| `opts.ondestroy?` | () => `void` \| `Promise`\<`void`\> |
| `opts.onopen?` | (`handshake?`: `any`) => `void` \| `Promise`\<`void`\> |

#### Returns

[`Channel`](../interfaces/internal_.Channel.md)

___

### destroy

▸ **destroy**(`err`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `err` | `Error` |

#### Returns

`void`

___

### opened

▸ **opened**(`opts`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.id?` | `Buffer` |
| `opts.protocol` | `string` |

#### Returns

`boolean`

___

### pair

▸ **pair**(`opts`, `notify`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.id?` | `Buffer` |
| `opts.protocol` | `string` |
| `notify` | (`id`: `Buffer`) => `Promise`\<`void`\> |

#### Returns

`void`

___

### uncork

▸ **uncork**(): `void`

#### Returns

`void`

___

### unpair

▸ **unpair**(`opts`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.id?` | `Buffer` |
| `opts.protocol` | `string` |

#### Returns

`void`

___

### from

▸ **from**(`stream`): [`Protomux`](internal_.Protomux.md)\<`TStream`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `TStream` |

#### Returns

[`Protomux`](internal_.Protomux.md)\<`TStream`\>

___

### isProtomux

▸ **isProtomux**(`mux`): mux is Protomux\<Duplex\<any, any, any, any, true, true, DuplexEvents\<any, any\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `mux` | `unknown` |

#### Returns

mux is Protomux\<Duplex\<any, any, any, any, true, true, DuplexEvents\<any, any\>\>\>
