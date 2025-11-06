[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / AddJSONSchemaRequired

# Type Alias: AddJSONSchemaRequired\<TJSONSchema, TColumns\>

> **AddJSONSchemaRequired**\<`TJSONSchema`, `TColumns`\>: `{ [K in keyof TColumns]: K extends string ? IsJSONSchemaRequired<TJSONSchema, K> extends true ? NotNull<TColumns[K]> : TColumns[K] : TColumns[K] }`

Mark columns as NotNull if they are required in the JSONSchema

## Type Parameters

• **TJSONSchema** *extends* [`JSONSchema7Object`](JSONSchema7Object.md)

• **TColumns** *extends* `Record`\<`string`, `ColumnBuilderBase`\>
