[API](../README.md) / [\<internal\>](../modules/internal_.md) / CoreOwnership

# Class: CoreOwnership

[\<internal\>](../modules/internal_.md).CoreOwnership

## Table of contents

### Constructors

- [constructor](internal_.CoreOwnership.md#constructor)

### Methods

- [getCoreId](internal_.CoreOwnership.md#getcoreid)
- [getOwner](internal_.CoreOwnership.md#getowner)

## Constructors

### constructor

• **new CoreOwnership**(`opts`): [`CoreOwnership`](internal_.CoreOwnership.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.coreKeypairs` | `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, [`KeyPair`](../modules/internal_.md#keypair)\> |
| `opts.dataType` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"coreOwnership"``, {}, {}\> |
| `opts.identityKeypair` | [`KeyPair`](../modules/internal_.md#keypair) |

#### Returns

[`CoreOwnership`](internal_.CoreOwnership.md)

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
