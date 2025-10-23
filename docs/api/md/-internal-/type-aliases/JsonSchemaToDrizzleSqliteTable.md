[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / JsonSchemaToDrizzleSqliteTable

# Type Alias: JsonSchemaToDrizzleSqliteTable\<TObjectType, TSchema, TTableName, TColumnsMap, TPrimaryKey\>

> **JsonSchemaToDrizzleSqliteTable**\<`TObjectType`, `TSchema`, `TTableName`, `TColumnsMap`, `TPrimaryKey`\>: `SQLiteTableWithColumns`\<`object`\>

Create a Drizzle SQLite table definition from a JSONSchema object. All
top-level properties map to SQLite columns, with `required` properties marked
as `NOT NULL`, and JSONSchema `default` will map to SQLite defaults.

Any properties that are of type `object` or `array` in the JSONSchema will be
mapped to a text field, which drizzle will parse and stringify. Types for
`object` and `array` properties will be derived from `TObjectType`.

## Type declaration

### columns

> **columns**: `BuildColumns`\<`TTableName`, [`JsonSchemaToDrizzleColumns`](JsonSchemaToDrizzleColumns.md)\<`TObjectType`, `TSchema`, `TPrimaryKey`\> & `TColumnsMap`, `"sqlite"`\>

### dialect

> **dialect**: `"sqlite"`

### name

> **name**: `TTableName`

### schema

> **schema**: `undefined`

## Type Parameters

• **TObjectType** *extends* `{ [K in keyof TSchema["properties"]]?: any }`

• **TSchema** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **TTableName** *extends* `string`

• **TColumnsMap** *extends* `Record`\<`string`, `ColumnBuilderBase`\> = `object`

• **TPrimaryKey** *extends* keyof `TSchema`\[`"properties"`\] \| `undefined` = `undefined`
