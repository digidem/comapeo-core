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

## Properties

### deviceId

• **deviceId**: `string`

## Accessors

### enabled

• `get` **enabled**(): `boolean`

#### Returns

`boolean`

## Methods

### extend

▸ **extend**(`ns`): [`Logger`](internal_.Logger.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `ns` | `string` |

#### Returns

[`Logger`](internal_.Logger.md)

___

### log

▸ **log**(`...args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `...args` | [formatter: any, ...args: any[]] |

#### Returns

`void`

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
