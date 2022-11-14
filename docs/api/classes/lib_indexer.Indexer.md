[API](../README.md) / [lib/indexer](../modules/lib_indexer.md) / Indexer

# Class: Indexer

[lib/indexer](../modules/lib_indexer.md).Indexer

Internal indexer for Mapeo Core

## Table of contents

### Constructors

- [constructor](lib_indexer.Indexer.md#constructor)

### Properties

- [extraColumns](lib_indexer.Indexer.md#extracolumns)
- [name](lib_indexer.Indexer.md#name)
- [sqliteIndexer](lib_indexer.Indexer.md#sqliteindexer)

### Methods

- [batch](lib_indexer.Indexer.md#batch)
- [onceWriteDoc](lib_indexer.Indexer.md#oncewritedoc)
- [query](lib_indexer.Indexer.md#query)

## Constructors

### constructor

• **new Indexer**(`options`)

Create an indexer for a DataType

#### Parameters

| Name                   | Type                                   | Description                                                                                 |
| :--------------------- | :------------------------------------- | :------------------------------------------------------------------------------------------ |
| `options`              | `Object`                               |                                                                                             |
| `options.dataType`     | [`DataType`](lib_datatype.DataType.md) | an instance of DataType that is being indexed                                               |
| `options.extraColumns` | `string`                               | any additional column definitions needed for this table, passed to `CREATE TABLE` statement |
| `options.sqlite`       | `Database`                             | instance of [better-sqlite3 client](https://npmjs.com/better-sqlite3)                       |

#### Defined in

[lib/indexer/index.js:16](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L16)

## Properties

### extraColumns

• **extraColumns**: `string`

#### Defined in

[lib/indexer/index.js:21](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L21)

---

### name

• **name**: `string`

#### Defined in

[lib/indexer/index.js:19](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L19)

---

### sqliteIndexer

• **sqliteIndexer**: `any`

#### Defined in

[lib/indexer/index.js:47](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L47)

## Methods

### batch

▸ **batch**(`docs`): `void`

Index a batch of documents

#### Parameters

| Name   | Type       | Description      |
| :----- | :--------- | :--------------- |
| `docs` | `Object`[] | an array of docs |

#### Returns

`void`

#### Defined in

[lib/indexer/index.js:78](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L78)

---

### onceWriteDoc

▸ **onceWriteDoc**(`version`, `listener`): `void`

Set a listener on a version of a doc that is called when it is finished indexing

#### Parameters

| Name       | Type            |
| :--------- | :-------------- |
| `version`  | `string`        |
| `listener` | `IndexCallback` |

#### Returns

`void`

#### Defined in

[lib/indexer/index.js:69](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L69)

---

### query

▸ **query**(`where?`): `Object`[]

Select documents from the sqlite database

#### Parameters

| Name     | Type     | Description                                           |
| :------- | :------- | :---------------------------------------------------- |
| `where?` | `string` | specify the docs to retrieve using a `WHERE` fragment |

#### Returns

`Object`[]

an array of docs

#### Defined in

[lib/indexer/index.js:99](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/indexer/index.js#L99)
