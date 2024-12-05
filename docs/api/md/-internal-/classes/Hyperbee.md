[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / Hyperbee

# Class: Hyperbee\<T\>

## Type Parameters

• **T** = `any`

## Constructors

### new Hyperbee()

> **new Hyperbee**\<`T`\>(`core`, `options`?): [`Hyperbee`](Hyperbee.md)\<`T`\>

#### Parameters

• **core**: `Hypercore`\<`"binary"`, `undefined`\>

• **options?**: [`HyperbeeOptions`](../namespaces/Hyperbee/interfaces/HyperbeeOptions.md)\<`T`\>

#### Returns

[`Hyperbee`](Hyperbee.md)\<`T`\>

## Properties

### core

> `readonly` **core**: `Hypercore`\<`"binary"`, `undefined`\>

***

### version

> `readonly` **version**: `number`

## Methods

### batch()

> **batch**(): [`HyperbeeBatch`](HyperbeeBatch.md)\<`T`\>

#### Returns

[`HyperbeeBatch`](HyperbeeBatch.md)\<`T`\>

***

### checkout()

> **checkout**(`version`): [`Hyperbee`](Hyperbee.md)\<`any`\>

#### Parameters

• **version**: `number`

#### Returns

[`Hyperbee`](Hyperbee.md)\<`any`\>

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createDiffStream()

> **createDiffStream**(`otherVersion`, `options`?): `Readable`\<[`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, [`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, [`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, `true`, `false`, `ReadableEvents`\<[`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>\>\>

#### Parameters

• **otherVersion**: `number`

• **options?**: [`DiffStreamOptions`](../namespaces/Hyperbee/interfaces/DiffStreamOptions.md)

#### Returns

`Readable`\<[`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, [`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, [`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>, `true`, `false`, `ReadableEvents`\<[`DiffStreamEntry`](../namespaces/Hyperbee/interfaces/DiffStreamEntry.md)\<`T`\>\>\>

***

### createHistoryStream()

> **createHistoryStream**(`options`?): `Readable`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, `true`, `false`, `ReadableEvents`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`\>\>

#### Parameters

• **options?**: [`HistoryStreamOptions`](../namespaces/Hyperbee/interfaces/HistoryStreamOptions.md)

#### Returns

`Readable`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`, `true`, `false`, `ReadableEvents`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\> & `object`\>\>

***

### createReadStream()

> **createReadStream**(`range`?, `options`?): `Readable`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, `true`, `false`, `ReadableEvents`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>\>

#### Parameters

• **range?**: [`ReadStreamRange`](../namespaces/Hyperbee/interfaces/ReadStreamRange.md)

• **options?**: [`ReadStreamOptions`](../namespaces/Hyperbee/interfaces/ReadStreamOptions.md)

#### Returns

`Readable`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>, `true`, `false`, `ReadableEvents`\<[`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>\>

***

### del()

> **del**(`key`, `options`?): `Promise`\<`void`\>

#### Parameters

• **key**: `string`

• **options?**: [`DelOptions`](../namespaces/Hyperbee/interfaces/DelOptions.md)\<`T`\>

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**(`key`): `Promise`\<`null` \| [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>

#### Parameters

• **key**: `string`

#### Returns

`Promise`\<`null` \| [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>

***

### getAndWatch()

> **getAndWatch**(`key`, `options`?): `Promise`\<[`EntryWatcher`](EntryWatcher.md)\<`T`\>\>

#### Parameters

• **key**: `string`

• **options?**: [`GetAndWatchOptions`](../namespaces/Hyperbee/interfaces/GetAndWatchOptions.md)

#### Returns

`Promise`\<[`EntryWatcher`](EntryWatcher.md)\<`T`\>\>

***

### getHeader()

> **getHeader**(`options`?): `Promise`\<`any`\>

#### Parameters

• **options?**: `any`

#### Returns

`Promise`\<`any`\>

***

### peek()

> **peek**(`range`?, `options`?): `Promise`\<`null` \| [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>

#### Parameters

• **range?**: [`ReadStreamRange`](../namespaces/Hyperbee/interfaces/ReadStreamRange.md)

• **options?**: [`ReadStreamOptions`](../namespaces/Hyperbee/interfaces/ReadStreamOptions.md)

#### Returns

`Promise`\<`null` \| [`HyperbeeEntry`](../namespaces/Hyperbee/interfaces/HyperbeeEntry.md)\<`T`\>\>

***

### put()

> **put**(`key`, `value`?, `options`?): `Promise`\<`void`\>

#### Parameters

• **key**: `string`

• **value?**: `any`

• **options?**: [`PutOptions`](../namespaces/Hyperbee/interfaces/PutOptions.md)\<`T`\>

#### Returns

`Promise`\<`void`\>

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### replicate()

> **replicate**(`isInitiatorOrStream`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **isInitiatorOrStream**: `any`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### snapshot()

> **snapshot**(): [`Hyperbee`](Hyperbee.md)\<`any`\>

#### Returns

[`Hyperbee`](Hyperbee.md)\<`any`\>

***

### sub()

> **sub**(`prefix`, `options`?): [`Hyperbee`](Hyperbee.md)\<`any`\>

#### Parameters

• **prefix**: `string`

• **options?**: [`SubDatabaseOptions`](../namespaces/Hyperbee/interfaces/SubDatabaseOptions.md)

#### Returns

[`Hyperbee`](Hyperbee.md)\<`any`\>

***

### watch()

> **watch**(`range`?): `AsyncIterable`\<[`any`, `any`], `any`, `any`\> & `object`

#### Parameters

• **range?**: [`ReadStreamRange`](../namespaces/Hyperbee/interfaces/ReadStreamRange.md)

#### Returns

`AsyncIterable`\<[`any`, `any`], `any`, `any`\> & `object`

***

### isHyperbee()

> `static` **isHyperbee**(`core`, `options`?): `Promise`\<`boolean`\>

#### Parameters

• **core**: `Hypercore`\<`"binary"`, `undefined`\>

• **options?**: `any`

#### Returns

`Promise`\<`boolean`\>
