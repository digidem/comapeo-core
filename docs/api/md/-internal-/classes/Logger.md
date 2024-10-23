[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Logger

# Class: Logger

## Constructors

### new Logger()

> **new Logger**(`opts`): [`Logger`](Logger.md)

#### Parameters

• **opts**

• **opts.baseLogger**: `undefined` \| `Debugger`

• **opts.deviceId**: `string`

• **opts.ns**: `undefined` \| `string`

• **opts.prefix**: `undefined` \| `string`

optional prefix to add to the start of each log message. Used to add context e.g. the core ID that is syncing. Use this as an alternative to the debug namespace.

#### Returns

[`Logger`](Logger.md)

## Properties

### deviceId

> **deviceId**: `string`

## Accessors

### log

> `get` **log**(): `Debugger`

#### Returns

`Debugger`

## Methods

### extend()

> **extend**(`ns`, `opts`?): [`Logger`](Logger.md)

#### Parameters

• **ns**: `string`

• **opts?** = `{}`

• **opts.prefix?**: `string`

#### Returns

[`Logger`](Logger.md)

***

### create()

> `static` **create**(`ns`, `logger`?, `opts`?): [`Logger`](Logger.md)

#### Parameters

• **ns**: `string`

• **logger?**: [`Logger`](Logger.md)

• **opts?**

• **opts.prefix?**: `string`

#### Returns

[`Logger`](Logger.md)
