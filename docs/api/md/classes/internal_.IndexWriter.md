[API](../README.md) / [\<internal\>](../modules/internal_.md) / IndexWriter

# Class: IndexWriter\<TTables\>

[\<internal\>](../modules/internal_.md).IndexWriter

## Type parameters

| Name | Type |
| :------ | :------ |
| `TTables` | [`MapeoDocTables`](../modules/internal_.md#mapeodoctables) |

## Table of contents

### Constructors

- [constructor](internal_.IndexWriter.md#constructor)

### Accessors

- [schemas](internal_.IndexWriter.md#schemas)

### Methods

- [batch](internal_.IndexWriter.md#batch)

## Constructors

### constructor

• **new IndexWriter**\<`TTables`\>(`opts`): [`IndexWriter`](internal_.IndexWriter.md)\<`TTables`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TTables` | extends [`MapeoDocTables`](../modules/internal_.md#mapeodoctables-1) = [`MapeoDocTables`](../modules/internal_.md#mapeodoctables-1) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.getWinner` | `undefined` \| \<T, U\>(`docA`: `T`, `docB`: `U`) => `T` \| `U` | custom function to determine the "winner" of two forked documents. Defaults to choosing the document with the most recent `updatedAt` |
| `opts.logger` | `undefined` \| [`Logger`](internal_.Logger.md) |  |
| `opts.mapDoc` | `undefined` \| (`doc`: `MapeoDocInternal`, `version`: `VersionIdObject`) => `MapeoDoc` | optionally transform a document prior to indexing. Can also validate, if an error is thrown then the document will not be indexed |
| `opts.sqlite` | `Database` |  |
| `opts.tables` | `TTables`[] |  |

#### Returns

[`IndexWriter`](internal_.IndexWriter.md)\<`TTables`\>

## Accessors

### schemas

• `get` **schemas**(): `TTables`[``"_"``][``"name"``][]

#### Returns

`TTables`[``"_"``][``"name"``][]

## Methods

### batch

▸ **batch**(`entries`): `Promise`\<[`IndexedDocIds`](../modules/internal_.md#indexeddocids)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `entries` | `Entry`\<``"binary"``\>[] |

#### Returns

`Promise`\<[`IndexedDocIds`](../modules/internal_.md#indexeddocids)\>

map of indexed docIds by schemaName
