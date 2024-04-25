[API](../README.md) / [member-api](../modules/member_api.md) / MemberApi

# Class: MemberApi

[member-api](../modules/member_api.md).MemberApi

## Hierarchy

- `TypedEmitter`

  ↳ **`MemberApi`**

## Table of contents

### Constructors

- [constructor](member_api.MemberApi.md#constructor)

### Methods

- [assignRole](member_api.MemberApi.md#assignrole)
- [getById](member_api.MemberApi.md#getbyid)
- [getMany](member_api.MemberApi.md#getmany)
- [invite](member_api.MemberApi.md#invite)
- [requestCancelInvite](member_api.MemberApi.md#requestcancelinvite)

## Constructors

### constructor

• **new MemberApi**(`opts`): [`MemberApi`](member_api.MemberApi.md)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.coreOwnership` | [`CoreOwnership`](core_ownership.CoreOwnership.md) |  |
| `opts.dataTypes` | `Object` |  |
| `opts.dataTypes.deviceInfo` | `Pick`\<[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"deviceInfo"``, {}, {}\>, ``"getByDocId"`` \| ``"getMany"``\> | - |
| `opts.dataTypes.project` | `Pick`\<[`DataType`](datatype-1.DataType.md)\<[`DataStore`](datastore.DataStore.md)\<``"config"``, ``"translation"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"``\>, `SQLiteTableWithColumns`\<{}\>, ``"projectSettings"``, {}, {}\>, ``"getByDocId"``\> | - |
| `opts.deviceId` | `string` | public key of this device as hex string |
| `opts.encryptionKeys` | [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md) |  |
| `opts.projectKey` | `Buffer` |  |
| `opts.roles` | [`Roles`](roles.Roles.md) |  |
| `opts.rpc` | [`LocalPeers`](local_peers.LocalPeers.md) |  |

#### Returns

[`MemberApi`](member_api.MemberApi.md)

#### Overrides

TypedEmitter.constructor

#### Defined in

[src/member-api.js:59](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L59)

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

[src/member-api.js:308](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L308)

___

### getById

▸ **getById**(`deviceId`): `Promise`\<[`MemberInfo`](../interfaces/member_api.MemberInfo.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `deviceId` | `string` |

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/member_api.MemberInfo.md)\>

#### Defined in

[src/member-api.js:239](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L239)

___

### getMany

▸ **getMany**(): `Promise`\<[`MemberInfo`](../interfaces/member_api.MemberInfo.md)[]\>

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/member_api.MemberInfo.md)[]\>

#### Defined in

[src/member-api.js:269](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L269)

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

[src/member-api.js:93](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L93)

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

[src/member-api.js:231](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L231)
