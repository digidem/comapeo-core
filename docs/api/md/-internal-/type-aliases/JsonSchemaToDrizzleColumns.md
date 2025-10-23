[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / JsonSchemaToDrizzleColumns

# Type Alias: JsonSchemaToDrizzleColumns\<TObjectType, TSchema, TPrimaryKey\>

> **JsonSchemaToDrizzleColumns**\<`TObjectType`, `TSchema`, `TPrimaryKey`\>: [`AddJSONSchemaDefaults`](AddJSONSchemaDefaults.md)\<`TSchema`, [`AddJSONSchemaRequired`](AddJSONSchemaRequired.md)\<`TSchema`, [`SchemaToDrizzleColumnsBase`](SchemaToDrizzleColumnsBase.md)\<`TSchema`, `TObjectType`\>\>\>

Convert a JSONSchema Object Schema to a Drizzle Columns map (e.g. parameter
for `sqliteTable()`). All top-level properties map to SQLite columns, with
`required` properties marked as `NOT NULL`, and JSONSchema `default` will map
to SQLite defaults.

Any properties that are of type `object` or `array` in the JSONSchema will be
mapped to a text field, which drizzle will parse and stringify. Types for
`object` and `array` properties will be derived from `TObjectType`.

## Type Parameters

• **TObjectType** *extends* `{ [K in keyof TSchema["properties"]]?: any }`

• **TSchema** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **TPrimaryKey** *extends* keyof `TSchema`\[`"properties"`\] \| `undefined` = `undefined`
