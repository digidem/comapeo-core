[API](../README.md) / [roles](../modules/roles.md) / Role

# Interface: Role\<T\>

[roles](../modules/roles.md).Role

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`RoleId`](../modules/roles.md#roleid) = [`RoleId`](../modules/roles.md#roleid) |

## Table of contents

### Properties

- [docs](roles.Role.md#docs)
- [name](roles.Role.md#name)
- [roleAssignment](roles.Role.md#roleassignment)
- [roleId](roles.Role.md#roleid)
- [sync](roles.Role.md#sync)

## Properties

### docs

• **docs**: `Record`\<``"translation"`` \| ``"track"`` \| ``"role"`` \| ``"projectSettings"`` \| ``"preset"`` \| ``"observation"`` \| ``"icon"`` \| ``"field"`` \| ``"deviceInfo"`` \| ``"coreOwnership"``, [`DocCapability`](roles.DocCapability.md)\>

#### Defined in

[src/roles.js:68](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L68)

___

### name

• **name**: `string`

#### Defined in

[src/roles.js:67](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L67)

___

### roleAssignment

• **roleAssignment**: (``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"``)[]

#### Defined in

[src/roles.js:69](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L69)

___

### roleId

• **roleId**: `T`

#### Defined in

[src/roles.js:66](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L66)

___

### sync

• **sync**: `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, ``"allowed"`` \| ``"blocked"``\>

#### Defined in

[src/roles.js:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/roles.js#L70)
