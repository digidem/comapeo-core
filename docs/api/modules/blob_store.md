[API](../README.md) / blob-store

# Module: blob-store

## Table of contents

### References

- [BlobId](blob_store.md#blobid)

### Classes

- [BlobStore](../classes/blob_store.BlobStore.md)

### Type Aliases

- [InternalDriveEmitter](blob_store.md#internaldriveemitter)

### Variables

- [SUPPORTED\_BLOB\_VARIANTS](blob_store.md#supported_blob_variants)

## References

### BlobId

Re-exports [BlobId](blob_api.md#blobid)

## Type Aliases

### InternalDriveEmitter

Ƭ **InternalDriveEmitter**\<\>: `TypedEmitter`\<\{ `add-drive`: (`drive`: `__module`) => `void`  }\>

#### Defined in

[src/blob-store/index.js:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L8)

## Variables

### SUPPORTED\_BLOB\_VARIANTS

• `Const` **SUPPORTED\_BLOB\_VARIANTS**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `audio` | readonly [``"original"``] |
| `photo` | readonly [``"original"``, ``"preview"``, ``"thumbnail"``] |
| `video` | readonly [``"original"``] |

#### Defined in

[src/blob-store/index.js:13](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/blob-store/index.js#L13)
