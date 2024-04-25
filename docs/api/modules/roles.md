[API](../README.md) / roles

# Module: roles

## Table of contents

### Classes

- [Roles](../classes/roles.Roles.md)

### Interfaces

- [DocCapability](../interfaces/roles.DocCapability.md)
- [Role](../interfaces/roles.Role.md)

### Type Aliases

- [ElementOf](roles.md#elementof)
- [RoleId](roles.md#roleid)
- [RoleIdAssignableToAnyone](roles.md#roleidassignabletoanyone)
- [RoleIdAssignableToOthers](roles.md#roleidassignabletoothers)
- [RoleIdForNewInvite](roles.md#roleidfornewinvite)

### Variables

- [BLOCKED\_ROLE\_ID](roles.md#blocked_role_id)
- [COORDINATOR\_ROLE\_ID](roles.md#coordinator_role_id)
- [CREATOR\_ROLE](roles.md#creator_role)
- [CREATOR\_ROLE\_ID](roles.md#creator_role_id)
- [LEFT\_ROLE\_ID](roles.md#left_role_id)
- [MEMBER\_ROLE\_ID](roles.md#member_role_id)
- [NO\_ROLE](roles.md#no_role)
- [NO\_ROLE\_ID](roles.md#no_role_id)
- [ROLES](roles.md#roles)

### Functions

- [isRoleIdAssignableToOthers](roles.md#isroleidassignabletoothers)
- [isRoleIdForNewInvite](roles.md#isroleidfornewinvite)

## Type Aliases

### ElementOf

Ƭ **ElementOf**\<`T`\>: `T` extends `Iterable`\<infer U\> ? `U` : `never`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/roles.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L15)

___

### RoleId

Ƭ **RoleId**\<\>: [`ElementOf`](roles.md#elementof)\<typeof `ROLE_IDS`\>

#### Defined in

[src/roles.js:19](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L19)

___

### RoleIdAssignableToAnyone

Ƭ **RoleIdAssignableToAnyone**\<\>: [`ElementOf`](roles.md#elementof)\<typeof `ROLE_IDS_ASSIGNABLE_TO_ANYONE`\>

#### Defined in

[src/roles.js:44](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L44)

___

### RoleIdAssignableToOthers

Ƭ **RoleIdAssignableToOthers**\<\>: [`ElementOf`](roles.md#elementof)\<typeof `ROLE_IDS_ASSIGNABLE_TO_OTHERS`\>

#### Defined in

[src/roles.js:38](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L38)

___

### RoleIdForNewInvite

Ƭ **RoleIdForNewInvite**\<\>: [`ElementOf`](roles.md#elementof)\<typeof `ROLE_IDS_FOR_NEW_INVITE`\>

#### Defined in

[src/roles.js:32](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L32)

## Variables

### BLOCKED\_ROLE\_ID

• `Const` **BLOCKED\_ROLE\_ID**: ``"9e6d29263cba36c9"``

#### Defined in

[src/roles.js:10](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L10)

___

### COORDINATOR\_ROLE\_ID

• `Const` **COORDINATOR\_ROLE\_ID**: ``"f7c150f5a3a9a855"``

#### Defined in

[src/roles.js:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L8)

___

### CREATOR\_ROLE

• `Const` **CREATOR\_ROLE**: [`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"``\>

This is currently the same as 'Coordinator' role, but defined separately
because the creator should always have ALL powers, but we could edit the
'Coordinator' powers in the future.

#### Defined in

[src/roles.js:80](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L80)

___

### CREATOR\_ROLE\_ID

• `Const` **CREATOR\_ROLE\_ID**: ``"a12a6702b93bd7ff"``

#### Defined in

[src/roles.js:7](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L7)

___

### LEFT\_ROLE\_ID

• `Const` **LEFT\_ROLE\_ID**: ``"8ced989b1904606b"``

#### Defined in

[src/roles.js:11](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L11)

___

### MEMBER\_ROLE\_ID

• `Const` **MEMBER\_ROLE\_ID**: ``"012fd2d431c0bf60"``

#### Defined in

[src/roles.js:9](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L9)

___

### NO\_ROLE

• `Const` **NO\_ROLE**: [`Role`](../interfaces/roles.Role.md)\<``"08e4251e36f6e7ed"``\>

This is the role assumed for a device when no role record can be found. This
can happen when an invited device did not manage to sync with the device that
invited them, and they then try to sync with someone else. We want them to be
able to sync the auth and config store, because that way they may be able to
receive their role record, and they can get the project config so that they
can start collecting data.

#### Defined in

[src/roles.js:109](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L109)

___

### NO\_ROLE\_ID

• `Const` **NO\_ROLE\_ID**: ``"08e4251e36f6e7ed"``

#### Defined in

[src/roles.js:12](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L12)

___

### ROLES

• `Const` **ROLES**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `012fd2d431c0bf60` | [`Role`](../interfaces/roles.Role.md)\<``"012fd2d431c0bf60"``\> |
| `08e4251e36f6e7ed` | [`Role`](../interfaces/roles.Role.md)\<``"08e4251e36f6e7ed"``\> |
| `8ced989b1904606b` | [`Role`](../interfaces/roles.Role.md)\<``"8ced989b1904606b"``\> |
| `9e6d29263cba36c9` | [`Role`](../interfaces/roles.Role.md)\<``"9e6d29263cba36c9"``\> |
| `a12a6702b93bd7ff` | [`Role`](../interfaces/roles.Role.md)\<``"a12a6702b93bd7ff"``\> |
| `f7c150f5a3a9a855` | [`Role`](../interfaces/roles.Role.md)\<``"f7c150f5a3a9a855"``\> |

#### Defined in

[src/roles.js:129](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L129)

## Functions

### isRoleIdAssignableToOthers

▸ **isRoleIdAssignableToOthers**(`value`): value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

#### Returns

value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Defined in

[src/roles.js:42](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L42)

___

### isRoleIdForNewInvite

▸ **isRoleIdForNewInvite**(`value`): value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

#### Returns

value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Defined in

[src/roles.js:36](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L36)
