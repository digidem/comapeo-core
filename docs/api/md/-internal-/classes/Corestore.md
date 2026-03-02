[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Corestore

# Class: Corestore

## Extends

- `TypedEmitter`\<[`CorestoreEvents`](../interfaces/CorestoreEvents.md)\>

## Constructors

### new Corestore()

> **new Corestore**(`storage`, `options`?): [`Corestore`](Corestore.md)

#### Parameters

• **storage**: `HypercoreStorage`

• **options?**

• **options.poolSize?**: `number`

• **options.primaryKey?**: `Buffer` \| `Uint8Array`

#### Returns

[`Corestore`](Corestore.md)

#### Overrides

`TypedEmitter<CorestoreEvents>.constructor`

## Properties

### cores

> **cores**: `Map`\<`string`, `Hypercore`\<`ValueEncoding`, `Buffer`\>\>

## Methods

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### get()

#### get(key)

> **get**(`key`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

##### Parameters

• **key**: `Buffer` \| `Uint8Array`

##### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### get(options)

> **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

##### Parameters

• **options**: `Omit`\<`HypercoreOptions`\<`"binary"`, `undefined`\>, `"keyPair"`\> & `object`

##### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### get(options)

> **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

##### Parameters

• **options**: `never`

##### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

#### get(options)

> **get**(`options`): `Hypercore`\<`ValueEncoding`, `Buffer`\>

##### Parameters

• **options**: `Omit`\<`HypercoreOptions`\<`"binary"`, `undefined`\>, `"key"` \| `"keyPair"`\> & `object`

##### Returns

`Hypercore`\<`ValueEncoding`, `Buffer`\>

***

### namespace()

> **namespace**(`name`): [`Corestore`](Corestore.md)

#### Parameters

• **name**: `string`

#### Returns

[`Corestore`](Corestore.md)

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### replicate()

> **replicate**(`stream`, `opts`?): `ReplicationStream`

#### Parameters

• **stream**: `any`

• **opts?**: `any`

#### Returns

`ReplicationStream`
