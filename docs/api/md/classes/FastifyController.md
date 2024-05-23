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

## Methods

### start

▸ **start**(`opts?`): `Promise`\<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts?` | [`StartOpts`](../interfaces/internal_.StartOpts.md) |

#### Returns

`Promise`\<`void`\>

___

### started

▸ **started**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

___

### stop

▸ **stop**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
