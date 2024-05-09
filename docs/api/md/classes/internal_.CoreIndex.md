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

#### Defined in

[src/core-manager/core-index.js:15](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L15)

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

#### Defined in

[src/core-manager/core-index.js:29](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L29)

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

#### Defined in

[src/core-manager/core-index.js:83](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L83)

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

#### Defined in

[src/core-manager/core-index.js:73](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L73)

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

#### Defined in

[src/core-manager/core-index.js:45](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L45)

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

#### Defined in

[src/core-manager/core-index.js:59](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/core-index.js#L59)
