[API](../README.md) / [index-writer](../modules/index_writer.md) / IndexWriter

# Class: IndexWriter\<TTables\>

[index-writer](../modules/index_writer.md).IndexWriter

## Type parameters

| Name | Type |
| :------ | :------ |
| `TTables` | [`MapeoDocTables`](../modules/index_writer.md#mapeodoctables) |

## Table of contents

### Constructors

- [constructor](index_writer.IndexWriter.md#constructor)

### Accessors

- [schemas](index_writer.IndexWriter.md#schemas)

### Methods

- [batch](index_writer.IndexWriter.md#batch)

## Constructors

### constructor

• **new IndexWriter**\<`TTables`\>(`opts`): [`IndexWriter`](index_writer.IndexWriter.md)\<`TTables`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `TTables` | extends [`MapeoDocTables`](../modules/index_writer.md#mapeodoctables) = [`MapeoDocTables`](../modules/index_writer.md#mapeodoctables) |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `opts` | `Object` |  |
| `opts.getWinner` | `undefined` \| \<T, U\>(`docA`: `T`, `docB`: `U`) => `T` \| `U` | custom function to determine the "winner" of two forked documents. Defaults to choosing the document with the most recent `updatedAt` |
| `opts.logger` | `undefined` \| [`Logger`](logger.Logger.md) |  |
| `opts.mapDoc` | `undefined` \| (`doc`: `MapeoDocInternal`, `version`: `VersionIdObject`) => `MapeoDoc` | optionally transform a document prior to indexing. Can also validate, if an error is thrown then the document will not be indexed |
| `opts.sqlite` | `Database` |  |
| `opts.tables` | `TTables`[] |  |

#### Returns

[`IndexWriter`](index_writer.IndexWriter.md)\<`TTables`\>

#### Defined in

[src/index-writer/index.js:38](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/index-writer/index.js#L38)

## Accessors

### schemas

• `get` **schemas**(): `TTables`[``"_"``][``"name"``][]

#### Returns

`TTables`[``"_"``][``"name"``][]

#### Defined in

[src/index-writer/index.js:55](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/index-writer/index.js#L55)

## Methods

### batch

▸ **batch**(`entries`): `Promise`\<[`IndexedDocIds`](../modules/index_writer.md#indexeddocids)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `entries` | `Entry`\<``"binary"``\>[] |

#### Returns

`Promise`\<[`IndexedDocIds`](../modules/index_writer.md#indexeddocids)\>

map of indexed docIds by schemaName

#### Defined in

[src/index-writer/index.js:63](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/index-writer/index.js#L63)
