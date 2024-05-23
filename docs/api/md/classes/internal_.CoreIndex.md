[API](../README.md) / [\<internal\>](../modules/internal_.md) / CoreIndex

# Class: CoreIndex

[\<internal\>](../modules/internal_.md).CoreIndex

An in-memory index of open cores.

## Table of contents

### Constructors

- [constructor](internal_.CoreIndex.md#constructor)

### Methods

- [[iterator]](internal_.CoreIndex.md#[iterator])
- [add](internal_.CoreIndex.md#add)
- [getByCoreKey](internal_.CoreIndex.md#getbycorekey)
- [getByDiscoveryId](internal_.CoreIndex.md#getbydiscoveryid)
- [getByNamespace](internal_.CoreIndex.md#getbynamespace)
- [getWriter](internal_.CoreIndex.md#getwriter)

## Constructors

### constructor

• **new CoreIndex**(): [`CoreIndex`](internal_.CoreIndex.md)

#### Returns

[`CoreIndex`](internal_.CoreIndex.md)

## Methods

### [iterator]

▸ **[iterator]**(): `IterableIterator`\<[`CoreRecord`](../modules/internal_.md#corerecord)\>

#### Returns

`IterableIterator`\<[`CoreRecord`](../modules/internal_.md#corerecord)\>

___

### add

▸ **add**(`options`): `void`

NB. Need to pass key here because `core.key` is not populated until the
core is ready, but we know it beforehand.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | `Object` | `undefined` |  |
| `options.core` | `Hypercore`\<``"binary"``, `Buffer`\> | `undefined` | Hypercore instance |
| `options.key` | `Buffer` | `undefined` | Buffer containing public key of this core |
| `options.namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` | `undefined` |  |
| `options.writer` | `undefined` \| `boolean` | `false` | Is this a writer core? |

#### Returns

`void`

___

### getByCoreKey

▸ **getByCoreKey**(`coreKey`): `undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

Get a core by its public key

#### Parameters

| Name | Type |
| :------ | :------ |
| `coreKey` | `Buffer` |

#### Returns

`undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

___

### getByDiscoveryId

▸ **getByDiscoveryId**(`discoveryId`): `undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

Get a core by its discoveryId (discover key as hex string)

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryId` | `string` |

#### Returns

`undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

___

### getByNamespace

▸ **getByNamespace**(`namespace`): [`CoreRecord`](../modules/internal_.md#corerecord)[]

Get all known cores in a namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/internal_.md#corerecord)[]

___

### getWriter

▸ **getWriter**(`namespace`): [`CoreRecord`](../modules/internal_.md#corerecord)

Get the write core for the given namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/internal_.md#corerecord)
