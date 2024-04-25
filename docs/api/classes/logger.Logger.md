[API](../README.md) / [logger](../modules/logger.md) / Logger

# Class: Logger

[logger](../modules/logger.md).Logger

## Table of contents

### Constructors

- [constructor](logger.Logger.md#constructor)

### Properties

- [deviceId](logger.Logger.md#deviceid)

### Accessors

- [enabled](logger.Logger.md#enabled)

### Methods

- [extend](logger.Logger.md#extend)
- [log](logger.Logger.md#log)
- [create](logger.Logger.md#create)

## Constructors

### constructor

• **new Logger**(`opts`): [`Logger`](logger.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | `Object` |
| `opts.baseLogger` | `undefined` \| `Debugger` |
| `opts.deviceId` | `string` |
| `opts.ns` | `undefined` \| `string` |

#### Returns

[`Logger`](logger.Logger.md)

#### Defined in

[src/logger.js:72](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L72)

## Properties

### deviceId

• **deviceId**: `string`

#### Defined in

[src/logger.js:73](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L73)

## Accessors

### enabled

• `get` **enabled**(): `boolean`

#### Returns

`boolean`

#### Defined in

[src/logger.js:77](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L77)

## Methods

### extend

▸ **extend**(`ns`): [`Logger`](logger.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ns` | `string` |

#### Returns

[`Logger`](logger.Logger.md)

#### Defined in

[src/logger.js:91](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L91)

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

[src/logger.js:84](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L84)

___

### create

▸ **create**(`ns`, `logger?`): [`Logger`](logger.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ns` | `string` |
| `logger?` | [`Logger`](logger.Logger.md) |

#### Returns

[`Logger`](logger.Logger.md)

#### Defined in

[src/logger.js:59](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/logger.js#L59)
