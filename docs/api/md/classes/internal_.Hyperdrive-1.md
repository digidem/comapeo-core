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

## Properties

### blobs

• `Readonly` **blobs**: ``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)

___

### contentKey

• `Readonly` **contentKey**: ``null`` \| `Buffer`

___

### core

• `Readonly` **core**: `Hypercore`\<``"binary"``, `undefined`\>

___

### db

• `Readonly` **db**: `any`

___

### discoveryKey

• `Readonly` **discoveryKey**: ``null`` \| `Buffer`

___

### id

• `Readonly` **id**: ``null`` \| `string`

___

### key

• `Readonly` **key**: ``null`` \| `Buffer`

___

### version

• `Readonly` **version**: `number`

## Methods

### batch

▸ **batch**(): `any`

#### Returns

`any`

___

### checkout

▸ **checkout**(`version`): [`Hyperdrive`](internal_.Hyperdrive-1.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `version` | `number` |

#### Returns

[`Hyperdrive`](internal_.Hyperdrive-1.md)

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

___

### del

▸ **del**(`path`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `path` | `string` |

#### Returns

`Promise`\<`void`\>

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

___

### entries

▸ **entries**(`opts`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `any` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

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

___

### getBlobs

▸ **getBlobs**(): `Promise`\<``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)\>

#### Returns

`Promise`\<``null`` \| [`Hyperblobs`](internal_.Hyperblobs-1.md)\>

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

___

### mirror

▸ **mirror**(): `any`

#### Returns

`any`

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

___

### readdir

▸ **readdir**(`folder`): `Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `folder` | `string` |

#### Returns

`Readable`\<`any`, `any`, `any`, ``true``, ``false``, `ReadableEvents`\<`any`\>\>

___

### ready

▸ **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

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
