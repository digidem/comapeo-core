[API](../README.md) / [fastify-plugins/blobs](../modules/fastify_plugins_blobs.md) / BlobServerPluginOpts

# Interface: BlobServerPluginOpts\<\>

[fastify-plugins/blobs](../modules/fastify_plugins_blobs.md).BlobServerPluginOpts

## Table of contents

### Properties

- [getBlobStore](fastify_plugins_blobs.BlobServerPluginOpts.md#getblobstore)

## Properties

### getBlobStore

• **getBlobStore**: (`projectPublicId`: `string`) => `Promise`\<[`BlobStore`](../classes/blob_store.BlobStore.md)\>

#### Type declaration

▸ (`projectPublicId`): `Promise`\<[`BlobStore`](../classes/blob_store.BlobStore.md)\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `projectPublicId` | `string` |

##### Returns

`Promise`\<[`BlobStore`](../classes/blob_store.BlobStore.md)\>

#### Defined in

[src/fastify-plugins/blobs.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/blobs.js#L18)
