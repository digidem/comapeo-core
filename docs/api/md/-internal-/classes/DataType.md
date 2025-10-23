[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / DataType

# Class: DataType\<TDataStore, TTable, TSchemaName, TDoc, TValue\>

## Extends

- `TypedEmitter`

## Type Parameters

• **TDataStore**

• **TTable**

• **TSchemaName**

• **TDoc**

• **TValue**

## Constructors

### new DataType()

> **new DataType**\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>(`opts`): [`DataType`](DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Parameters

• **opts**

• **opts.dataStore**: `TDataStore`

• **opts.db**: `BetterSQLite3Database`\<`Record`\<`string`, `never`\>, `any`\>

• **opts.getDeviceIdForVersionId**

• **opts.getTranslations**: `undefined` \| (`value`) => `Promise`\<`object`[]\>

• **opts.table**: `TTable`

#### Returns

[`DataType`](DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Overrides

`TypedEmitter.constructor`

## Accessors

### \[kDataStore\]

> `get` **\[kDataStore\]**(): `TDataStore`

#### Returns

`TDataStore`

***

### \[kTable\]

> `get` **\[kTable\]**(): `TTable`

#### Returns

`TTable`

***

### namespace

> `get` **namespace**(): `TDataStore`\[`"namespace"`\]

#### Returns

`TDataStore`\[`"namespace"`\]

***

### schemaName

> `get` **schemaName**(): `TSchemaName`

#### Returns

`TSchemaName`

## Methods

### \[kCreateWithDocId\]()

> **\[kCreateWithDocId\]**(`docId`, `value`, `opts`?): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Parameters

• **docId**: `string`

• **value**: `Exclude`\<`TValue`, `object`\> \| [`CoreOwnershipWithSignaturesValue`](../type-aliases/CoreOwnershipWithSignaturesValue.md)

• **opts?** = `{}`

only used internally to skip the checkExisting check when creating a document with a random ID (collisions should be too small probability to be worth checking for)

• **opts.checkExisting?**: `boolean` = `true`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

***

### \[kSelect\]()

> **\[kSelect\]**(): `Promise`\<`Omit`\<`SQLiteSelectBase`\<`GetSelectTableName`\<`TTable`\>, `"sync"`, `RunResult`, `GetSelectTableSelection`\<`TTable`\>, `"single"`, `GetSelectTableName`\<`TTable`\> *extends* `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, `"not-null"`\> : `object`, `false`, `never`, \{ \[K in string \| number \| symbol\]: \{ \[Key in string \| number \| symbol\]: SelectResultField\<GetSelectTableSelection\<(...)\>\[Key\], true\> \}\[K\] \}[], `BuildSubquerySelection`\<`GetSelectTableSelection`\<`TTable`\>, `GetSelectTableName`\<`TTable`\> *extends* `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, `"not-null"`\> : `object`\>\>, `"then"` \| `"catch"` \| `"finally"`\> & `object`\>

#### Returns

`Promise`\<`Omit`\<`SQLiteSelectBase`\<`GetSelectTableName`\<`TTable`\>, `"sync"`, `RunResult`, `GetSelectTableSelection`\<`TTable`\>, `"single"`, `GetSelectTableName`\<`TTable`\> *extends* `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, `"not-null"`\> : `object`, `false`, `never`, \{ \[K in string \| number \| symbol\]: \{ \[Key in string \| number \| symbol\]: SelectResultField\<GetSelectTableSelection\<(...)\>\[Key\], true\> \}\[K\] \}[], `BuildSubquerySelection`\<`GetSelectTableSelection`\<`TTable`\>, `GetSelectTableName`\<`TTable`\> *extends* `string` ? `Record`\<`string` & `GetSelectTableName`\<`TTable`\>, `"not-null"`\> : `object`\>\>, `"then"` \| `"catch"` \| `"finally"`\> & `object`\>

***

### create()

> **create**\<`T`\>(`value`): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Type Parameters

• **T** *extends* `unknown`

#### Parameters

• **value**: `T`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

***

### delete()

> **delete**(`docId`): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Parameters

• **docId**: `string`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

***

### getByDocId()

> **getByDocId**(`docId`, `options`?): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Parameters

• **docId**: `string`

• **options?**

• **options.lang?**: `undefined` \| `string`

• **options.mustBeFound?**: `undefined` \| `true`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

***

### getByVersionId()

> **getByVersionId**(`versionId`, `opts`?): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Parameters

• **versionId**: `string`

• **opts?** = `{}`

• **opts.lang?**: `string`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

***

### getMany()

> **getMany**(`opts`): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)[]\>

#### Parameters

• **opts** = `{}`

• **opts.includeDeleted**: `undefined` \| `boolean` = `false`

• **opts.lang**: `undefined` \| `string`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)[]\>

***

### update()

> **update**\<`T`\>(`versionId`, `value`): `Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>

#### Type Parameters

• **T** *extends* `unknown`

#### Parameters

• **versionId**: `string` \| `string`[]

• **value**: `T`

#### Returns

`Promise`\<`TDoc` & [`DerivedDocFields`](../interfaces/DerivedDocFields.md)\>
