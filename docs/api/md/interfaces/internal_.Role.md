[API](../README.md) / [\<internal\>](../modules/internal_.md) / Role

# Interface: Role\<T\>

[\<internal\>](../modules/internal_.md).Role

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`RoleId`](../modules/internal_.md#roleid) = [`RoleId`](../modules/internal_.md#roleid) |

## Table of contents

### Properties

- [docs](internal_.Role.md#docs)
- [name](internal_.Role.md#name)
- [roleAssignment](internal_.Role.md#roleassignment)
- [roleId](internal_.Role.md#roleid)
- [sync](internal_.Role.md#sync)

## Properties

### docs

• **docs**: `Record`\<``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"``, [`DocCapability`](internal_.DocCapability.md)\>

___

### name

• **name**: `string`

___

### roleAssignment

• **roleAssignment**: (``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"``)[]

___

### roleId

• **roleId**: `T`

___

### sync

• **sync**: `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, ``"allowed"`` \| ``"blocked"``\>
