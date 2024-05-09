[API](../README.md) / [\<internal\>](../modules/internal_.md) / CoreManager

# Class: CoreManager

[\<internal\>](../modules/internal_.md).CoreManager

## Hierarchy

- `TypedEmitter`

  ↳ **`CoreManager`**

## Table of contents

### Constructors

- [constructor](internal_.CoreManager.md#constructor)

### Accessors

- [creatorCore](internal_.CoreManager.md#creatorcore)
- [deviceId](internal_.CoreManager.md#deviceid)
- [namespaces](internal_.CoreManager.md#namespaces)

### Methods

- [[kCoreManagerReplicate]](internal_.CoreManager.md#[kcoremanagerreplicate])
- [addCore](internal_.CoreManager.md#addcore)
- [close](internal_.CoreManager.md#close)
- [deleteOthersData](internal_.CoreManager.md#deleteothersdata)
- [getCoreByDiscoveryKey](internal_.CoreManager.md#getcorebydiscoverykey)
- [getCoreByKey](internal_.CoreManager.md#getcorebykey)
- [getCores](internal_.CoreManager.md#getcores)
- [getWriterCore](internal_.CoreManager.md#getwritercore)
- [ready](internal_.CoreManager.md#ready)
- [requestCoreKey](internal_.CoreManager.md#requestcorekey)

## Constructors

### constructor

• **new CoreManager**(`options`): [`CoreManager`](internal_.CoreManager.md)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | `Object` | `undefined` |  |
| `options.autoDownload` | `undefined` \| `boolean` | `true` | Immediately start downloading cores - should only be set to false for tests |
| `options.db` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> | `undefined` | Drizzle better-sqlite3 database instance |
| `options.encryptionKeys` | `undefined` \| `Partial`\<`Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, `Buffer`\>\> | `{}` | Encryption keys for each namespace |
| `options.keyManager` | `KeyManager` | `undefined` | mapeo/crypto KeyManager instance |
| `options.logger` | `undefined` \| [`Logger`](internal_.Logger.md) | `undefined` |  |
| `options.projectKey` | `Buffer` | `undefined` | 32-byte public key of the project creator core |
| `options.projectSecretKey` | `undefined` \| `Buffer` | `undefined` | 32-byte secret key of the project creator core |
| `options.storage` | `HypercoreStorage` | `undefined` | Folder to store all hypercore data |

#### Returns

[`CoreManager`](internal_.CoreManager.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/core-manager/index.js:70](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L70)

## Accessors

### creatorCore

• `get` **creatorCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/core-manager/index.js:191](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L191)

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

#### Defined in

[src/core-manager/index.js:187](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L187)

___

### namespaces

• `get` **namespaces**(): readonly [``"auth"``, ``"config"``, ``"data"``, ``"blobIndex"``, ``"blob"``]

#### Returns

readonly [``"auth"``, ``"config"``, ``"data"``, ``"blobIndex"``, ``"blob"``]

#### Defined in

[src/core-manager/index.js:55](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L55)

## Methods

### [kCoreManagerReplicate]

▸ **[kCoreManagerReplicate]**(`stream`): [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

ONLY FOR TESTING
Replicate all cores in core manager

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | [`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\> |

#### Returns

[`Protomux`](internal_.Protomux.md)\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

#### Defined in

[src/core-manager/index.js:482](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L482)

___

### addCore

▸ **addCore**(`key`, `namespace`): [`CoreRecord`](../modules/internal_.md#corerecord)

Add a core to the manager (will be persisted across restarts)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `Buffer` | 32-byte public key of core to add |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |  |

#### Returns

[`CoreRecord`](../modules/internal_.md#corerecord)

#### Defined in

[src/core-manager/index.js:268](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L268)

___

### close

▸ **close**(): `Promise`\<`void`\>

Close all open cores and end any replication streams
TODO: gracefully close replication streams

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/core-manager/index.js:250](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L250)

___

### deleteOthersData

▸ **deleteOthersData**(`namespace`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/core-manager/index.js:501](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L501)

___

### getCoreByDiscoveryKey

▸ **getCoreByDiscoveryKey**(`discoveryKey`): `undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

Get a core by its discovery key

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`undefined` \| [`CoreRecord`](../modules/internal_.md#corerecord)

#### Defined in

[src/core-manager/index.js:239](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L239)

___

### getCoreByKey

▸ **getCoreByKey**(`key`): `undefined` \| `Hypercore`\<``"binary"``, `Buffer`\>

Get a core by its public key

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `Buffer` |

#### Returns

`undefined` \| `Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/core-manager/index.js:228](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L228)

___

### getCores

▸ **getCores**(`namespace`): [`CoreRecord`](../modules/internal_.md#corerecord)[]

Get an array of all cores in the given namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/internal_.md#corerecord)[]

#### Defined in

[src/core-manager/index.js:218](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L218)

___

### getWriterCore

▸ **getWriterCore**(`namespace`): [`CoreRecord`](../modules/internal_.md#corerecord)

Get the writer core for the given namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/internal_.md#corerecord)

#### Defined in

[src/core-manager/index.js:209](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L209)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

Resolves when all cores have finished loading

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/core-manager/index.js:200](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L200)

___

### requestCoreKey

▸ **requestCoreKey**(`peerKey`, `discoveryKey`): `void`

Send an extension message over the project creator core replication stream
requesting a core key for the given discovery key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `peerKey` | `Buffer` |
| `discoveryKey` | `Buffer` |

#### Returns

`void`

#### Defined in

[src/core-manager/index.js:366](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/core-manager/index.js#L366)
