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

#### Defined in

[src/roles.js:68](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L68)

___

### name

• **name**: `string`

#### Defined in

[src/roles.js:67](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L67)

___

### roleAssignment

• **roleAssignment**: (``"f7c150f5a3a9a855"`` \| ``"012fd2d431c0bf60"`` \| ``"9e6d29263cba36c9"``)[]

#### Defined in

[src/roles.js:69](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L69)

___

### roleId

• **roleId**: `T`

#### Defined in

[src/roles.js:66](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L66)

___

### sync

• **sync**: `Record`\<``"blob"`` \| ``"auth"`` \| ``"config"`` \| ``"data"`` \| ``"blobIndex"``, ``"allowed"`` \| ``"blocked"``\>

#### Defined in

[src/roles.js:70](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/roles.js#L70)
