[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / DataType

# Class: DataType\<TDataStore, TTable, TSchemaName, TDoc, TValue\>

## Extends

- `TypedEmitter`\<[`DataTypeEvents`](../interfaces/DataTypeEvents.md)\<`TDoc`\>\>

## Type Parameters

• **TDataStore** *extends* [`"/home/runner/work/comapeo-core/comapeo-core/src/datastore/index"`](../namespaces/home_runner_work_comapeo-core_comapeo-core_src_datastore_index/README.md)

• **TTable** *extends* [`MapeoDocTables`](../type-aliases/MapeoDocTables.md)

• **TSchemaName** *extends* `TTable`\[`"_"`\]\[`"name"`\]

• **TDoc** *extends* [`MapeoDocMap`](../type-aliases/MapeoDocMap.md)\[`TSchemaName`\]

• **TValue** *extends* [`MapeoValueMap`](../type-aliases/MapeoValueMap.md)\[`TSchemaName`\]

## Constructors

### new DataType()

> **new DataType**\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>(`__namedParameters`): [`DataType`](DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Parameters

• **\_\_namedParameters**

• **\_\_namedParameters.dataStore**: `TDataStore`

• **\_\_namedParameters.db**: `BetterSQLite3Database`\<`Record`\<`string`, `never`\>\>

• **\_\_namedParameters.getTranslations**

• **\_\_namedParameters.table**: `TTable`

#### Returns

[`DataType`](DataType.md)\<`TDataStore`, `TTable`, `TSchemaName`, `TDoc`, `TValue`\>

#### Overrides

`TypedEmitter<DataTypeEvents<TDoc>>.constructor`

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

> `get` **namespace**(): `namespace`

#### Returns

`namespace`

***

### schemaName

> `get` **schemaName**(): `TSchemaName`

#### Returns

`TSchemaName`

## Methods

### \[kCreateWithDocId\]()

> **\[kCreateWithDocId\]**(`docId`, `value`): `Promise`\<`TDoc` & `object`\>

#### Parameters

• **docId**: `string`

• **value**: `Exclude`\<`TValue`, `object`\> \| [`CoreOwnershipWithSignaturesValue`](../type-aliases/CoreOwnershipWithSignaturesValue.md)

#### Returns

`Promise`\<`TDoc` & `object`\>

***

### \[kSelect\]()

> **\[kSelect\]**(): `Promise`\<`any`\>

#### Returns

`Promise`\<`any`\>

***

### create()

> **create**\<`T`\>(`value`): `Promise`\<`TDoc` & `object`\>

#### Type Parameters

• **T** *extends* `unknown`

#### Parameters

• **value**: `T`

#### Returns

`Promise`\<`TDoc` & `object`\>

***

### delete()

> **delete**(`docId`): `Promise`\<`TDoc` & `object`\>

#### Parameters

• **docId**: `string`

#### Returns

`Promise`\<`TDoc` & `object`\>

***

### getByDocId()

> **getByDocId**(`docId`, `opts`?): `Promise`\<`TDoc` & `object`\>

#### Parameters

• **docId**: `string`

• **opts?**

• **opts.lang?**: `string`

#### Returns

`Promise`\<`TDoc` & `object`\>

***

### getByVersionId()

> **getByVersionId**(`versionId`, `opts`?): `Promise`\<`TDoc`\>

#### Parameters

• **versionId**: `string`

• **opts?**

• **opts.lang?**: `string`

#### Returns

`Promise`\<`TDoc`\>

***

### getMany()

> **getMany**(`opts`?): `Promise`\<`TDoc` & `object`[]\>

#### Parameters

• **opts?**

• **opts.includeDeleted?**: `boolean`

• **opts.lang?**: `string`

#### Returns

`Promise`\<`TDoc` & `object`[]\>

***

### update()

> **update**\<`T`\>(`versionId`, `value`): `Promise`\<`TDoc` & `object`\>

#### Type Parameters

• **T** *extends* `unknown`

#### Parameters

• **versionId**: `string` \| `string`[]

• **value**: `T`

#### Returns

`Promise`\<`TDoc` & `object`\>
