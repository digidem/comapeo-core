[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Role

# Interface: Role\<T\>

## Type Parameters

• **T** *extends* [`RoleId`](../../namespaces/MemberApi/type-aliases/RoleId.md) = [`RoleId`](../../namespaces/MemberApi/type-aliases/RoleId.md)

## Properties

### docs

> **docs**: `Record`\<`"translation"` \| `"track"` \| `"role"` \| `"remoteDetectionAlert"` \| `"projectSettings"` \| `"preset"` \| `"observation"` \| `"icon"` \| `"field"` \| `"deviceInfo"` \| `"coreOwnership"`, [`DocCapability`](DocCapability.md)\>

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

> **sync**: `Record`\<`"auth"` \| `"config"` \| `"data"` \| `"blobIndex"` \| `"blob"`, `"allowed"` \| `"blocked"`\>
