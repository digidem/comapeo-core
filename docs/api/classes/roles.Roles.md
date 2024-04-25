[API](../README.md) / [roles](../modules/roles.md) / Roles

# Class: Roles

[roles](../modules/roles.md).Roles

## Table of contents

### Constructors

- [constructor](roles.Roles.md#constructor)

### Properties

- [NO\_ROLE](roles.Roles.md#no_role)

### Methods

- [assignRole](roles.Roles.md#assignrole)
- [getAll](roles.Roles.md#getall)
- [getRole](roles.Roles.md#getrole)

## Constructors

### constructor

• **new Roles**(`opts`): [`Roles`](roles.Roles.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreManager` | [`CoreManager`](core_manager.CoreManager.md) |  |
| `opts.coreOwnership` | [`CoreOwnership`](core_ownership.CoreOwnership.md) |  |
| `opts.dataType` | [`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"role"``, {}, {}\> |  |
| `opts.deviceKey` | `Buffer` | public key of this device |
| `opts.projectKey` | `Buffer` |  |

#### Returns

[`Roles`](roles.Roles.md)

#### Defined in

[src/roles.js:240](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L240)

## Properties

### NO\_ROLE

▪ `Static` **NO\_ROLE**: [`Role`](../interfaces/roles.Role.md)\<``"08e4251e36f6e7ed"``\> = `NO_ROLE`

#### Defined in

[src/roles.js:223](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L223)

## Methods

### assignRole

▸ **assignRole**(`deviceId`, `roleId`): `Promise`\<`void`\>

Assign a role to the specified `deviceId`. Devices without an assigned role
are unable to sync, except the project creator who can do anything. Only
the project creator can assign their own role. Will throw if the device's
role cannot assign the role by consulting `roleAssignment`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `roleId` | ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/roles.js:332](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L332)

___

### getAll

▸ **getAll**(): `Promise`\<`Map`\<`string`, [`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>\>

Get roles of all devices in the project. For your own device, if you have
not yet synced your own role record, the "no role" capabilties is
returned. The project creator will have the creator role unless a
different one has been assigned.

#### Returns

`Promise`\<`Map`\<`string`, [`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>\>

Map of deviceId to Role

#### Defined in

[src/roles.js:285](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L285)

___

### getRole

▸ **getRole**(`deviceId`): `Promise`\<[`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

Get the role for device `deviceId`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`Promise`\<[`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

#### Defined in

[src/roles.js:254](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L254)
