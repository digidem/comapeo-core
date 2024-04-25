[API](../README.md) / types

# Module: types

## Table of contents

### References

- [BlobId](types.md#blobid)
- [BlobType](types.md#blobtype)
- [CoreOwnershipWithSignatures](types.md#coreownershipwithsignatures)
- [MapeoDocMap](types.md#mapeodocmap)
- [MapeoValueMap](types.md#mapeovaluemap)

### Type Aliases

- [BlobFilter](types.md#blobfilter)
- [BlobVariant](types.md#blobvariant)
- [CoreOwnershipWithSignaturesValue](types.md#coreownershipwithsignaturesvalue)
- [CoreStorage](types.md#corestorage)
- [DefaultEmitterEvents](types.md#defaultemitterevents)
- [IdentityKeyPair](types.md#identitykeypair)
- [KeyPair](types.md#keypair)
- [MapBuffers](types.md#mapbuffers)
- [NullableToOptional](types.md#nullabletooptional)
- [PublicKey](types.md#publickey)
- [ReplicationStream](types.md#replicationstream)
- [SecretKey](types.md#secretkey)

## References

### BlobId

Re-exports [BlobId](blob_api.md#blobid)

___

### BlobType

Re-exports [BlobType](blob_api.md#blobtype)

___

### CoreOwnershipWithSignatures

Re-exports [CoreOwnershipWithSignatures](core_ownership.md#coreownershipwithsignatures)

___

### MapeoDocMap

Re-exports [MapeoDocMap](datatype.md#mapeodocmap)

___

### MapeoValueMap

Re-exports [MapeoValueMap](datatype.md#mapeovaluemap)

## Type Aliases

### BlobFilter

Ƭ **BlobFilter**: `RequireAtLeastOne`\<\{ [KeyType in BlobType]: ArrayAtLeastOne\<BlobVariant\<KeyType\>\> }\>

#### Defined in

[src/types.ts:42](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L42)

___

### BlobVariant

Ƭ **BlobVariant**\<`TBlobType`\>: `TupleToUnion`\<`SupportedBlobVariants`[`TBlobType`]\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TBlobType` | extends [`BlobType`](blob_api.md#blobtype) |

#### Defined in

[src/types.ts:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L18)

___

### CoreOwnershipWithSignaturesValue

Ƭ **CoreOwnershipWithSignaturesValue**: `Omit`\<[`CoreOwnershipWithSignatures`](core_ownership.md#coreownershipwithsignatures), `Exclude`\<keyof `MapeoCommon`, ``"schemaName"``\>\>

#### Defined in

[src/types.ts:59](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L59)

___

### CoreStorage

Ƭ **CoreStorage**: (`name`: `string`) => `RandomAccessStorage`

#### Type declaration

▸ (`name`): `RandomAccessStorage`

##### Parameters

| Name | Type |
| :------ | :------ |
| `name` | `string` |

##### Returns

`RandomAccessStorage`

#### Defined in

[src/types.ts:114](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L114)

___

### DefaultEmitterEvents

Ƭ **DefaultEmitterEvents**\<`L`\>: `Object`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `L` | extends `ListenerSignature`\<`L`\> = `DefaultListener` |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `newListener` | (`event`: keyof `L`, `listener`: `L`[keyof `L`]) => `void` |
| `removeListener` | (`event`: keyof `L`, `listener`: `L`[keyof `L`]) => `void` |

#### Defined in

[src/types.ts:116](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L116)

___

### IdentityKeyPair

Ƭ **IdentityKeyPair**: [`KeyPair`](types.md#keypair)

#### Defined in

[src/types.ts:106](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L106)

___

### KeyPair

Ƭ **KeyPair**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `publicKey` | [`PublicKey`](types.md#publickey) |
| `secretKey` | [`SecretKey`](types.md#secretkey) |

#### Defined in

[src/types.ts:97](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L97)

___

### MapBuffers

Ƭ **MapBuffers**\<`T`\>: \{ [K in keyof T]: T[K] extends Buffer ? string : T[K] }

Replace an object's `Buffer` values with `string`s. Useful for serialization.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/types.ts:86](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L86)

___

### NullableToOptional

Ƭ **NullableToOptional**\<`T`\>: `Simplify`\<`RemoveNull`\<`NullToOptional`\<`T`\>\>\>

Make any properties whose value include `null` optional, and remove `null`
from the type. This converts the types returned from SQLite (which have all
top-level optional props set to `null`) to the original types in
@mapeo/schema

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[src/types.ts:96](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L96)

___

### PublicKey

Ƭ **PublicKey**: `Buffer`

32 byte buffer

#### Defined in

[src/types.ts:103](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L103)

___

### ReplicationStream

Ƭ **ReplicationStream**: `Duplex` & \{ `noiseStream`: `ProtocolStream`  }

#### Defined in

[src/types.ts:112](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L112)

___

### SecretKey

Ƭ **SecretKey**: `Buffer`

32 byte buffer

#### Defined in

[src/types.ts:105](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L105)
