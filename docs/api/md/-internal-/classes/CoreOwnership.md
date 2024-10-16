[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / CoreOwnership

# Class: CoreOwnership

## Extends

- `TypedEmitter`

## Constructors

### new CoreOwnership()

> **new CoreOwnership**(`opts`): [`CoreOwnership`](CoreOwnership.md)

#### Parameters

• **opts**

• **opts.coreKeypairs**: `Record`\<`"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`, [`KeyPair`](../type-aliases/KeyPair-1.md)\>

• **opts.dataType**: [`DataType`](DataType.md)\<[`DataStore`](DataStore.md)\<`"auth"`, `"coreOwnership"` \| `"role"`\>, `SQLiteTableWithColumns`\<`object`\>, `"coreOwnership"`, `object`, `object`\>

• **opts.identityKeypair**: [`KeyPair`](../type-aliases/KeyPair-1.md)

#### Returns

[`CoreOwnership`](CoreOwnership.md)

#### Overrides

`TypedEmitter.constructor`

## Methods

### get()

> **get**(`deviceId`): `Promise`\<`object` & `object`\>

Get capabilities for a given deviceId

#### Parameters

• **deviceId**: `string`

#### Returns

`Promise`\<`object` & `object`\>

***

### getAll()

> **getAll**(): `Promise`\<`object` & `object`[]\>

#### Returns

`Promise`\<`object` & `object`[]\>

***

### getCoreId()

> **getCoreId**(`deviceId`, `namespace`): `Promise`\<`string`\>

#### Parameters

• **deviceId**: `string`

• **namespace**: `"blob"` \| `"auth"` \| `"config"` \| `"data"` \| `"blobIndex"`

#### Returns

`Promise`\<`string`\>

coreId of core belonging to `deviceId` for `namespace`

***

### getOwner()

> **getOwner**(`coreId`): `Promise`\<`string`\>

#### Parameters

• **coreId**: `string`

#### Returns

`Promise`\<`string`\>

deviceId of device that owns the core
