[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Role

# Interface: Role\<T\>

## Type Parameters

• **T** *extends* [`RoleId`](../type-aliases/RoleId.md) = [`RoleId`](../type-aliases/RoleId.md)

## Properties

### docs

> **docs**: `Record`\<`"observation"` \| `"track"` \| `"remoteDetectionAlert"` \| `"translation"` \| `"preset"` \| `"field"` \| `"projectSettings"` \| `"deviceInfo"` \| `"icon"` \| `"coreOwnership"` \| `"role"`, [`DocCapability`](DocCapability.md)\>

***

### name

> **name**: `string`

***

### roleAssignment

> **roleAssignment**: (`"f7c150f5a3a9a855"` \| `"012fd2d431c0bf60"` \| `"9e6d29263cba36c9"`)[]

***

### roleId

> **roleId**: `T`

***

### sync

> **sync**: `Record`\<`"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`, `"allowed"` \| `"blocked"`\>
