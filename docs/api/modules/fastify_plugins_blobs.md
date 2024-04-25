[API](../README.md) / fastify-plugins/blobs

# Module: fastify-plugins/blobs

## Table of contents

### References

- [BlobId](fastify_plugins_blobs.md#blobid)

### Interfaces

- [BlobServerPluginOpts](../interfaces/fastify_plugins_blobs.BlobServerPluginOpts.md)

### Functions

- [default](fastify_plugins_blobs.md#default)

## References

### BlobId

Re-exports [BlobId](blob_api.md#blobid)

## Functions

### default

▸ **default**(`instance`, `opts`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `instance` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |
| `opts` | `RegisterOptions` & [`BlobServerPluginOpts`](../interfaces/fastify_plugins_blobs.BlobServerPluginOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-plugins/blobs.js:8](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/blobs.js#L8)
