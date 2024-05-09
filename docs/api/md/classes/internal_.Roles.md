[API](../README.md) / [\<internal\>](../modules/internal_.md) / Roles

# Class: Roles

[\<internal\>](../modules/internal_.md).Roles

## Table of contents

### Constructors

- [constructor](internal_.Roles.md#constructor)

### Properties

- [NO\_ROLE](internal_.Roles.md#no_role)

### Methods

- [assignRole](internal_.Roles.md#assignrole)
- [getAll](internal_.Roles.md#getall)
- [getRole](internal_.Roles.md#getrole)

## Constructors

### constructor

• **new Roles**(`opts`): [`Roles`](internal_.Roles.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreManager` | [`CoreManager`](internal_.CoreManager.md) |  |
| `opts.coreOwnership` | [`CoreOwnership`](internal_.CoreOwnership.md) |  |
| `opts.dataType` | [`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"auth"``, ``"role"`` \| ``"coreOwnership"``\>, `SQLiteTableWithColumns`\<{}\>, ``"role"``, {}, {}\> |  |
| `opts.deviceKey` | `Buffer` | public key of this device |
| `opts.projectKey` | `Buffer` |  |

#### Returns

[`Roles`](internal_.Roles.md)

#### Defined in

[src/roles.js:240](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L240)

## Properties

### NO\_ROLE

▪ `Static` **NO\_ROLE**: [`Role`](../interfaces/internal_.Role.md)\<``"08e4251e36f6e7ed"``\> = `NO_ROLE`

#### Defined in

[src/roles.js:223](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L223)

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

[src/roles.js:332](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L332)

___

### getAll

▸ **getAll**(): `Promise`\<`Map`\<`string`, [`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>\>

Get roles of all devices in the project. For your own device, if you have
not yet synced your own role record, the "no role" capabilties is
returned. The project creator will have the creator role unless a
different one has been assigned.

#### Returns

`Promise`\<`Map`\<`string`, [`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>\>

Map of deviceId to Role

#### Defined in

[src/roles.js:285](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L285)

___

### getRole

▸ **getRole**(`deviceId`): `Promise`\<[`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

Get the role for device `deviceId`.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`Promise`\<[`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"`` \| ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` \| ``"8ced989b1904606b"`` \| ``"08e4251e36f6e7ed"``\>\>

#### Defined in

[src/roles.js:254](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L254)
