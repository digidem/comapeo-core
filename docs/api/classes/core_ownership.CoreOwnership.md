[API](../README.md) / [core-ownership](../modules/core_ownership.md) / CoreOwnership

# Class: CoreOwnership

[core-ownership](../modules/core_ownership.md).CoreOwnership

## Table of contents

### Constructors

- [constructor](core_ownership.CoreOwnership.md#constructor)

### Methods

- [getCoreId](core_ownership.CoreOwnership.md#getcoreid)
- [getOwner](core_ownership.CoreOwnership.md#getowner)

## Constructors

### constructor

• **new CoreOwnership**(`opts`): [`CoreOwnership`](core_ownership.CoreOwnership.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.coreKeypairs` | `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`KeyPair`](../modules/types.md#keypair)\> |
| `opts.dataType` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"coreOwnership"``, {}, {}\> |
| `opts.identityKeypair` | [`KeyPair`](../modules/types.md#keypair) |

#### Returns

[`CoreOwnership`](core_ownership.CoreOwnership.md)

#### Defined in

[src/core-ownership.js:33](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-ownership.js#L33)

## Methods

### getCoreId

▸ **getCoreId**(`deviceId`, `namespace`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `namespace` | ``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"`` |

#### Returns

`Promise`\<`string`\>

coreId of core belonging to `deviceId` for `namespace`

#### Defined in

[src/core-ownership.js:83](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-ownership.js#L83)

___

### getOwner

▸ **getOwner**(`coreId`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `coreId` | `string` |

#### Returns

`Promise`\<`string`\>

deviceId of device that owns the core

#### Defined in

[src/core-ownership.js:60](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-ownership.js#L60)
