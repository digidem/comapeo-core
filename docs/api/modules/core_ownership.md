[API](../README.md) / core-ownership

# Module: core-ownership

## Table of contents

### Classes

- [CoreOwnership](../classes/core_ownership.CoreOwnership.md)

### Type Aliases

- [CoreOwnershipWithSignatures](core_ownership.md#coreownershipwithsignatures)

### Functions

- [getWinner](core_ownership.md#getwinner)
- [mapAndValidateCoreOwnership](core_ownership.md#mapandvalidatecoreownership)

## Type Aliases

### CoreOwnershipWithSignatures

Ƭ **CoreOwnershipWithSignatures**: `Extract`\<`ReturnType`\<typeof `decode`\>, \{ `schemaName`: ``"coreOwnership"``  }\>

#### Defined in

[src/types.ts:55](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/types.ts#L55)

## Functions

### getWinner

▸ **getWinner**\<`T`, `U`\>(`docA`, `docB`): `T` \| `U`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `IndexableDocument` |
| `U` | extends `IndexableDocument` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `docA` | `T` |
| `docB` | `U` |

#### Returns

`T` \| `U`

T | U

#### Defined in

[src/core-ownership.js:184](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-ownership.js#L184)

___

### mapAndValidateCoreOwnership

▸ **mapAndValidateCoreOwnership**(`doc`, `version`): `Object`

- Validate that the doc is written to the core identified by doc.authCoreId
- Verify the signatures
- Remove the signatures (we don't add them to the indexer)
- Set doc.links to an empty array - this forces the indexer to treat every
  document as a fork, so getWinner is called for every doc, which resolves to
  the doc with the lowest index (e.g. the first)

#### Parameters

| Name | Type |
| :------ | :------ |
| `doc` | {} & `CoreOwnershipSignatures` |
| `version` | `VersionIdObject` |

#### Returns

`Object`

#### Defined in

[src/core-ownership.js:126](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/core-ownership.js#L126)
