[API](../README.md) / fastify-plugins/utils

# Module: fastify-plugins/utils

## Table of contents

### Variables

- [NotFoundError](fastify_plugins_utils.md#notfounderror)

### Functions

- [createStyleJsonResponseHeaders](fastify_plugins_utils.md#createstylejsonresponseheaders)
- [getFastifyServerAddress](fastify_plugins_utils.md#getfastifyserveraddress)

## Variables

### NotFoundError

• `Const` **NotFoundError**: `FastifyErrorConstructor`\<{}, [any?, any?, any?]\>

#### Defined in

[src/fastify-plugins/utils.js:4](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/utils.js#L4)

## Functions

### createStyleJsonResponseHeaders

▸ **createStyleJsonResponseHeaders**(`lastModified`): `Object`

#### Parameters

| Name | Type |
| :------ | :------ |
| `lastModified` | `Readonly`\<`Date`\> |

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `Access-Control-Allow-Headers` | `string` |
| `Access-Control-Allow-Origin` | `string` |
| `Cache-Control` | `string` |
| `Last-Modified` | `string` |

#### Defined in

[src/fastify-plugins/utils.js:44](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/utils.js#L44)

___

### getFastifyServerAddress

▸ **getFastifyServerAddress**(`server`, `options?`): `Promise`\<`string`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `server` | `Server`\<typeof `IncomingMessage`, typeof `ServerResponse`\> |
| `options?` | `Object` |
| `options.timeout?` | `number` |

#### Returns

`Promise`\<`string`\>

#### Defined in

[src/fastify-plugins/utils.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-plugins/utils.js#L15)
