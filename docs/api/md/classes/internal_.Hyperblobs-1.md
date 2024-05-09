[API](../README.md) / [\<internal\>](../modules/internal_.md) / Hyperblobs

# Class: Hyperblobs

[\<internal\>](../modules/internal_.md).Hyperblobs

## Table of contents

### Constructors

- [constructor](internal_.Hyperblobs-1.md#constructor)

### Properties

- [blockSize](internal_.Hyperblobs-1.md#blocksize)
- [core](internal_.Hyperblobs-1.md#core)

### Accessors

- [feed](internal_.Hyperblobs-1.md#feed)
- [locked](internal_.Hyperblobs-1.md#locked)

### Methods

- [clear](internal_.Hyperblobs-1.md#clear)
- [createReadStream](internal_.Hyperblobs-1.md#createreadstream)
- [createWriteStream](internal_.Hyperblobs-1.md#createwritestream)
- [get](internal_.Hyperblobs-1.md#get)
- [put](internal_.Hyperblobs-1.md#put)

## Constructors

### constructor

• **new Hyperblobs**(`core`, `opts?`): [`Hyperblobs`](internal_.Hyperblobs-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `core` | `Hypercore`\<``"binary"``, `undefined`\> |
| `opts?` | `Object` |
| `opts.blocksize?` | `number` |

#### Returns

[`Hyperblobs`](internal_.Hyperblobs-1.md)

#### Defined in

[types/hyperblobs.d.ts:33](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L33)

## Properties

### blockSize

• `Readonly` **blockSize**: `number`

#### Defined in

[types/hyperblobs.d.ts:31](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L31)

___

### core

• `Readonly` **core**: `Hypercore`\<``"binary"``, `undefined`\>

#### Defined in

[types/hyperblobs.d.ts:30](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L30)

## Accessors

### feed

• `get` **feed**(): `Hypercore`\<``"binary"``, `undefined`\>

#### Returns

`Hypercore`\<``"binary"``, `undefined`\>

#### Defined in

[types/hyperblobs.d.ts:35](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L35)

___

### locked

• `get` **locked**(): `boolean`

#### Returns

`boolean`

#### Defined in

[types/hyperblobs.d.ts:37](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L37)

## Methods

### clear

▸ **clear**(`id`, `opts?`): `Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | [`BlobId`](../interfaces/internal_.Hyperblobs.BlobId.md) |
| `opts?` | `Object` |
| `opts.diff?` | `boolean` |

#### Returns

`Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Defined in

[types/hyperblobs.d.ts:59](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L59)

___

### createReadStream

▸ **createReadStream**(`id`, `opts?`): [`BlobReadStream`](internal_.BlobReadStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | [`BlobId`](../interfaces/internal_.Hyperblobs.BlobId.md) |
| `opts?` | `any` |

#### Returns

[`BlobReadStream`](internal_.BlobReadStream.md)

#### Defined in

[types/hyperblobs.d.ts:65](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L65)

___

### createWriteStream

▸ **createWriteStream**(`opts?`): [`BlobWriteStream`](internal_.BlobWriteStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `any` |

#### Returns

[`BlobWriteStream`](internal_.BlobWriteStream.md)

#### Defined in

[types/hyperblobs.d.ts:64](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L64)

___

### get

▸ **get**(`id`, `opts?`): `Promise`\<``null`` \| `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `id` | [`BlobId`](../interfaces/internal_.Hyperblobs.BlobId.md) |
| `opts?` | `any` |

#### Returns

`Promise`\<``null`` \| `Buffer`\>

#### Defined in

[types/hyperblobs.d.ts:50](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L50)

___

### put

▸ **put**(`blob`, `opts?`): `Promise`\<[`BlobId`](../interfaces/internal_.Hyperblobs.BlobId.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `blob` | `Buffer` |
| `opts?` | `Object` |
| `opts.blockSize?` | `number` |
| `opts.core?` | `Hypercore`\<``"binary"``, `undefined`\> |
| `opts.end?` | `number` |
| `opts.length?` | `number` |
| `opts.start?` | `number` |

#### Returns

`Promise`\<[`BlobId`](../interfaces/internal_.Hyperblobs.BlobId.md)\>

#### Defined in

[types/hyperblobs.d.ts:39](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperblobs.d.ts#L39)
