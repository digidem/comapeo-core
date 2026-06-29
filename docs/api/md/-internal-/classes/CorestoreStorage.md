[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / CorestoreStorage

# Class: CorestoreStorage

## Constructors

### new CorestoreStorage()

> **new CorestoreStorage**(`path`, `opts`?): [`CorestoreStorage`](CorestoreStorage.md)

#### Parameters

• **path**: `string`

• **opts?**: [`CorestoreStorageOptions`](../interfaces/CorestoreStorageOptions.md)

#### Returns

[`CorestoreStorage`](CorestoreStorage.md)

### new CorestoreStorage()

> **new CorestoreStorage**(`db`, `opts`?): [`CorestoreStorage`](CorestoreStorage.md)

#### Parameters

• **db**: `any`

• **opts?**: [`CorestoreStorageOptions`](../interfaces/CorestoreStorageOptions.md)

#### Returns

[`CorestoreStorage`](CorestoreStorage.md)

## Properties

### allowBackup

> `readonly` **allowBackup**: `boolean`

***

### alwaysRecover

> `readonly` **alwaysRecover**: `boolean`

***

### bootstrap

> `readonly` **bootstrap**: `boolean`

***

### deviceFile

> `readonly` **deviceFile**: `any`

***

### id

> `readonly` **id**: `null` \| `string`

***

### migrating

> `readonly` **migrating**: `any`

***

### path

> `readonly` **path**: `string`

***

### readOnly

> `readonly` **readOnly**: `boolean`

***

### version

> `readonly` **version**: `number`

***

### wait

> `readonly` **wait**: `boolean`

## Accessors

### closed

> `get` **closed**(): `boolean`

#### Returns

`boolean`

***

### opened

> `get` **opened**(): `boolean`

#### Returns

`boolean`

## Methods

### audit()

> **audit**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### clear()

> **clear**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### compact()

> **compact**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### createAliasStream()

> **createAliasStream**(`namespace`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **namespace**: `Buffer`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createBitfieldStream()

> **createBitfieldStream**(`ptr`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **ptr**: [`CorePointer`](../interfaces/CorePointer.md)

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createBlockStream()

> **createBlockStream**(`ptr`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **ptr**: [`CorePointer`](../interfaces/CorePointer.md)

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createCoreStream()

> **createCoreStream**(): `Readable`\<[`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), [`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), [`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), `true`, `false`, `ReadableEvents`\<[`CoreStreamEntry`](../interfaces/CoreStreamEntry.md)\>\>

#### Returns

`Readable`\<[`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), [`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), [`CoreStreamEntry`](../interfaces/CoreStreamEntry.md), `true`, `false`, `ReadableEvents`\<[`CoreStreamEntry`](../interfaces/CoreStreamEntry.md)\>\>

***

### createDiscoveryKeyStream()

> **createDiscoveryKeyStream**(`namespace`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **namespace**: `Buffer`

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createLocalStream()

> **createLocalStream**(): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createTreeNodeStream()

> **createTreeNodeStream**(`ptr`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **ptr**: [`CorePointer`](../interfaces/CorePointer.md)

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### createUserDataStream()

> **createUserDataStream**(`ptr`): `Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

#### Parameters

• **ptr**: [`CorePointer`](../interfaces/CorePointer.md)

#### Returns

`Readable`\<`any`, `any`, `any`, `true`, `false`, `ReadableEvents`\<`any`\>\>

***

### deleteCore()

> **deleteCore**(`ptr`): `Promise`\<`void`\>

#### Parameters

• **ptr**: [`CorePointer`](../interfaces/CorePointer.md)

#### Returns

`Promise`\<`void`\>

***

### ready()

> **ready**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

***

### resumeCore()

> **resumeCore**(`discoveryKey`): `Promise`\<`CoreStorage`\>

#### Parameters

• **discoveryKey**: `Buffer`

#### Returns

`Promise`\<`CoreStorage`\>

***

### from()

> `static` **from**(`db`): [`CorestoreStorage`](CorestoreStorage.md)

#### Parameters

• **db**: `any`

#### Returns

[`CorestoreStorage`](CorestoreStorage.md)

***

### isCoreStorage()

> `static` **isCoreStorage**(`db`): `boolean`

#### Parameters

• **db**: `any`

#### Returns

`boolean`
