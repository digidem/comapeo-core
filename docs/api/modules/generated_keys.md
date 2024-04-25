[API](../README.md) / generated/keys

# Module: generated/keys

## Table of contents

### Interfaces

- [EncryptionKeys](../interfaces/generated_keys.EncryptionKeys.md)
- [ProjectKeys](../interfaces/generated_keys.ProjectKeys.md)

### Variables

- [EncryptionKeys](generated_keys.md#encryptionkeys)
- [ProjectKeys](generated_keys.md#projectkeys)

## Variables

### EncryptionKeys

• **EncryptionKeys**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md) |
| `encode` | (`message`: [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`EncryptionKeys`](../interfaces/generated_keys.EncryptionKeys.md) |

#### Defined in

[src/generated/keys.ts:4](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/keys.ts#L4)

[src/generated/keys.ts:22](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/keys.ts#L22)

___

### ProjectKeys

• **ProjectKeys**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`ProjectKeys`](../interfaces/generated_keys.ProjectKeys.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`ProjectKeys`](../interfaces/generated_keys.ProjectKeys.md) |
| `encode` | (`message`: [`ProjectKeys`](../interfaces/generated_keys.ProjectKeys.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`ProjectKeys`](../interfaces/generated_keys.ProjectKeys.md) |

#### Defined in

[src/generated/keys.ts:12](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/keys.ts#L12)

[src/generated/keys.ts:111](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/keys.ts#L111)
