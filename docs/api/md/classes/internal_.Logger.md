[API](../README.md) / [\<internal\>](../modules/internal_.md) / Logger

# Class: Logger

[\<internal\>](../modules/internal_.md).Logger

## Table of contents

### Constructors

- [constructor](internal_.Logger.md#constructor)

### Properties

- [deviceId](internal_.Logger.md#deviceid)

### Accessors

- [enabled](internal_.Logger.md#enabled)

### Methods

- [extend](internal_.Logger.md#extend)
- [log](internal_.Logger.md#log)
- [create](internal_.Logger.md#create)

## Constructors

### constructor

• **new Logger**(`opts`): [`Logger`](internal_.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.baseLogger` | `undefined` \| `Debugger` |
| `opts.deviceId` | `string` |
| `opts.ns` | `undefined` \| `string` |

#### Returns

[`Logger`](internal_.Logger.md)

#### Defined in

[src/logger.js:72](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L72)

## Properties

### deviceId

• **deviceId**: `string`

#### Defined in

[src/logger.js:73](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L73)

## Accessors

### enabled

• `get` **enabled**(): `boolean`

#### Returns

`boolean`

#### Defined in

[src/logger.js:77](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L77)

## Methods

### extend

▸ **extend**(`ns`): [`Logger`](internal_.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ns` | `string` |

#### Returns

[`Logger`](internal_.Logger.md)

#### Defined in

[src/logger.js:91](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L91)

___

### log

▸ **log**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | [formatter: any, ...args: any[]] |

#### Returns

`void`

#### Defined in

[src/logger.js:84](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L84)

___

### create

▸ **create**(`ns`, `logger?`): [`Logger`](internal_.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ns` | `string` |
| `logger?` | [`Logger`](internal_.Logger.md) |

#### Returns

[`Logger`](internal_.Logger.md)

#### Defined in

[src/logger.js:59](https://github.com/digidem/mapeo-core-next/blob/315dc9781d8d2f74f17b1fd651a3ae81272b7fac/src/logger.js#L59)
