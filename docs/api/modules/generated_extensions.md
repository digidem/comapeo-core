[API](../README.md) / generated/extensions

# Module: generated/extensions

## Table of contents

### Interfaces

- [HaveExtension](../interfaces/generated_extensions.HaveExtension.md)
- [ProjectExtension](../interfaces/generated_extensions.ProjectExtension.md)

### Type Aliases

- [HaveExtension\_Namespace](generated_extensions.md#haveextension_namespace)

### Variables

- [HaveExtension](generated_extensions.md#haveextension)
- [HaveExtension\_Namespace](generated_extensions.md#haveextension_namespace-1)
- [ProjectExtension](generated_extensions.md#projectextension)

### Functions

- [haveExtension\_NamespaceFromJSON](generated_extensions.md#haveextension_namespacefromjson)
- [haveExtension\_NamespaceToNumber](generated_extensions.md#haveextension_namespacetonumber)

## Type Aliases

### HaveExtension\_Namespace

Ƭ **HaveExtension\_Namespace**: typeof [`HaveExtension_Namespace`](generated_extensions.md#haveextension_namespace-1)[keyof typeof [`HaveExtension_Namespace`](generated_extensions.md#haveextension_namespace-1)]

#### Defined in

[src/generated/extensions.ts:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L21)

[src/generated/extensions.ts:30](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L30)

## Variables

### HaveExtension

• **HaveExtension**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`HaveExtension`](../interfaces/generated_extensions.HaveExtension.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`HaveExtension`](../interfaces/generated_extensions.HaveExtension.md) |
| `encode` | (`message`: [`HaveExtension`](../interfaces/generated_extensions.HaveExtension.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`HaveExtension`](../interfaces/generated_extensions.HaveExtension.md) |

#### Defined in

[src/generated/extensions.ts:14](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L14)

[src/generated/extensions.ts:190](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L190)

___

### HaveExtension\_Namespace

• `Const` **HaveExtension\_Namespace**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `UNRECOGNIZED` | ``"UNRECOGNIZED"`` |
| `auth` | ``"auth"`` |
| `blob` | ``"blob"`` |
| `blobIndex` | ``"blobIndex"`` |
| `config` | ``"config"`` |
| `data` | ``"data"`` |

#### Defined in

[src/generated/extensions.ts:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L21)

[src/generated/extensions.ts:30](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L30)

___

### ProjectExtension

• **ProjectExtension**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`ProjectExtension`](../interfaces/generated_extensions.ProjectExtension.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`ProjectExtension`](../interfaces/generated_extensions.ProjectExtension.md) |
| `encode` | (`message`: [`ProjectExtension`](../interfaces/generated_extensions.ProjectExtension.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`ProjectExtension`](../interfaces/generated_extensions.ProjectExtension.md) |

#### Defined in

[src/generated/extensions.ts:5](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L5)

[src/generated/extensions.ts:85](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L85)

## Functions

### haveExtension\_NamespaceFromJSON

▸ **haveExtension_NamespaceFromJSON**(`object`): [`HaveExtension_Namespace`](generated_extensions.md#haveextension_namespace)

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

[`HaveExtension_Namespace`](generated_extensions.md#haveextension_namespace)

#### Defined in

[src/generated/extensions.ts:32](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L32)

___

### haveExtension\_NamespaceToNumber

▸ **haveExtension_NamespaceToNumber**(`object`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | [`HaveExtension_Namespace`](generated_extensions.md#haveextension_namespace) |

#### Returns

`number`

#### Defined in

[src/generated/extensions.ts:56](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/extensions.ts#L56)
