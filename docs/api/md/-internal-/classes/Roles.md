[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Roles

# Class: Roles

## Extends

- `TypedEmitter`

## Constructors

### new Roles()

> **new Roles**(`opts`): [`Roles`](Roles.md)

#### Parameters

• **opts**

• **opts.coreManager**: [`CoreManager`](CoreManager.md)

• **opts.coreOwnership**: [`CoreOwnership`](CoreOwnership.md)

• **opts.dataType**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"coreOwnership"` \| `"role"`\>, [`JsonSchemaToDrizzleSqliteTable`](../type-aliases/JsonSchemaToDrizzleSqliteTable.md)\<`object`, `object`, `"role"`, [`AdditionalColumns`](../type-aliases/AdditionalColumns.md), `"docId"`\>, `"role"`, `object`, `object`\>

• **opts.deviceKey**: `Buffer`

public key of this device

• **opts.projectKey**: `Buffer`

#### Returns

[`Roles`](Roles.md)

#### Overrides

`TypedEmitter.constructor`

## Properties

### NO\_ROLE

> `static` **NO\_ROLE**: [`Role`](../interfaces/Role.md)\<`"08e4251e36f6e7ed"`\>

## Methods

### assignRole()

> **assignRole**(`deviceId`, `roleId`, `opts`?): `Promise`\<`void`\>

Assign a role to the specified `deviceId`. Devices without an assigned role
are unable to sync, except the project creator who can do anything. Only
the project creator can assign their own role. Will throw if the device's
role cannot assign the role by consulting `roleAssignment`.

#### Parameters

• **deviceId**: `string`

• **roleId**: `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"`

• **opts?**

• **opts.reason?**: `string`

#### Returns

`Promise`\<`void`\>

***

### getAll()

> **getAll**(): `Promise`\<`Map`\<`string`, [`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>\>

Get roles of all devices in the project. For your own device, if you have
not yet synced your own role record, the "no role" capabilties is
returned. The project creator will have the creator role unless a
different one has been assigned.

#### Returns

`Promise`\<`Map`\<`string`, [`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>\>

Map of deviceId to Role

***

### getRole()

> **getRole**(`deviceId`): `Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>

Get the role for device `deviceId`.

#### Parameters

• **deviceId**: `string`

#### Returns

`Promise`\<[`Role`](../interfaces/Role.md)\<`"a12a6702b93bd7ff"` \| `"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"` \| `"8ced989b1904606b"` \| `"08e4251e36f6e7ed"`\>\>

***

### getRoleReason()

> **getRoleReason**(`deviceId`): `Promise`\<`undefined` \| `string`\>

Get the reason for the role of `deviceId` (if it exists).

#### Parameters

• **deviceId**: `string`

#### Returns

`Promise`\<`undefined` \| `string`\>
