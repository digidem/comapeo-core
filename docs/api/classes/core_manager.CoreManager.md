[API](../README.md) / [core-manager](../modules/core_manager.md) / CoreManager

# Class: CoreManager

[core-manager](../modules/core_manager.md).CoreManager

## Hierarchy

- `TypedEmitter`

  ↳ **`CoreManager`**

## Table of contents

### Constructors

- [constructor](core_manager.CoreManager.md#constructor)

### Accessors

- [creatorCore](core_manager.CoreManager.md#creatorcore)
- [deviceId](core_manager.CoreManager.md#deviceid)
- [namespaces](core_manager.CoreManager.md#namespaces)

### Methods

- [[kCoreManagerReplicate]](core_manager.CoreManager.md#[kcoremanagerreplicate])
- [addCore](core_manager.CoreManager.md#addcore)
- [close](core_manager.CoreManager.md#close)
- [deleteOthersData](core_manager.CoreManager.md#deleteothersdata)
- [getCoreByDiscoveryKey](core_manager.CoreManager.md#getcorebydiscoverykey)
- [getCoreByKey](core_manager.CoreManager.md#getcorebykey)
- [getCores](core_manager.CoreManager.md#getcores)
- [getWriterCore](core_manager.CoreManager.md#getwritercore)
- [ready](core_manager.CoreManager.md#ready)
- [requestCoreKey](core_manager.CoreManager.md#requestcorekey)

## Constructors

### constructor

• **new CoreManager**(`options`): [`CoreManager`](core_manager.CoreManager.md)

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `options` | `Object` | `undefined` |  |
| `options.autoDownload` | `undefined` \| `boolean` | `true` | Immediately start downloading cores - should only be set to false for tests |
| `options.db` | `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\> | `undefined` | Drizzle better-sqlite3 database instance |
| `options.encryptionKeys` | `undefined` \| `Partial`\<`Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, `Buffer`\>\> | `{}` | Encryption keys for each namespace |
| `options.keyManager` | `KeyManager` | `undefined` | mapeo/crypto KeyManager instance |
| `options.logger` | `undefined` \| [`Logger`](logger.Logger.md) | `undefined` |  |
| `options.projectKey` | `Buffer` | `undefined` | 32-byte public key of the project creator core |
| `options.projectSecretKey` | `undefined` \| `Buffer` | `undefined` | 32-byte secret key of the project creator core |
| `options.storage` | `HypercoreStorage` | `undefined` | Folder to store all hypercore data |

#### Returns

[`CoreManager`](core_manager.CoreManager.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/core-manager/index.js:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L70)

## Accessors

### creatorCore

• `get` **creatorCore**(): `Hypercore`\<``"binary"``, `Buffer`\>

#### Returns

`Hypercore`\<``"binary"``, `Buffer`\>

#### Defined in

[src/core-manager/index.js:189](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L189)

___

### deviceId

• `get` **deviceId**(): `string`

#### Returns

`string`

#### Defined in

[src/core-manager/index.js:185](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L185)

___

### namespaces

• `get` **namespaces**(): readonly [``"auth"``, ``"config"``, ``"data"``, ``"blobIndex"``, ``"blob"``]

#### Returns

readonly [``"auth"``, ``"config"``, ``"data"``, ``"blobIndex"``, ``"blob"``]

#### Defined in

[src/core-manager/index.js:55](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L55)

## Methods

### [kCoreManagerReplicate]

▸ **[kCoreManagerReplicate]**(`stream`): `Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

ONLY FOR TESTING
Replicate all cores in core manager

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\> |

#### Returns

`Protomux`\<`Duplex`\<`any`, `any`, `any`, `any`, ``true``, ``true``, `DuplexEvents`\<`any`, `any`\>\>\>

#### Defined in

[src/core-manager/index.js:460](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L460)

___

### addCore

▸ **addCore**(`key`, `namespace`): [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

Add a core to the manager (will be persisted across restarts)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `Buffer` | 32-byte public key of core to add |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |  |

#### Returns

[`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

#### Defined in

[src/core-manager/index.js:266](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L266)

___

### close

▸ **close**(): `Promise`\<`void`\>

Close all open cores and end any replication streams
TODO: gracefully close replication streams

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/core-manager/index.js:248](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L248)

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

[src/core-manager/index.js:479](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L479)

___

### getCoreByDiscoveryKey

▸ **getCoreByDiscoveryKey**(`discoveryKey`): `undefined` \| [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

Get a core by its discovery key

#### Parameters

| Name | Type |
| :------ | :------ |
| `discoveryKey` | `Buffer` |

#### Returns

`undefined` \| [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

#### Defined in

[src/core-manager/index.js:237](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L237)

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

[src/core-manager/index.js:226](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L226)

___

### getCores

▸ **getCores**(`namespace`): [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)[]

Get an array of all cores in the given namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/core_manager_core_index.md#corerecord)[]

#### Defined in

[src/core-manager/index.js:216](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L216)

___

### getWriterCore

▸ **getWriterCore**(`namespace`): [`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

Get the writer core for the given namespace

#### Parameters

| Name | Type |
| :------ | :------ |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

[`CoreRecord`](../modules/core_manager_core_index.md#corerecord)

#### Defined in

[src/core-manager/index.js:207](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L207)

___

### ready

▸ **ready**(): `Promise`\<`void`\>

Resolves when all cores have finished loading

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/core-manager/index.js:198](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L198)

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

[src/core-manager/index.js:345](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-manager/index.js#L345)
