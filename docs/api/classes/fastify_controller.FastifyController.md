[API](../README.md) / [fastify-controller](../modules/fastify_controller.md) / FastifyController

# Class: FastifyController

[fastify-controller](../modules/fastify_controller.md).FastifyController

## Table of contents

### Constructors

- [constructor](fastify_controller.FastifyController.md#constructor)

### Methods

- [start](fastify_controller.FastifyController.md#start)
- [started](fastify_controller.FastifyController.md#started)
- [stop](fastify_controller.FastifyController.md#stop)

## Constructors

### constructor

• **new FastifyController**(`opts`): [`FastifyController`](fastify_controller.FastifyController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.fastify` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |

#### Returns

[`FastifyController`](fastify_controller.FastifyController.md)

#### Defined in

[src/fastify-controller.js:21](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-controller.js#L21)

## Methods

### start

▸ **start**(`opts?`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | [`StartOpts`](../interfaces/fastify_controller.StartOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:73](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-controller.js#L73)

___

### started

▸ **started**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:77](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-controller.js#L77)

___

### stop

▸ **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:81](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/fastify-controller.js#L81)
