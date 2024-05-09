[API](../README.md) / FastifyController

# Class: FastifyController

## Table of contents

### Constructors

- [constructor](FastifyController.md#constructor)

### Methods

- [start](FastifyController.md#start)
- [started](FastifyController.md#started)
- [stop](FastifyController.md#stop)

## Constructors

### constructor

• **new FastifyController**(`opts`): [`FastifyController`](FastifyController.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.fastify` | `FastifyInstance`\<`RawServerDefault`, `IncomingMessage`, `ServerResponse`\<`IncomingMessage`\>, `FastifyBaseLogger`, `FastifyTypeProviderDefault`\> |

#### Returns

[`FastifyController`](FastifyController.md)

#### Defined in

[src/fastify-controller.js:21](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-controller.js#L21)

## Methods

### start

▸ **start**(`opts?`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | [`StartOpts`](../interfaces/internal_.StartOpts.md) |

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:73](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-controller.js#L73)

___

### started

▸ **started**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:77](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-controller.js#L77)

___

### stop

▸ **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Defined in

[src/fastify-controller.js:81](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/fastify-controller.js#L81)
