[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / MemberApi

# Class: MemberApi

## Extends

- `TypedEmitter`

## Constructors

### new MemberApi()

> **new MemberApi**(`opts`): [`MemberApi`](MemberApi.md)

#### Parameters

• **opts**

• **opts.coreOwnership**: [`CoreOwnership`](CoreOwnership.md)

• **opts.dataTypes**

• **opts.dataTypes.deviceInfo**: `Pick`\<[`DeviceInfoDataType`](../type-aliases/DeviceInfoDataType.md), `"getByDocId"` \| `"getMany"`\>

• **opts.dataTypes.project**: `Pick`\<[`ProjectDataType`](../type-aliases/ProjectDataType.md), `"getByDocId"`\>

• **opts.deviceId**: `string`

public key of this device as hex string

• **opts.encryptionKeys**: `EncryptionKeys`

• **opts.projectKey**: `Buffer`

• **opts.roles**: [`Roles`](Roles.md)

• **opts.rpc**: [`LocalPeers`](LocalPeers.md)

#### Returns

[`MemberApi`](MemberApi.md)

#### Overrides

`TypedEmitter.constructor`

## Methods

### assignRole()

> **assignRole**(`deviceId`, `roleId`): `Promise`\<`void`\>

#### Parameters

• **deviceId**: `string`

• **roleId**: `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"`

#### Returns

`Promise`\<`void`\>

***

### getById()

> **getById**(`deviceId`): `Promise`\<[`MemberInfo`](../interfaces/MemberInfo.md)\>

#### Parameters

• **deviceId**: `string`

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/MemberInfo.md)\>

***

### getMany()

> **getMany**(): `Promise`\<[`MemberInfo`](../interfaces/MemberInfo.md)[]\>

#### Returns

`Promise`\<[`MemberInfo`](../interfaces/MemberInfo.md)[]\>

***

### invite()

> **invite**(`deviceId`, `opts`): `Promise`\<`"REJECT"` \| `"ACCEPT"` \| `"ALREADY"`\>

Send an invite. Resolves when receiving a response. Rejects if the invite
is canceled, or if something else goes wrong.

#### Parameters

• **deviceId**: `string`

• **opts**

• **opts.\_\_testOnlyInviteId**: `undefined` \| `Buffer`

Hard-code the invite ID. Only for tests.

• **opts.roleDescription**: `undefined` \| `string`

• **opts.roleId**: `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"`

• **opts.roleName**: `undefined` \| `string` = `...`

#### Returns

`Promise`\<`"REJECT"` \| `"ACCEPT"` \| `"ALREADY"`\>

***

### requestCancelInvite()

> **requestCancelInvite**(`deviceId`): `void`

Attempt to cancel an outbound invite, if it exists.

No-op if we weren't inviting this device.

#### Parameters

• **deviceId**: `string`

#### Returns

`void`
