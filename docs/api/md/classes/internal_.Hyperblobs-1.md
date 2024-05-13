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

## Properties

### blockSize

• `Readonly` **blockSize**: `number`

___

### core

• `Readonly` **core**: `Hypercore`\<``"binary"``, `undefined`\>

## Accessors

### feed

• `get` **feed**(): `Hypercore`\<``"binary"``, `undefined`\>

#### Returns

`Hypercore`\<``"binary"``, `undefined`\>

___

### locked

• `get` **locked**(): `boolean`

#### Returns

`boolean`

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

___

### createWriteStream

▸ **createWriteStream**(`opts?`): [`BlobWriteStream`](internal_.BlobWriteStream.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | `any` |

#### Returns

[`BlobWriteStream`](internal_.BlobWriteStream.md)

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
