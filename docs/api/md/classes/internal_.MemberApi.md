[API](../README.md) / [\<internal\>](../modules/internal_.md) / MemberApi

# Class: MemberApi

[\<internal\>](../modules/internal_.md).MemberApi

## Hierarchy

- `TypedEmitter`

  ↳ **`MemberApi`**

## Table of contents

### Constructors

- [constructor](internal_.MemberApi.md#constructor)

### Methods

- [assignRole](internal_.MemberApi.md#assignrole)
- [getById](internal_.MemberApi.md#getbyid)
- [getMany](internal_.MemberApi.md#getmany)
- [invite](internal_.MemberApi.md#invite)
- [requestCancelInvite](internal_.MemberApi.md#requestcancelinvite)

## Constructors

### constructor

• **new MemberApi**(`opts`): [`MemberApi`](internal_.MemberApi.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreOwnership` | [`CoreOwnership`](internal_.CoreOwnership.md) |  |
| `opts.dataTypes` | `Object` |  |
| `opts.dataTypes.deviceInfo` | `Pick`\<[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"deviceInfo"``, {}, {}\>, ``"getByDocId"`` \| ``"getMany"``\> | - |
| `opts.dataTypes.project` | `Pick`\<[`DataType`](internal_.DataType.md)\<[`DataStore`](internal_.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"projectSettings"``, {}, {}\>, ``"getByDocId"``\> | - |
| `opts.deviceId` | `string` | public key of this device as hex string |
| `opts.encryptionKeys` | `EncryptionKeys` |  |
| `opts.projectKey` | `Buffer` |  |
| `opts.roles` | [`Roles`](internal_.Roles.md) |  |
| `opts.rpc` | [`LocalPeers`](internal_.LocalPeers.md) |  |

#### Returns

[`MemberApi`](internal_.MemberApi.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/member-api.js:59](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L59)

## Methods

### assignRole

▸ **assignRole**(`deviceId`, `roleId`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `roleId` | ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/member-api.js:308](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L308)

___

### getById

▸ **getById**(`deviceId`): `Promise`\<[`MemberInfo`](../interfaces/internal_.MemberInfo.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/internal_.MemberInfo.md)\>

#### Defined in

[src/member-api.js:239](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L239)

___

### getMany

▸ **getMany**(): `Promise`\<[`MemberInfo`](../interfaces/internal_.MemberInfo.md)[]\>

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/internal_.MemberInfo.md)[]\>

#### Defined in

[src/member-api.js:269](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L269)

___

### invite

▸ **invite**(`deviceId`, `opts`): `Promise`\<``"REJECT"`` \| ``"ACCEPT"`` \| ``"ALREADY"``\>

Send an invite. Resolves when receiving a response. Rejects if the invite
is canceled, or if something else goes wrong.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |
| `opts` | `Object` |
| `opts.roleDescription` | `undefined` \| `string` |
| `opts.roleId` | ``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"`` |
| `opts.roleName` | `undefined` \| `string` |

#### Returns

`Promise`\<``"REJECT"`` \| ``"ACCEPT"`` \| ``"ALREADY"``\>

#### Defined in

[src/member-api.js:93](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L93)

___

### requestCancelInvite

▸ **requestCancelInvite**(`deviceId`): `void`

Attempt to cancel an outbound invite, if it exists.

No-op if we weren't inviting this device.

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`void`

#### Defined in

[src/member-api.js:231](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/member-api.js#L231)
