[API](../README.md) / [\<internal\>](internal_.md) / "/home/szgy/src/dd/mapeo-core-next/src/roles"

# Namespace: "/home/szgy/src/dd/mapeo-core-next/src/roles"

[\<internal\>](internal_.md)."/home/szgy/src/dd/mapeo-core-next/src/roles"

## Table of contents

### References

- [DocCapability](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#doccapability)
- [ElementOf](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#elementof)
- [Role](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#role)
- [RoleId](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roleid)
- [Roles](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roles)

### Type Aliases

- [RoleIdAssignableToAnyone](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roleidassignabletoanyone)
- [RoleIdAssignableToOthers](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roleidassignabletoothers)
- [RoleIdForNewInvite](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roleidfornewinvite)

### Variables

- [BLOCKED\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#blocked_role_id)
- [COORDINATOR\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#coordinator_role_id)
- [CREATOR\_ROLE](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#creator_role)
- [CREATOR\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#creator_role_id)
- [LEFT\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#left_role_id)
- [MEMBER\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#member_role_id)
- [NO\_ROLE](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#no_role)
- [NO\_ROLE\_ID](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#no_role_id)
- [ROLES](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#roles-1)

### Functions

- [isRoleIdAssignableToOthers](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#isroleidassignabletoothers)
- [isRoleIdForNewInvite](internal_.__home_szgy_src_dd_mapeo_core_next_src_roles_.md#isroleidfornewinvite)

## References

### DocCapability

Re-exports [DocCapability](../interfaces/internal_.DocCapability.md)

___

### ElementOf

Re-exports [ElementOf](internal_.md#elementof)

___

### Role

Re-exports [Role](../interfaces/internal_.Role.md)

___

### RoleId

Re-exports [RoleId](internal_.md#roleid)

___

### Roles

Re-exports [Roles](../classes/internal_.Roles.md)

## Type Aliases

### RoleIdAssignableToAnyone

Ƭ **RoleIdAssignableToAnyone**\<\>: [`ElementOf`](internal_.md#elementof)\<typeof [`ROLE_IDS_ASSIGNABLE_TO_ANYONE`](internal_.md#role_ids_assignable_to_anyone)\>

___

### RoleIdAssignableToOthers

Ƭ **RoleIdAssignableToOthers**\<\>: [`ElementOf`](internal_.md#elementof)\<typeof [`ROLE_IDS_ASSIGNABLE_TO_OTHERS`](internal_.md#role_ids_assignable_to_others)\>

___

### RoleIdForNewInvite

Ƭ **RoleIdForNewInvite**\<\>: [`ElementOf`](internal_.md#elementof)\<typeof [`ROLE_IDS_FOR_NEW_INVITE`](internal_.md#role_ids_for_new_invite)\>

## Variables

### BLOCKED\_ROLE\_ID

• `Const` **BLOCKED\_ROLE\_ID**: ``"9e6d29263cba36c9"``

___

### COORDINATOR\_ROLE\_ID

• `Const` **COORDINATOR\_ROLE\_ID**: ``"f7c150f5a3a9a855"``

___

### CREATOR\_ROLE

• `Const` **CREATOR\_ROLE**: [`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"``\>

This is currently the same as 'Coordinator' role, but defined separately
because the creator should always have ALL powers, but we could edit the
'Coordinator' powers in the future.

___

### CREATOR\_ROLE\_ID

• `Const` **CREATOR\_ROLE\_ID**: ``"a12a6702b93bd7ff"``

___

### LEFT\_ROLE\_ID

• `Const` **LEFT\_ROLE\_ID**: ``"8ced989b1904606b"``

___

### MEMBER\_ROLE\_ID

• `Const` **MEMBER\_ROLE\_ID**: ``"012fd2d431c0bf60"``

___

### NO\_ROLE

• `Const` **NO\_ROLE**: [`Role`](../interfaces/internal_.Role.md)\<``"08e4251e36f6e7ed"``\>

This is the role assumed for a device when no role record can be found. This
can happen when an invited device did not manage to sync with the device that
invited them, and they then try to sync with someone else. We want them to be
able to sync the auth and config store, because that way they may be able to
receive their role record, and they can get the project config so that they
can start collecting data.

___

### NO\_ROLE\_ID

• `Const` **NO\_ROLE\_ID**: ``"08e4251e36f6e7ed"``

___

### ROLES

• `Const` **ROLES**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `012fd2d431c0bf60` | [`Role`](../interfaces/internal_.Role.md)\<``"012fd2d431c0bf60"``\> |
| `08e4251e36f6e7ed` | [`Role`](../interfaces/internal_.Role.md)\<``"08e4251e36f6e7ed"``\> |
| `8ced989b1904606b` | [`Role`](../interfaces/internal_.Role.md)\<``"8ced989b1904606b"``\> |
| `9e6d29263cba36c9` | [`Role`](../interfaces/internal_.Role.md)\<``"9e6d29263cba36c9"``\> |
| `a12a6702b93bd7ff` | [`Role`](../interfaces/internal_.Role.md)\<``"a12a6702b93bd7ff"``\> |
| `f7c150f5a3a9a855` | [`Role`](../interfaces/internal_.Role.md)\<``"f7c150f5a3a9a855"``\> |

## Functions

### isRoleIdAssignableToOthers

▸ **isRoleIdAssignableToOthers**(`value`): value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

#### Returns

value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

___

### isRoleIdForNewInvite

▸ **isRoleIdForNewInvite**(`value`): value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"

#### Parameters

| Name | Type |
| :------ | :------ |
| `value` | `unknown` |

#### Returns

value is "f7c150f5a3a9a855" \| "012fd2d431c0bf60" \| "9e6d29263cba36c9"
