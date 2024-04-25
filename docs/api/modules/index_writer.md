[API](../README.md) / index-writer

# Module: index-writer

## Table of contents

### Classes

- [IndexWriter](../classes/index_writer.IndexWriter.md)

### Type Aliases

- [IndexedDocIds](index_writer.md#indexeddocids)
- [MapeoDocInternal](index_writer.md#mapeodocinternal)
- [MapeoDocTables](index_writer.md#mapeodoctables)

## Type Aliases

### IndexedDocIds

Ƭ **IndexedDocIds**\<\>: \{ [K in MapeoDoc["schemaName"]]?: string[] }

#### Defined in

[src/index-writer/index.js:15](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/index-writer/index.js#L15)

___

### MapeoDocInternal

Ƭ **MapeoDocInternal**\<\>: `ReturnType`\<`decode`\>

#### Defined in

[src/index-writer/index.js:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/index-writer/index.js#L18)

___

### MapeoDocTables

Ƭ **MapeoDocTables**: [`GetMapeoDocTables`](datatype-1.md#getmapeodoctables)\<[`schema/project`](schema_project.md)\> \| [`GetMapeoDocTables`](datatype-1.md#getmapeodoctables)\<[`schema/client`](schema_client.md)\>

Union of Drizzle schema tables that correspond to MapeoDoc types (e.g. excluding backlink tables and other utility tables)

#### Defined in

[src/datatype/index.d.ts:20](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/datatype/index.d.ts#L20)
