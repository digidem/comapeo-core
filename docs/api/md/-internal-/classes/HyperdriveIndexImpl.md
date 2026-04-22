[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / HyperdriveIndexImpl

# Class: HyperdriveIndexImpl

## Extends

- `ReadyResource`

## Constructors

### new HyperdriveIndexImpl()

> **new HyperdriveIndexImpl**(`coreManager`): [`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

#### Parameters

• **coreManager**: [`CoreManager`](CoreManager.md)

#### Returns

[`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

#### Overrides

`ReadyResource.constructor`

## Accessors

### writer

> `get` **writer**(): [`Hyperdrive`](Hyperdrive.md)

#### Returns

[`Hyperdrive`](Hyperdrive.md)

***

### writerKey

> `get` **writerKey**(): `Buffer`

#### Returns

`Buffer`

## Methods

### \_close()

> **\_close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Overrides

`ReadyResource._close`

***

### \_open()

> **\_open**(): `Promise`\<`void`\>

Override these in subclasses

#### Returns

`Promise`\<`void`\>

#### Overrides

`ReadyResource._open`

***

### \[iterator\]()

> **\[iterator\]**(): `MapIterator`\<[`Hyperdrive`](Hyperdrive.md)\>

#### Returns

`MapIterator`\<[`Hyperdrive`](Hyperdrive.md)\>

***

### get()

> **get**(`driveId`): `undefined` \| [`Hyperdrive`](Hyperdrive.md)

#### Parameters

• **driveId**: `string`

#### Returns

`undefined` \| [`Hyperdrive`](Hyperdrive.md)
