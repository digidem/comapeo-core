[API](../README.md) / [\<internal\>](../modules/internal_.md) / Hyperdrive

# Class: Hyperdrive

[\<internal\>](../modules/internal_.md).Hyperdrive

## Hierarchy

- `TypedEmitter`\<[`HyperdriveEvents`](../interfaces/internal_.HyperdriveEvents.md)\>

  ↳ **`Hyperdrive`**

## Table of contents

### Constructors

- [constructor](internal_.Hyperdrive-1.md#constructor)

### Properties

- [blobs](internal_.Hyperdrive-1.md#blobs)
- [contentKey](internal_.Hyperdrive-1.md#contentkey)
- [core](internal_.Hyperdrive-1.md#core)
- [db](internal_.Hyperdrive-1.md#db)
- [discoveryKey](internal_.Hyperdrive-1.md#discoverykey)
- [id](internal_.Hyperdrive-1.md#id)
- [key](internal_.Hyperdrive-1.md#key)
- [version](internal_.Hyperdrive-1.md#version)

### Methods

- [batch](internal_.Hyperdrive-1.md#batch)
- [checkout](internal_.Hyperdrive-1.md#checkout)
- [clear](internal_.Hyperdrive-1.md#clear)
- [createReadStream](internal_.Hyperdrive-1.md#createreadstream)
- [createWriteStream](internal_.Hyperdrive-1.md#createwritestream)
- [del](internal_.Hyperdrive-1.md#del)
- [diff](internal_.Hyperdrive-1.md#diff)
- [download](internal_.Hyperdrive-1.md#download)
- [downloadDiff](internal_.Hyperdrive-1.md#downloaddiff)
- [downloadRange](internal_.Hyperdrive-1.md#downloadrange)
- [entries](internal_.Hyperdrive-1.md#entries)
- [entry](internal_.Hyperdrive-1.md#entry)
- [get](internal_.Hyperdrive-1.md#get)
- [getBlobs](internal_.Hyperdrive-1.md#getblobs)
- [list](internal_.Hyperdrive-1.md#list)
- [mirror](internal_.Hyperdrive-1.md#mirror)
- [put](internal_.Hyperdrive-1.md#put)
- [readdir](internal_.Hyperdrive-1.md#readdir)
- [ready](internal_.Hyperdrive-1.md#ready)
- [update](internal_.Hyperdrive-1.md#update)

## Constructors

### constructor

• **new Hyperdrive**(`corestore`, `key?`, `opts?`): [`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `corestore` | [`Corestore`](internal_.Corestore.md) |
| `key?` | ``null`` \| `Buffer` |
| `opts?` | [`HyperdriveOptions`](../interfaces/internal_.HyperdriveOptions.md) |

#### Returns

[`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Overrides

TypedEmitter\&lt;HyperdriveEvents\&gt;.constructor

#### Defined in

[types/hyperdrive.d.ts:48](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L48)

• **new Hyperdrive**(`corestore`, `opts?`): [`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `corestore` | [`Corestore`](internal_.Corestore.md) |
| `opts?` | [`HyperdriveOptions`](../interfaces/internal_.HyperdriveOptions.md) |

#### Returns

[`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Overrides

TypedEmitter\&lt;HyperdriveEvents\&gt;.constructor

#### Defined in

[types/hyperdrive.d.ts:53](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L53)

## Properties

### blobs

• `Readonly` **blobs**: ``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)

#### Defined in

[types/hyperdrive.d.ts:56](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L56)

___

### contentKey

• `Readonly` **contentKey**: ``null`` \| `Buffer`

#### Defined in

[types/hyperdrive.d.ts:59](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L59)

___

### core

• `Readonly` **core**: `Hypercore`\<``"binary"``, `undefined`\>

#### Defined in

[types/hyperdrive.d.ts:55](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L55)

___

### db

• `Readonly` **db**: `any`

#### Defined in

[types/hyperdrive.d.ts:60](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L60)

___

### discoveryKey

• `Readonly` **discoveryKey**: ``null`` \| `Buffer`

#### Defined in

[types/hyperdrive.d.ts:58](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L58)

___

### id

• `Readonly` **id**: ``null`` \| `string`

#### Defined in

[types/hyperdrive.d.ts:54](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L54)

___

### key

• `Readonly` **key**: ``null`` \| `Buffer`

#### Defined in

[types/hyperdrive.d.ts:57](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L57)

___

### version

• `Readonly` **version**: `number`

#### Defined in

[types/hyperdrive.d.ts:61](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L61)

## Methods

### batch

▸ **batch**(): `any`

#### Returns

`any`

#### Defined in

[types/hyperdrive.d.ts:99](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L99)

___

### checkout

▸ **checkout**(`version`): [`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `number` |

#### Returns

[`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Defined in

[types/hyperdrive.d.ts:88](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L88)

___

### clear

▸ **clear**(`path`, `opts?`): `Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `opts?` | `Object` |
| `opts.diff?` | `boolean` |

#### Returns

`Promise`\<``null`` \| \{ `blocks`: `number`  }\>

#### Defined in

[types/hyperdrive.d.ts:100](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L100)

___

### createReadStream

▸ **createReadStream**(`path`, `opts?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `opts?` | `Object` |
| `opts.core?` | `Hypercore`\<``"binary"``, `undefined`\> |
| `opts.end?` | `number` |
| `opts.length?` | `number` |
| `opts.start?` | `number` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:64](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L64)

___

### createWriteStream

▸ **createWriteStream**(`path`, `opts?`): `Writable`\<`any`, `any`, `any`, ``false``, ``true``, `WritableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `opts?` | `Object` |
| `opts.executable?` | `boolean` |
| `opts.metadata?` | `any` |

#### Returns

`Writable`\<`any`, `any`, `any`, ``false``, ``true``, `WritableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:83](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L83)

___

### del

▸ **del**(`path`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[types/hyperdrive.d.ts:87](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L87)

___

### diff

▸ **diff**(`version`, `folder`, `opts?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `number` |
| `folder` | `string` |
| `opts?` | `any` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:89](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L89)

___

### download

▸ **download**(`folder?`, `opts?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `folder?` | `string` |
| `opts?` | `Object` |
| `opts.recursive?` | `boolean` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:96](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L96)

___

### downloadDiff

▸ **downloadDiff**(`version`, `folder`, `opts?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `number` |
| `folder` | `string` |
| `opts?` | `any` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:90](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L90)

___

### downloadRange

▸ **downloadRange**(`dbRanges`, `blobRanges`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `dbRanges` | [`Range`](../modules/internal_.md#range) |
| `blobRanges` | [`Range`](../modules/internal_.md#range) |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `destroy` | () => `void` |
| `done` | `Promise`\<`void`\> |

#### Defined in

[types/hyperdrive.d.ts:91](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L91)

___

### entries

▸ **entries**(`opts`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `any` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:77](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L77)

___

### entry

▸ **entry**(`path`, `opts?`): `Promise`\<``null`` \| [`HyperdriveEntry`](../interfaces/internal_.Hyperdrive.HyperdriveEntry.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `opts?` | [`HyperdriveGetOpts`](../interfaces/internal_.HyperdriveGetOpts.md) |

#### Returns

`Promise`\<``null`` \| [`HyperdriveEntry`](../interfaces/internal_.Hyperdrive.HyperdriveEntry.md)\>

#### Defined in

[types/hyperdrive.d.ts:68](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L68)

___

### get

▸ **get**(`path`, `opts?`): `Promise`\<``null`` \| `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `opts?` | \{ `follow?`: `boolean`  } & [`HyperdriveGetOpts`](../interfaces/internal_.HyperdriveGetOpts.md) |

#### Returns

`Promise`\<``null`` \| `Buffer`\>

#### Defined in

[types/hyperdrive.d.ts:73](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L73)

___

### getBlobs

▸ **getBlobs**(): `Promise`\<``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)\>

#### Returns

`Promise`\<``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)\>

#### Defined in

[types/hyperdrive.d.ts:72](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L72)

___

### list

▸ **list**(`folder`, `opts?`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `folder` | `string` |
| `opts?` | `Object` |
| `opts.recursive?` | `boolean` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:95](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L95)

___

### mirror

▸ **mirror**(): `any`

#### Returns

`any`

#### Defined in

[types/hyperdrive.d.ts:98](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L98)

___

### put

▸ **put**(`path`, `blob`, `opts?`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |
| `blob` | `Buffer` |
| `opts?` | `Object` |
| `opts.executable?` | `boolean` |
| `opts.metadata?` | `any` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[types/hyperdrive.d.ts:78](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L78)

___

### readdir

▸ **readdir**(`folder`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `folder` | `string` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Defined in

[types/hyperdrive.d.ts:97](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L97)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[types/hyperdrive.d.ts:62](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L62)

___

### update

▸ **update**(`options?`): `Promise`\<`Boolean`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `Object` |
| `options.wait?` | `boolean` |

#### Returns

`Promise`\<`Boolean`\>

#### Defined in

[types/hyperdrive.d.ts:63](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/types/hyperdrive.d.ts#L63)
