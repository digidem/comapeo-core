[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / IndexWriter

# Class: IndexWriter\<TTables\>

## Type Parameters

• **TTables** = [`MapeoDocTables`](../type-aliases/MapeoDocTables.md)

## Constructors

### new IndexWriter()

> **new IndexWriter**\<`TTables`\>(`opts`): [`IndexWriter`](IndexWriter.md)\<`TTables`\>

#### Parameters

• **opts**

• **opts.getWinner**: `undefined` \| \<`T`, `U`\>(`docA`, `docB`) => `T` \| `U`

custom function to determine the "winner" of two forked documents. Defaults to choosing the document with the most recent `updatedAt`

• **opts.logger**: `undefined` \| [`Logger`](Logger.md)

• **opts.mapDoc**: `undefined` \| (`doc`, `version`) => `MapeoDoc` = `...`

optionally transform a document prior to indexing. Can also validate, if an error is thrown then the document will not be indexed

• **opts.sqlite**: `Database`

• **opts.tables**: `TTables`[]

#### Returns

[`IndexWriter`](IndexWriter.md)\<`TTables`\>

## Accessors

### schemas

> `get` **schemas**(): `Iterable`\<[`SchemaName`](../type-aliases/SchemaName.md), `any`, `any`\>

#### Returns

`Iterable`\<[`SchemaName`](../type-aliases/SchemaName.md), `any`, `any`\>

## Methods

### batch()

> **batch**(`entries`): `Promise`\<[`IndexedDocIds`](../type-aliases/IndexedDocIds.md)\>

#### Parameters

• **entries**: `Entry`\<`"binary"`\>[]

#### Returns

`Promise`\<[`IndexedDocIds`](../type-aliases/IndexedDocIds.md)\>

map of indexed docIds by schemaName

***

### deleteSchema()

> **deleteSchema**(`schemaName`): `void`

#### Parameters

• **schemaName**: [`SchemaName`](../type-aliases/SchemaName.md)

#### Returns

`void`
