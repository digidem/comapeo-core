[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / HyperdriveIndexImpl

# Class: HyperdriveIndexImpl

## Extends

- [`default`](default.md)

## Constructors

### new HyperdriveIndexImpl()

> **new HyperdriveIndexImpl**(`coreManager`): [`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

#### Parameters

• **coreManager**: [`CoreManager`](CoreManager.md)

#### Returns

[`HyperdriveIndexImpl`](HyperdriveIndexImpl.md)

#### Overrides

[`default`](default.md).[`constructor`](default.md#constructors)

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

Unload any async resources here

#### Returns

`Promise`\<`void`\>

#### Overrides

[`default`](default.md).[`_close`](default.md#_close)

***

### \_open()

> **\_open**(): `Promise`\<`void`\>

Load any async resources here

#### Returns

`Promise`\<`void`\>

#### Overrides

[`default`](default.md).[`_open`](default.md#_open)

***

### \[iterator\]()

> **\[iterator\]**(): `MapIterator`\<[`Hyperdrive`](Hyperdrive.md)\>

#### Returns

`MapIterator`\<[`Hyperdrive`](Hyperdrive.md)\>

***

### close()

> **close**(): `Promise`\<`void`\>

Resolves when this resource has closed any dependencies.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`default`](default.md).[`close`](default.md#close)

***

### get()

> **get**(`driveId`): `undefined` \| [`Hyperdrive`](Hyperdrive.md)

#### Parameters

• **driveId**: `string`

#### Returns

`undefined` \| [`Hyperdrive`](Hyperdrive.md)

***

### ready()

> **ready**(): `Promise`\<`void`\>

Resolves when this resource is initialized.

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`default`](default.md).[`ready`](default.md#ready)
